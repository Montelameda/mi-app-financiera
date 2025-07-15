// ruta: app/(main)/metas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query, doc, deleteDoc, addDoc, updateDoc, orderBy, writeBatch } from 'firebase/firestore';
import { useSettings } from '@/context/SettingsContext';

// ✅ MODIFICADO: Se importan los dos modales que usaremos en esta página
import AddGoalModal from '@/components/AddGoalModal';
import AddSavingsModal from '@/components/AddSavingsModal'; // <-- El nuevo modal
import BudgetCard from '@/components/BudgetCard';
import ConfirmationModal from '@/components/ConfirmationModal';

const montserrat = Montserrat({ subsets: ['latin'] });

// --- INTERFACES ---
interface Presupuesto { id: string; categoryName: string; categoryEmoji: string; limit: number; periodo: 'mensual' | 'semanal' | 'objetivo'; createdAt?: any; rollover?: boolean; objetivoMonto?: number; objetivoFecha?: any; }
interface Categoria { id: string; name: string; emoji: string; }
interface Transaccion { id: string; amount: number; category: string; timestamp: any; }
// ✅ AÑADIDO: Interfaz para las Cuentas, ya que ahora las necesitamos
interface Cuenta { id: string; name: string; balance: number; type: string; }


const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" /></svg>);

