'use client';

import { useState, useEffect, useMemo } from 'react';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useSettings } from '@/context/SettingsContext';
import DebtCard from '@/components/DebtCard';
import AddDebtModal from '@/components/AddDebtModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import AddDebtPaymentModal, { PaymentData } from '@/components/AddDebtPaymentModal';
// ✅ PASO 1: Importar el nuevo modal de estrategia
import DebtStrategyModal from '@/components/DebtStrategyModal';


// --- INTERFACES ---
interface Debt {
    id: string;
    name: string;
    totalAmount: number;
    amountPaid: number;
    interestRate: number;
    minPayment: number;
    paymentDay: number;
    category: string;
    createdAt: any;
    notes?: string;
}

interface Account {
    id: string;
    name: string;
    balance: number;
    type: string;
    limiteCredito?: number;
}

interface CombinedDebt {
    id: string;
    isCreditCard: boolean;
    name: string;
    totalAmount: number;
    amountPaidOrSpent: number;
    interestRate?: number;
    minPayment?: number;
    paymentDay?: number;
    category?: string;
    notes?: string;
}

// --- ICONOS ---
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" /></svg>);
// ✅ PASO 2: Añadir un icono para el nuevo botón
const CalculatorIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.75h.75a.75.75 0 010 1.5h-.75v.75a.75.75 0 01-1.5 0v-.75h-.75a.75.75 0 010-1.5h.75V2.75A.75.75 0 0110 2zM5.013 4.32a.75.75 0 01.876-.217l3.437 1.718a.75.75 0 010 1.334l-3.437 1.718a.75.75 0 01-1.093-.894L5.34 7.5 4.797 6.42a.75.75 0 01.216-1.093zM15.204 4.103a.75.75 0 011.093.217l.543 1.086.543 1.086a.75.75 0 01-1.093.894l-3.437-1.718a.75.75 0 010-1.334l3.437-1.718zM8.25 10a.75.75 0 01.75.75v.75h.75a.75.75 0 010 1.5h-.75v.75a.75.75 0 01-1.5 0v-.75h-.75a.75.75 0 010-1.5h.75v-.75A.75.75 0 018.25 10zM12.25 10a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75zM3.25 15a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM6.25 15a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM9.25 15a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>);

const montserrat = Montserrat({ subsets: ['latin'] });

