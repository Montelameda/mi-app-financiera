'use client';

import { useState, useEffect, useMemo } from 'react';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query, orderBy, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { useSettings } from '@/context/SettingsContext';

import ConfirmationModal from '@/components/ConfirmationModal';
import AddExpenseModal from '@/components/AddExpenseModal';
import AddIncomeModal from '@/components/AddIncomeModal';

const montserrat = Montserrat({ subsets: ['latin'] });

// --- INTERFACES ---
interface Transaction { 
    id: string; 
    amount: number; 
    type: 'income' | 'expense'; 
    category: string; 
    accountId: string; 
    timestamp: any; 
    description?: string;
    receiptUrl?: string; 
}
interface Account { id: string; name: string; balance: number; }
interface Category { id: string; name: string; emoji: string; }

// --- ICONOS ---
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1H8.75zM10 4.5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5A.75.75 0 0110 4.5z" clipRule="evenodd" /></svg>);
const PaperClipIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.364 6.364l-3.182 3.182a.75.75 0 01-1.06-1.061l3.182-3.182a3 3 0 00-4.242-4.242z" clipRule="evenodd" /></svg>);

export default function TransactionsPage() {
    const { currency, showDecimals } = useSettings();
    const [isLoading, setIsLoading] = useState(true);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [filterType, setFilterType] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

    // ✅ FUNCIÓN COMPLETA
    const formatCurrency = (amount: number) => {
        const options: Intl.NumberFormatOptions = { style: 'currency', currency: currency, currencyDisplay: 'code' };
        if (showDecimals) { options.minimumFractionDigits = 2; } else { options.minimumFractionDigits = 0; }
        options.maximumFractionDigits = showDecimals ? 2 : 0;
        return new Intl.NumberFormat('es-CL', options).format(amount);
    };

    // ✅ FUNCIÓN COMPLETA
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const accountsSnapshot = await getDocs(collection(db, 'accounts'));
            setAccounts(accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
            const expCatSnapshot = await getDocs(collection(db, 'categories'));
            setExpenseCategories(expCatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
            const incCatSnapshot = await getDocs(collection(db, 'incomeCategories'));
            setIncomeCategories(incCatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
            const incomesSnapshot = await getDocs(query(collection(db, 'income'), orderBy('timestamp', 'desc')));
            const expensesSnapshot = await getDocs(query(collection(db, 'expense'), orderBy('timestamp', 'desc')));
            const incomes = incomesSnapshot.docs.map(doc => ({ id: doc.id, type: 'income', ...doc.data() } as Transaction));
            const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, type: 'expense', ...doc.data() } as Transaction));
            setAllTransactions([...incomes, ...expenses].sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()));
        } catch (error) { console.error("Error fetching data:", error); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // ✅ FUNCIÓN COMPLETA
    const allCategoriesForFilter = useMemo(() => {
        const categories = [...expenseCategories, ...incomeCategories].map(c => `${c.emoji} ${c.name}`);
        return [...new Set(categories)].sort();
    }, [expenseCategories, incomeCategories]);

    // ✅ FUNCIÓN COMPLETA
    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(tx => {
            const txDate = tx.timestamp.toDate();
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            if (filterType !== 'all' && tx.type !== filterType) return false;
            if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
            if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
            if (filterStartDate && txDate < new Date(filterStartDate)) return false;
            if (filterEndDate && txDate > new Date(new Date(filterEndDate).setHours(23, 59, 59, 999))) return false;
            if (searchTerm && !(tx.category.toLowerCase().includes(lowercasedSearchTerm) || tx.description?.toLowerCase().includes(lowercasedSearchTerm))) return false;
            return true;
        });
    }, [allTransactions, filterType, filterAccount, filterCategory, filterStartDate, filterEndDate, searchTerm]);

    // ✅ FUNCIÓN COMPLETA
    const dynamicTotals = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            if (tx.type === 'income') { acc.totalIncome += tx.amount; }
            else { acc.totalExpense += tx.amount; }
            acc.netBalance = acc.totalIncome - acc.totalExpense;
            return acc;
        }, { totalIncome: 0, totalExpense: 0, netBalance: 0 });
    }, [filteredTransactions]);

    // ✅ FUNCIÓN COMPLETA
    const handleRequestDelete = (tx: Transaction) => { setTxToDelete(tx); setIsConfirmModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!txToDelete) return;
        setIsDeleting(true);
        const batch = writeBatch(db);
        try {
            const accountRef = doc(db, 'accounts', txToDelete.accountId);
            const account = accounts.find(acc => acc.id === txToDelete.accountId);
            if (account) {
                const newBalance = txToDelete.type === 'expense' ? account.balance + txToDelete.amount : account.balance - txToDelete.amount;
                batch.update(accountRef, { balance: newBalance });
            }
            const txCollectionName = txToDelete.type;
            const txRef = doc(db, txCollectionName, txToDelete.id);
            batch.delete(txRef);
            await batch.commit();
            fetchData();
        } catch (error) { console.error("Error al eliminar la transacción:", error); }
        finally {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setTxToDelete(null);
        }
    };

    // ✅ FUNCIÓN COMPLETA
    const handleRequestEdit = (tx: Transaction) => { setTxToEdit(tx); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setIsEditModalOpen(false); setTxToEdit(null); };
    const handleUpdateTransaction = async (updatedTxData: { id?: string; amount: number; category: string; accountId: string; description?: string, timestamp: any, receiptUrl?: string }) => {
        if (!txToEdit || !updatedTxData.id) return;
        const originalAmount = txToEdit.amount;
        const newAmount = updatedTxData.amount;
        const batch = writeBatch(db);
        try {
            const accountRef = doc(db, 'accounts', txToEdit.accountId);
            const account = accounts.find(acc => acc.id === txToEdit.accountId);
            if (account) {
                const balanceCorrection = txToEdit.type === 'expense' ? (originalAmount - newAmount) : (newAmount - originalAmount);
                const newBalance = account.balance + balanceCorrection;
                batch.update(accountRef, { balance: newBalance });
            }
            const txCollectionName = txToEdit.type;
            const txRef = doc(db, txCollectionName, updatedTxData.id);
            batch.update(txRef, {
                amount: newAmount,
                category: updatedTxData.category,
                description: updatedTxData.description,
                timestamp: updatedTxData.timestamp,
                receiptUrl: updatedTxData.receiptUrl,
            });
            await batch.commit();
            fetchData();
        } catch (error) { console.error("Error al actualizar la transacción:", error); alert("Hubo un problema al actualizar la transacción."); }
        finally { handleCloseEditModal(); }
    };

    const getAccountName = (accountId: string) => accounts.find(acc => acc.id === accountId)?.name || 'Cuenta no encontrada';
    const formatDate = (timestamp: any) => timestamp?.toDate?.().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) || "Fecha inválida";

    return (
        <div className={`${montserrat.className} text-white`}>
            <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold">Historial de Transacciones</h1></div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-4">
                <div><input type="text" placeholder="🔍 Buscar por categoría o descripción..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-3 text-white placeholder-gray-400" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label><select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-2.5 text-white"><option value="all">Todos</option><option value="income">Ingreso</option><option value="expense">Gasto</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Cuenta</label><select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-2.5 text-white"><option value="all">Todas</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-2.5 text-white"><option value="all">Todas</option>{allCategoriesForFilter.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-2 md:col-span-2 lg:col-span-3">
                        <div><label className="block text-sm font-medium text-gray-300 mb-1">Desde</label><input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-2 text-white" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-1">Hasta</label><input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-2 text-white" /></div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div><p className="text-sm text-green-400 font-semibold">Total Ingresado</p><p className="text-2xl font-bold">{formatCurrency(dynamicTotals.totalIncome)}</p></div>
                <div><p className="text-sm text-red-400 font-semibold">Total Gastado</p><p className="text-2xl font-bold">{formatCurrency(dynamicTotals.totalExpense)}</p></div>
                <div><p className="text-sm text-gray-300 font-semibold">Balance Neto</p><p className={`text-2xl font-bold ${dynamicTotals.netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(dynamicTotals.netBalance)}</p></div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 md:p-6">
                {isLoading ? (<p className="text-center text-gray-400 py-16">Cargando transacciones...</p>)
                : filteredTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTransactions.map(tx => {
                            const isExpense = tx.type === 'expense';
                            const categoryParts = tx.category ? tx.category.split(' ') : ['❔'];
                            const emoji = categoryParts[0];
                            const categoryName = categoryParts.length > 1 ? categoryParts.slice(1).join(' ') : 'Sin Categoría';
                            return (
                                <div key={tx.id} className="bg-gray-700/60 p-4 rounded-lg flex items-center justify-between group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <span className="text-3xl bg-gray-800 p-2 rounded-lg">{emoji}</span>
                                        <div className="min-w-0">
                                            <p className="font-bold truncate">{categoryName}</p>
                                            {tx.description && <p className="text-sm text-gray-400 italic truncate">"{tx.description}"</p>}
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm text-gray-400">{formatDate(tx.timestamp)}</p>
                                                {tx.receiptUrl && (
                                                    <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" title="Ver comprobante" className="text-blue-400 hover:text-blue-300">
                                                        <PaperClipIcon />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                                        <div><p className={`font-bold text-lg ${isExpense ? 'text-red-400' : 'text-green-400'}`}>{isExpense ? '-' : '+'} {formatCurrency(tx.amount)}</p><p className="text-sm text-gray-400 truncate">{getAccountName(tx.accountId)}</p></div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col md:flex-row gap-2">
                                            <button onClick={() => handleRequestEdit(tx)} className="p-2 bg-gray-600 hover:bg-blue-600 rounded-md" title="Editar"><PencilIcon /></button>
                                            <button onClick={() => handleRequestDelete(tx)} className="p-2 bg-gray-600 hover:bg-red-600 rounded-md" title="Eliminar"><TrashIcon /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (<p className="text-center text-gray-400 py-16">No se encontraron transacciones con los filtros seleccionados.</p>)}
            </div>
            
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Eliminar Transacción" message={<span>¿Estás seguro de que quieres eliminar esta transacción?<br />Esta acción es irreversible y afectará el saldo de la cuenta asociada.</span>} confirmText="Sí, Eliminar" isLoading={isDeleting}/>
            {isEditModalOpen && txToEdit?.type === 'expense' && (<AddExpenseModal onClose={handleCloseEditModal} onSave={handleUpdateTransaction} accounts={accounts} categories={expenseCategories} expenseToEdit={txToEdit}/>)}
            {isEditModalOpen && txToEdit?.type === 'income' && (<AddIncomeModal onClose={handleCloseEditModal} onSave={handleUpdateTransaction} accounts={accounts} incomeCategories={incomeCategories} incomeToEdit={txToEdit}/>)}
        </div>
    );
}