export default function MetasPage() {
    const { currency, showDecimals } = useSettings();
    const [allBudgets, setAllBudgets] = useState<Presupuesto[]>([]);
    const [goalBudgets, setGoalBudgets] = useState<Presupuesto[]>([]);
    const [savingsCategories, setSavingsCategories] = useState<Categoria[]>([]);
    const [transactions, setTransactions] = useState<Transaccion[]>([]);
    // ✅ AÑADIDO: Estado para guardar la lista de cuentas del usuario
    const [accounts, setAccounts] = useState<Cuenta[]>([]);

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Presupuesto | null>(null);

    // ✅ AÑADIDO: Estados para controlar el nuevo modal de aportes
    const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
    const [selectedGoalForSavings, setSelectedGoalForSavings] = useState<Presupuesto | null>(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<Presupuesto | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const toDate = (timestamp: any): Date => timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const formatCurrency = (amount: number) => {
        const options: Intl.NumberFormatOptions = { style: 'currency', currency: currency, currencyDisplay: 'code' };
        options.minimumFractionDigits = showDecimals ? 2 : 0;
        options.maximumFractionDigits = showDecimals ? 2 : 0;
        return new Intl.NumberFormat('es-CL', options).format(amount);
    };

    const fetchData = async () => {
        try {
            // ✅ AÑADIDO: Se cargan también las cuentas del usuario
            const accountsSnapshot = await getDocs(query(collection(db, 'accounts')));
            setAccounts(accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cuenta)));

            const categoriesSnapshot = await getDocs(collection(db, 'savingsCategories'));
            setSavingsCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria)));

            const budgetsSnapshot = await getDocs(query(collection(db, 'budgets')));
            const budgetsData = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presupuesto));
            setAllBudgets(budgetsData);
            setGoalBudgets(budgetsData.filter(b => b.periodo === 'objetivo').sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()));

            // Se cargan todas las transacciones para calcular el progreso de la meta
            const incomesSnapshot = await getDocs(query(collection(db, 'income'), orderBy('timestamp', 'desc')));
            const expensesSnapshot = await getDocs(query(collection(db, 'expense'), orderBy('timestamp', 'desc')));

            const allTransactions = [
                ...incomesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: toDate(doc.data().timestamp) } as Transaccion)),
                ...expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: toDate(doc.data().timestamp) } as Transaccion))
            ];
            setTransactions(allTransactions);

        } catch (error) {
            console.error("Error cargando los datos para la página de metas:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Manejadores para el modal de Crear/Editar Meta ---
    const handleOpenAddModal = () => { setEditingGoal(null); setIsGoalModalOpen(true); };
    const handleOpenEditModal = (goal: Presupuesto) => { setEditingGoal(goal); setIsGoalModalOpen(true); };
    const handleCloseAddModal = () => { setIsGoalModalOpen(false); setEditingGoal(null); };
    const handleSaveGoal = async (goalData: any) => {
        const { id, ...dataToSave } = goalData;
        if (editingGoal) {
            await updateDoc(doc(db, "budgets", editingGoal.id), dataToSave);
        } else {
            await addDoc(collection(db, "budgets"), dataToSave);
        }
        fetchData(); 
        handleCloseAddModal();
    };

    // ✅ AÑADIDO: Funciones para manejar el nuevo modal de aportes
    const handleOpenSavingsModal = (goal: Presupuesto) => {
        setSelectedGoalForSavings(goal);
        setIsSavingsModalOpen(true);
    };
    const handleCloseSavingsModal = () => {
        setIsSavingsModalOpen(false);
        setSelectedGoalForSavings(null);
    };

    // ✅ AÑADIDO: Lógica principal para guardar un aporte
    const handleSaveAporte = async ({ amount, sourceAccountId }: { amount: number, sourceAccountId: string }) => {
        if (!selectedGoalForSavings) return;

        const accountRef = doc(db, 'accounts', sourceAccountId);
        const accountToUpdate = accounts.find(acc => acc.id === sourceAccountId);

        if (!accountToUpdate) {
            console.error("La cuenta de origen no fue encontrada");
            return;
        }

        // Usamos un batch de Firestore para asegurar que ambas operaciones se completen o ninguna
        const batch = writeBatch(db);

        // 1. Descontar el saldo de la cuenta de origen
        const newBalance = accountToUpdate.balance - amount;
        batch.update(accountRef, { balance: newBalance });

        // 2. Crear la nueva transacción de "ahorro" (se registra como un gasto con categoría de ahorro)
        const newTransactionData = {
            amount,
            accountId: sourceAccountId,
            category: `${selectedGoalForSavings.categoryEmoji} ${selectedGoalForSavings.categoryName}`,
            timestamp: new Date(),
        };
        const expenseCollectionRef = collection(db, 'expense');
        batch.set(doc(expenseCollectionRef), newTransactionData);

        // Ejecutar ambas operaciones
        await batch.commit();

        // Recargar todos los datos para ver los cambios reflejados
        await fetchData();
        handleCloseSavingsModal();
    };


    // --- Manejadores para el modal de Confirmación de Borrado ---
    const handleRequestDelete = (goal: Presupuesto) => { setGoalToDelete(goal); setIsConfirmModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!goalToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "budgets", goalToDelete.id));
            setGoalBudgets(currentGoals => currentGoals.filter(b => b.id !== goalToDelete.id));
        } catch (error) {
            console.error("Error al eliminar la meta:", error);
        } finally {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setGoalToDelete(null);
        }
    };

    return (
        <div className={`${montserrat.className} text-white`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Metas de Ahorro</h1>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg">
                    <PlusIcon />Crear Nueva Meta
                </button>
            </div>

            <p className="text-gray-400 mb-8">Define tus grandes objetivos y sigue tu progreso de ahorro mes a mes.</p>

            {goalBudgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goalBudgets.map((budget) => (
                        <BudgetCard
                            key={budget.id}
                            budget={budget}
                            transactions={transactions}
                            viewDate={new Date()}
                            formatCurrency={formatCurrency}
                            onEdit={handleOpenEditModal}
                            onDelete={() => handleRequestDelete(budget)}
                            // ✅ AÑADIDO: Pasamos la nueva función a la tarjeta de la meta
                            onAddSavings={() => handleOpenSavingsModal(budget)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-gray-800/50 rounded-lg">
                    <h3 className="text-xl font-semibold">Aún no tienes metas</h3>
                    <p className="text-gray-400 mt-2">¿Unas vacaciones? ¿Un nuevo computador? ¡Empieza a ahorrar para tus sueños!</p>
                    <button onClick={handleOpenAddModal} className="mt-6 flex items-center gap-2 mx-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-lg">
                        <PlusIcon />Crear mi primera meta
                    </button>
                </div>
            )}
            
            {/* Renderizado del modal de Crear/Editar Meta */}
            {isGoalModalOpen && (
                <AddGoalModal
                    categories={savingsCategories}
                    onClose={handleCloseAddModal}
                    onGoalSaved={handleSaveGoal}
                    goalToEdit={editingGoal}
                    existingBudgets={allBudgets}
                />
            )}

            {/* ✅ AÑADIDO: Renderizado del nuevo modal para Aportar Dinero */}
            {isSavingsModalOpen && selectedGoalForSavings && (
                <AddSavingsModal
                    onClose={handleCloseSavingsModal}
                    onSave={handleSaveAporte}
                    accounts={accounts}
                    goal={selectedGoalForSavings}
                />
            )}
            
            {/* Renderizado del modal de Confirmación */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Meta"
                message={
                    <span>
                        ¿Estás seguro de que quieres eliminar la meta
                        <strong className="text-white"> "{goalToDelete?.categoryName}"</strong>?
                        Perderás el seguimiento del progreso.
                    </span>
                }
                confirmText="Sí, Eliminar"
                isLoading={isDeleting}
            />
        </div>
    );
}