export default function DebtsPage() {
    const { currency, showDecimals } = useSettings();
    const [isLoading, setIsLoading] = useState(true);

    const [manualDebts, setManualDebts] = useState<Debt[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [debtToPay, setDebtToPay] = useState<CombinedDebt | null>(null);
    
    // ✅ PASO 3: Añadir estado para el nuevo modal
    const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
    
    const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatCurrency = (amount: number) => {
        const options: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'code'
        };
        options.minimumFractionDigits = showDecimals ? 2 : 0;
        options.maximumFractionDigits = showDecimals ? 2 : 0;
        return new Intl.NumberFormat('es-CL', options).format(amount);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const debtsSnapshot = await getDocs(query(collection(db, 'debts')));
            const debtsData = debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
            setManualDebts(debtsData);

            const accountsSnapshot = await getDocs(query(collection(db, 'accounts')));
            const accountsData = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
            setAccounts(accountsData);

        } catch (error) {
            console.error("Error cargando los datos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const combinedDebts = useMemo<CombinedDebt[]>(() => {
        const processedManualDebts: CombinedDebt[] = manualDebts.map(debt => ({
            id: debt.id, isCreditCard: false, name: debt.name, totalAmount: debt.totalAmount,
            amountPaidOrSpent: debt.amountPaid, interestRate: debt.interestRate,
            minPayment: debt.minPayment, paymentDay: debt.paymentDay, category: debt.category,
            notes: debt.notes
        }));
        const creditCardDebts: CombinedDebt[] = accounts
            .filter(acc => acc.type === 'Tarjeta de Crédito' && acc.balance > 0)
            .map(acc => ({
                id: acc.id, isCreditCard: true, name: acc.name,
                totalAmount: acc.limiteCredito || acc.balance,
                amountPaidOrSpent: acc.balance, category: 'Tarjeta de Crédito'
            }));
        return [...processedManualDebts, ...creditCardDebts];
    }, [manualDebts, accounts]);
    
    const totalDebtAmount = useMemo(() => {
        return combinedDebts.reduce((sum, debt) => {
            if (debt.isCreditCard) return sum + debt.amountPaidOrSpent;
            return sum + (debt.totalAmount - debt.amountPaidOrSpent);
        }, 0);
    }, [combinedDebts]);

    const handleSaveDebt = async (debtData: Omit<Debt, 'createdAt' | 'amountPaid'>) => {
        const { id, ...dataToSave } = debtData;
        if (id) {
            await updateDoc(doc(db, 'debts', id), dataToSave);
        } else {
            await addDoc(collection(db, 'debts'), { ...dataToSave, amountPaid: 0, createdAt: new Date() });
        }
        fetchData();
        handleCloseAddModal();
    };

    const handleSavePayment = async (paymentData: PaymentData) => {
        const { debt, amount, accountId, date, description } = paymentData;
        const batch = writeBatch(db);

        const sourceAccountRef = doc(db, 'accounts', accountId);
        const sourceAccount = accounts.find(acc => acc.id === accountId);
        if (!sourceAccount) throw new Error("Cuenta de origen no encontrada");
        batch.update(sourceAccountRef, { balance: sourceAccount.balance - amount });

        if (debt.isCreditCard) {
            const creditCardRef = doc(db, 'accounts', debt.id);
            const newBalance = debt.amountPaidOrSpent - amount;
            batch.update(creditCardRef, { balance: newBalance < 0 ? 0 : newBalance });
            
            const expenseRef = doc(collection(db, 'expense'));
            batch.set(expenseRef, {
                amount, accountId, category: '💳 Pago de Tarjeta',
                description: description || `Pago a ${debt.name}`, timestamp: date,
                receiptUrl: '',
            });
        } else {
            const debtRef = doc(db, 'debts', debt.id);
            const newAmountPaid = debt.amountPaidOrSpent + amount;
            batch.update(debtRef, { amountPaid: newAmountPaid });

            const expenseRef = doc(collection(db, 'expense'));
            batch.set(expenseRef, {
                amount, accountId, category: '💸 Pago de Deuda',
                description: description || `Abono a ${debt.name}`, timestamp: date,
                receiptUrl: '',
            });
        }

        await batch.commit();
        fetchData();
        handleClosePaymentModal();
    };

    const handleCloseAddModal = () => { setIsAddDebtModalOpen(false); setDebtToEdit(null); };
    const handleClosePaymentModal = () => { setIsPaymentModalOpen(false); setDebtToPay(null); };

    const handlePay = (debt: CombinedDebt) => { setDebtToPay(debt); setIsPaymentModalOpen(true); };
    const handleEdit = (debtId: string) => { const debt = manualDebts.find(d => d.id === debtId); if (debt) { setDebtToEdit(debt); setIsAddDebtModalOpen(true); } };
    const handleDelete = (debtId: string) => { const debt = manualDebts.find(d => d.id === debtId); if (debt) { setDebtToDelete(debt); setIsConfirmModalOpen(true); } };
    const handleConfirmDelete = async () => { if (!debtToDelete) return; setIsDeleting(true); try { await deleteDoc(doc(db, "debts", debtToDelete.id)); fetchData(); } catch (error) { console.error("Error:", error); } finally { setIsDeleting(false); setIsConfirmModalOpen(false); setDebtToDelete(null); } };

    if (isLoading) return <div className="text-center text-gray-400 py-16">Cargando...</div>;

    return (
        <div className={`${montserrat.className} text-white`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Gestión de Deudas</h1>
                <div className="flex items-center gap-4">
                    {/* ✅ PASO 4: Añadir el botón para abrir la calculadora */}
                    <button onClick={() => setIsStrategyModalOpen(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg">
                        <CalculatorIcon /> Calcular Estrategia
                    </button>
                    <button onClick={() => { setDebtToEdit(null); setIsAddDebtModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
                        <PlusIcon /> Añadir Deuda
                    </button>
                </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 mb-8 text-center">
                <p className="text-sm text-gray-400 uppercase tracking-wider">Total Adeudado</p>
                <p className="text-4xl font-bold text-red-400 mt-2">{formatCurrency(totalDebtAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">Suma de préstamos pendientes y gastos en tarjetas de crédito.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {combinedDebts.length > 0 ? (
                    combinedDebts.map(debt => <DebtCard key={debt.id} debt={debt} formatCurrency={formatCurrency} onPay={handlePay} onEdit={handleEdit} onDelete={handleDelete} />)
                ) : (
                    <div className="md:col-span-2 xl:col-span-3 text-center py-16 px-6 bg-gray-800/50 rounded-lg">
                        <h3 className="text-xl font-semibold">¡Felicidades! No tienes deudas.</h3>
                        <p className="text-gray-400 mt-2">No se encontraron deudas manuales ni saldos en tus tarjetas de crédito.</p>
                    </div>
                )}
            </div>

            {isAddDebtModalOpen && <AddDebtModal onClose={handleCloseAddModal} onSave={handleSaveDebt} debtToEdit={debtToEdit} />}
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Eliminar Deuda" message={<span>¿Seguro que quieres eliminar la deuda <strong className="text-white">"{debtToDelete?.name}"</strong>?</span>} confirmText="Sí, Eliminar" isLoading={isDeleting} />
            {isPaymentModalOpen && debtToPay && <AddDebtPaymentModal onClose={handleClosePaymentModal} onSave={handleSavePayment} debtToPay={debtToPay} accounts={accounts} formatCurrency={formatCurrency} />}
            
            {/* ✅ PASO 5: Renderizar el nuevo modal de estrategia */}
            {isStrategyModalOpen && (
                <DebtStrategyModal
                    onClose={() => setIsStrategyModalOpen(false)}
                    manualDebts={manualDebts}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
}