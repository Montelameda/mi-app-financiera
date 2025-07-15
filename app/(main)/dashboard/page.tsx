'use client';

// --- IMPORTS ---
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query, orderBy, doc, writeBatch } from 'firebase/firestore';

// --- CONTEXT & COMPONENTS ---
import { useSettings } from '@/context/SettingsContext';
import AddExpenseModal from '@/components/AddExpenseModal';
import AddIncomeModal from '@/components/AddIncomeModal';
import AddTransferModal from '@/components/AddTransferModal';

// --- CONSTANTS ---
const montserrat = Montserrat({ subsets: ['latin'] });

// --- INTERFACES ---
interface Cuenta {
    id: string;
    name: string;
    balance: number;
    emoji: string;
    imageUrl?: string;
    type: string;
}

interface Categoria {
    id: string;
    name: string;
    emoji: string;
}

interface Presupuesto {
    id: string;
    categoryName: string;
    categoryEmoji: string;
    limit: number;
}

interface Transaccion {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    timestamp: any;
    accountId: string;
    description?: string;
    receiptUrl?: string;
}

interface Gasto {
    id?: string;
    amount: number;
    category: string;
    accountId: string;
    description?: string,
    timestamp: any;
    receiptUrl?: string;
}

interface Ingreso {
    id?: string;
    amount: number;
    category: string;
    accountId: string;
    description?: string,
    timestamp: any;
    receiptUrl?: string;
}

interface Transferencia {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    description: string;
    date: Date;
}


// --- ICON COMPONENTS ---
const PlusIconFab = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

const ExpenseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h15a3 3 0 013 3v15a3 3 0 01-3 3h-15a3 3 0 01-3-3V4.5zM3 16.5v-3.812a3.001 3.001 0 01.879-2.121l1.027-1.028a.75.75 0 011.06 0l.25.25a.75.75 0 11-1.06 1.06l-.25-.25-1.028 1.028A1.5 1.5 0 003 12.688v3.812zM21 9.312a3.001 3.001 0 00-2.121-.879l-1.028-1.027a.75.75 0 00-1.06 0l-.25.25a.75.75 0 001.06 1.06l.25-.25 1.028 1.028A1.5 1.5 0 0121 12.688v-3.376zM21 16.5h-3.375a1.5 1.5 0 01-1.06-.44l-1.028-1.027a.75.75 0 00-1.06 0l-.25.25a.75.75 0 101.06 1.06l.25-.25 1.028 1.028a1.5 1.5 0 01.44 1.06H21z" clipRule="evenodd" />
    </svg>
);

const IncomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10.464 4.032a1.5 1.5 0 01.012 1.988l-2.43 3.038h5.398a1.5 1.5 0 011.303.75l2.431 3.89a1.5 1.5 0 01-.986 2.296H6.398a1.5 1.5 0 01-1.303-.75L2.665 11.3a1.5 1.5 0 01.986-2.296h3.423l2.443-3.054a1.5 1.5 0 01.947-.618z" />
        <path fillRule="evenodd" d="M12.75 18a1.5 1.5 0 011.5-1.5h6a1.5 1.5 0 011.5 1.5v2.25a1.5 1.5 0 01-1.5 1.5h-6a1.5 1.5 0 01-1.5-1.5V18zM14.25 18V20.25h4.5V18h-4.5z" clipRule="evenodd" />
    </svg>
);

const TransferIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22H1.5a.75.75 0 010-1.5h17.69l-3.22-3.22a.75.75 0 010-1.06zM8.03 13.53a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V4.5a.75.75 0 011.5 0v12.69l3.22-3.22a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
);


