// ruta: app/(main)/budgets/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query, orderBy, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { useSettings } from '@/context/SettingsContext';
import { format, addMonths, subMonths, isSameMonth, isSameWeek, startOfMonth, endOfMonth, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';

import AddBudgetModal from '@/components/AddBudgetModal';
import BudgetCard from '@/components/BudgetCard';
import ConfirmationModal from '@/components/ConfirmationModal';

const montserrat = Montserrat({ subsets: ['latin'] });

// --- INTERFACES ---
interface Presupuesto { id: string; categoryName: string; categoryEmoji: string; limit: number; periodo: 'mensual' | 'semanal' | 'objetivo'; createdAt?: any; rollover?: boolean; objetivoMonto?: number; objetivoFecha?: any; }
interface Categoria { id: string; name: string; emoji: string; }
interface Transaccion { id: string; amount: number; category: string; timestamp: any; }

// --- ICONOS ---
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" /></svg> );
const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;


export default function BudgetsPage() {
    const { currency, showDecimals } = useSettings();
    const [budgets, setBudgets] = useState<Presupuesto[]>([]);
    const [categories, setCategories] = useState<Categoria[]>([]);
    const [transactions, setTransactions] = useState<Transaccion[]>([]);
    const [viewDate, setViewDate] = useState(new Date());

    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Presupuesto | null>(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [budgetToDelete, setBudgetToDelete] = useState<Presupuesto | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const toDate = (timestamp: any): Date => {
        if (timestamp?.toDate) { return timestamp.toDate(); }
        return new Date(timestamp);
    };

    const formatCurrency = (amount: number) => {
        const options: Intl.NumberFormatOptions = { style: 'currency', currency: currency, currencyDisplay: 'code' };
        options.minimumFractionDigits = showDecimals ? 2 : 0;
        options.maximumFractionDigits = showDecimals ? 2 : 0;
        return new Intl.NumberFormat('es-CL', options).format(amount);
    };

    const fetchData = async () => {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria)));
        
        const budgetsSnapshot = await getDocs(query(collection(db, 'budgets')));
        setBudgets(budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presupuesto)));
        
        const expensesSnapshot = await getDocs(query(collection(db, 'expense'), orderBy('timestamp', 'desc')));
        setTransactions(expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: toDate(doc.data().timestamp) } as Transaccion)));
    };

    useEffect(() => { fetchData(); }, []);
    
    const handleOpenAddModal = () => { setEditingBudget(null); setIsBudgetModalOpen(true); };
    const handleOpenEditModal = (budget: Presupuesto) => { setEditingBudget(budget); setIsBudgetModalOpen(true);};
    const handleCloseModal = () => { setIsBudgetModalOpen(false); setEditingBudget(null); };
    
    const handleSaveBudget = async (budgetData: any) => {
        const { id, ...dataToSave } = budgetData;
        if (editingBudget) {
            await updateDoc(doc(db, "budgets", editingBudget.id), dataToSave);
        } else {
            await addDoc(collection(db, "budgets"), dataToSave);
        }
        fetchData();
        handleCloseModal();
    };

    const handleRequestDelete = (budget: Presupuesto) => { setBudgetToDelete(budget); setIsConfirmModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!budgetToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "budgets", budgetToDelete.id));
            setBudgets(currentBudgets => currentBudgets.filter(b => b.id !== budgetToDelete.id));
        } finally {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setBudgetToDelete(null);
        }
    };

    const adjustedBudgets = useMemo(() => {
        const sortedBudgets = [...budgets].sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());
        const memo = new Map<string, { adjustedLimit: number, rolloverAmount: number }>();

        for (const budget of sortedBudgets) {
            if (budget.periodo !== 'mensual' || !budget.rollover) {
                memo.set(budget.id, { adjustedLimit: budget.limit, rolloverAmount: 0 });
                continue;
            }
            const budgetDate = toDate(budget.createdAt);
            const prevMonthDate = subMonths(budgetDate, 1);
            const prevMonthBudget = sortedBudgets.find(b => b.categoryName === budget.categoryName && b.periodo === 'mensual' && isSameMonth(toDate(b.createdAt), prevMonthDate) && isSameYear(toDate(b.createdAt), prevMonthDate));
            let rolloverAmount = 0;
            if (prevMonthBudget && memo.has(prevMonthBudget.id)) {
                const prevBudgetMemo = memo.get(prevMonthBudget.id)!;
                const prevBudgetStart = startOfMonth(prevMonthDate);
                const prevBudgetEnd = endOfMonth(prevMonthDate);
                const spentLastMonth = transactions.filter(t => {
                    const catString = `${prevMonthBudget.categoryEmoji} ${prevMonthBudget.categoryName}`;
                    const transactionDate = toDate(t.timestamp);
                    return t.category === catString && transactionDate >= prevBudgetStart && transactionDate <= prevBudgetEnd;
                }).reduce((sum, t) => sum + t.amount, 0);
                rolloverAmount = prevBudgetMemo.adjustedLimit - spentLastMonth;
            }
            memo.set(budget.id, { 
                adjustedLimit: budget.limit + rolloverAmount,
                rolloverAmount: rolloverAmount
            });
        }
        return memo;
    }, [budgets, transactions]);
    
    const monthlyBudgets = budgets.filter(b => b.periodo === 'mensual' && isSameMonth(toDate(b.createdAt), viewDate));
    const weeklyBudgets = budgets.filter(b => b.periodo === 'semanal' && isSameWeek(toDate(b.createdAt), viewDate, { weekStartsOn: 1 }));

    return (
        <div className={`${montserrat.className} text-white`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Presupuestos de Gasto</h1>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg">
                    <PlusIcon />Añadir Presupuesto
                </button>
            </div>

            <div className="flex justify-center items-center gap-4 bg-gray-800/50 p-3 rounded-xl mb-8">
                <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft /></button>
                <h2 className="text-xl font-semibold w-48 text-center capitalize">
                    {format(viewDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 rounded-full hover:bg-gray-700"><ChevronRight /></button>
            </div>

            <div className="space-y-8">
                {monthlyBudgets.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Tus Presupuestos Mensuales</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {monthlyBudgets.map((budget) => {
                                const adjustment = adjustedBudgets.get(budget.id) || { adjustedLimit: budget.limit, rolloverAmount: 0 };
                                return (
                                    <BudgetCard 
                                        key={budget.id} 
                                        budget={budget} 
                                        transactions={transactions} 
                                        viewDate={viewDate} 
                                        formatCurrency={formatCurrency}
                                        onEdit={handleOpenEditModal}
                                        onDelete={() => handleRequestDelete(budget)}
                                        adjustedLimit={adjustment.adjustedLimit}
                                        rolloverAmount={adjustment.rolloverAmount}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
                 {weeklyBudgets.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Tus Presupuestos Semanales</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {weeklyBudgets.map((budget) => (
                                <BudgetCard 
                                    key={budget.id} 
                                    budget={budget} 
                                    transactions={transactions} 
                                    viewDate={viewDate} 
                                    formatCurrency={formatCurrency}
                                    onEdit={handleOpenEditModal}
                                    onDelete={() => handleRequestDelete(budget)}
                                    adjustedLimit={budget.limit}
                                    rolloverAmount={0}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {monthlyBudgets.length === 0 && weeklyBudgets.length === 0 && (
                     <p className="text-gray-500 text-center py-8">No has definido ningún presupuesto de gasto para este período.</p>
                )}
            </div>

            {isBudgetModalOpen && (
                <AddBudgetModal
                    categories={categories}
                    transactions={transactions}
                    onClose={handleCloseModal}
                    onBudgetSaved={handleSaveBudget}
                    budgetToEdit={editingBudget}
                    viewDate={viewDate}
                    existingBudgets={budgets}
                    defaultPeriod='mensual'
                />
            )}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Presupuesto"
                message={<span>¿Seguro que quieres eliminar el presupuesto para <strong className="text-white">"{budgetToDelete?.categoryName}"</strong>?</span>}
                confirmText="Sí, Eliminar"
                isLoading={isDeleting}
            />
        </div>
    );
}