// --- MAIN COMPONENT ---
export default function DashboardPage() {
    // --- STATE & CONTEXT ---
    const { currency, showDecimals, t } = useSettings();
    const [accounts, setAccounts] = useState<Cuenta[]>([]);
    const [transactions, setTransactions] = useState<Transaccion[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Categoria[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Categoria[]>([]);
    const [budgets, setBudgets] = useState<Presupuesto[]>([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const nombreUsuario = "Wilmer";

    // --- DERIVED STATE & HELPERS ---
    const totalBalance = accounts.reduce((sum, account) =>
        account.type !== 'Tarjeta de Crédito' ? sum + account.balance : sum, 0
    );

    const formatCurrency = (amount: number) => {
        const options: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'code'
        };
        if (showDecimals) {
            options.minimumFractionDigits = 2;
        } else {
            options.minimumFractionDigits = 0;
        }
        options.maximumFractionDigits = showDecimals ? 2 : 0;
        return new Intl.NumberFormat('es-CL', options).format(amount);
    };

    // --- DATA FETCHING ---
    const fetchData = async () => {
        const toDate = (timestamp: any): Date => timestamp ? timestamp.toDate() : new Date();

        const accountsQuery = query(collection(db, 'accounts'), orderBy('position'));
        const expenseQuery = query(collection(db, 'expense'), orderBy('timestamp', 'desc'));
        const incomeQuery = query(collection(db, 'income'), orderBy('timestamp', 'desc'));
        const budgetsQuery = query(collection(db, 'budgets'));
        const expenseCatQuery = collection(db, 'categories');
        const incomeCatQuery = collection(db, 'incomeCategories');

        const [accountsSnapshot, expensesSnapshot, incomesSnapshot, budgetsSnapshot, expenseCatSnapshot, incomeCatSnapshot] = await Promise.all([
            getDocs(accountsQuery),
            getDocs(expenseQuery),
            getDocs(incomeQuery),
            getDocs(budgetsQuery),
            getDocs(expenseCatQuery),
            getDocs(incomeCatQuery)
        ]);

        setAccounts(accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cuenta)));
        setBudgets(budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presupuesto)));
        setExpenseCategories(expenseCatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria)));
        setIncomeCategories(incomeCatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria)));

        const expensesList = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense', timestamp: toDate(doc.data().timestamp) } as Transaccion));
        const incomesList = incomesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'income', timestamp: toDate(doc.data().timestamp) } as Transaccion));

        setTransactions([...expensesList, ...incomesList].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- EVENT HANDLERS ---
    const handleSaveExpense = async (expenseData: Gasto) => {
        const batch = writeBatch(db);
        const accountRef = doc(db, 'accounts', expenseData.accountId);
        const account = accounts.find(acc => acc.id === expenseData.accountId);

        if (account) {
            batch.update(accountRef, { balance: account.balance - expenseData.amount });
        }
        const { id, ...dataToSave } = expenseData;
        batch.set(doc(collection(db, 'expense')), dataToSave);

        await batch.commit();
        fetchData(); // Refresh data
    };

    const handleSaveIncome = async (incomeData: Ingreso) => {
        const batch = writeBatch(db);
        const accountRef = doc(db, 'accounts', incomeData.accountId);
        const account = accounts.find(acc => acc.id === incomeData.accountId);

        if (account) {
            batch.update(accountRef, { balance: account.balance + incomeData.amount });
        }
        const { id, ...dataToSave } = incomeData;
        batch.set(doc(collection(db, 'income')), dataToSave);

        await batch.commit();
        fetchData(); // Refresh data
    };

    const handleSaveTransfer = async (transferData: Transferencia) => {
        const batch = writeBatch(db);
        const { amount, fromAccountId, toAccountId, description, date } = transferData;

        // 1. Update origin account
        const fromAccountRef = doc(db, 'accounts', fromAccountId);
        const fromAccount = accounts.find(acc => acc.id === fromAccountId);
        if (fromAccount) {
            batch.update(fromAccountRef, { balance: fromAccount.balance - amount });
        }

        // 2. Update destination account
        const toAccountRef = doc(db, 'accounts', toAccountId);
        const toAccount = accounts.find(acc => acc.id === toAccountId);
        if (toAccount) {
            batch.update(toAccountRef, { balance: toAccount.balance + amount });
        }

        // 3. Create expense record for the transfer
        const expenseRecord = { amount, accountId: fromAccountId, category: '🔁 Transferencia', description, timestamp: date, receiptUrl: '' };
        batch.set(doc(collection(db, 'expense')), expenseRecord);

        // 4. Create income record for the transfer
        const incomeRecord = { amount, accountId: toAccountId, category: '🔁 Transferencia', description, timestamp: date, receiptUrl: '' };
        batch.set(doc(collection(db, 'income')), incomeRecord);

        await batch.commit();
        fetchData(); // Refresh data
    };


    // --- JSX ---
    return (
        <div className={`${montserrat.className} text-white`}>
            {/* Header */}
            <h1 className="text-3xl font-bold">Hola, {nombreUsuario} 🔥</h1>
            <p className="text-gray-400">Bienvenido a tu centro de control financiero.</p>

            {/* Total Balance Card */}
            <div className="mt-8 bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-2xl text-center">
                <p className="text-lg font-semibold text-white/80">Saldo Total</p>
                <p className="text-5xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
            </div>

            {/* Main Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column */}
                <div className="space-y-8">
                    {/* Accounts Summary */}
                    <div className="bg-gray-800/50 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Resumen de Cuentas</h2>
                            <Link href="/accounts" className="text-sm text-blue-400 hover:underline">Gestionar</Link>
                        </div>
                        <div className="space-y-3">
                            {accounts.slice(0, 4).map(account => (
                                <div key={account.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        {account.imageUrl ? (
                                            <Image src={account.imageUrl} alt={account.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-lg">{account.emoji || '🏦'}</span>
                                        )}
                                        <span className="text-gray-300">{account.name}</span>
                                    </div>
                                    <span className="font-medium">{formatCurrency(account.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Budgets Summary */}
                    <div className="bg-gray-800/50 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Presupuestos</h2>
                            <Link href="/budgets" className="text-sm text-blue-400 hover:underline">Gestionar</Link>
                        </div>
                        <div className="space-y-4">
                            {budgets.slice(0, 3).map((budget) => {
                                const spent = transactions
                                    .filter(t => t.type === 'expense' && `${budget.categoryEmoji} ${budget.categoryName}` === t.category)
                                    .reduce((acc, t) => acc + t.amount, 0);
                                const perc = budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0;
                                const barColor = perc >= 100 ? 'bg-red-500' : perc >= 75 ? 'bg-orange-500' : 'bg-green-500';
                                
                                return (
                                    <div key={budget.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{budget.categoryEmoji} {budget.categoryName}</span>
                                            <span>{formatCurrency(spent)}</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                                            <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${perc}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Activity */}
                <div className="bg-gray-800/50 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Actividad Reciente</h2>
                        <Link href="/transactions" className="text-sm text-blue-400 hover:underline">Gestionar</Link>
                    </div>
                    <div className="space-y-3">
                        {transactions.slice(0, 5).map((t) => {
                            const isExpense = t.type === 'expense';
                            const [emoji, ...nameParts] = t.category.split(' ');
                            const name = nameParts.join(' ');
                            
                            return (
                                <div key={t.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{emoji || '💸'}</span>
                                        <div className="flex flex-col">
                                            <p className="font-semibold">{name}</p>
                                            {t.description && <p className="text-xs text-gray-400 italic">"{t.description}"</p>}
                                        </div>
                                    </div>
                                    <p className={`font-bold ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
                                        {isExpense ? '-' : '+'} {formatCurrency(t.amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 flex flex-col items-center gap-4 z-50">
                {isFabOpen && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full shadow-lg">Añadir Gasto</span>
                            <button onClick={() => { setIsExpenseModalOpen(true); setIsFabOpen(false); }} className="bg-red-500 p-3 rounded-full shadow-lg hover:bg-red-600">
                                <ExpenseIcon />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full shadow-lg">Transferencia</span>
                            <button onClick={() => { setIsTransferModalOpen(true); setIsFabOpen(false); }} className="bg-blue-500 p-3 rounded-full shadow-lg hover:bg-blue-600">
                                <TransferIcon />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full shadow-lg">Añadir Ingreso</span>
                            <button onClick={() => { setIsIncomeModalOpen(true); setIsFabOpen(false); }} className="bg-green-500 p-3 rounded-full shadow-lg hover:bg-green-600">
                                <IncomeIcon />
                            </button>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-20 h-20 rounded-full shadow-2xl flex items-center justify-center transition-transform transform hover:scale-110"
                >
                    {isFabOpen ? <CloseIcon /> : <PlusIconFab />}
                </button>
            </div>

            {/* Modals */}
            {isExpenseModalOpen && (
                <AddExpenseModal
                    accounts={accounts}
                    categories={expenseCategories}
                    onClose={() => setIsExpenseModalOpen(false)}
                    onSave={handleSaveExpense}
                />
            )}
            {isIncomeModalOpen && (
                <AddIncomeModal
                    accounts={accounts}
                    incomeCategories={incomeCategories}
                    onClose={() => setIsIncomeModalOpen(false)}
                    onSave={handleSaveIncome}
                />
            )}
            {isTransferModalOpen && (
                <AddTransferModal
                    accounts={accounts}
                    onClose={() => setIsTransferModalOpen(false)}
                    onSave={handleSaveTransfer}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
}