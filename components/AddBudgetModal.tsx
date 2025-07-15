// components/AddBudgetModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { startOfMonth, format, getYear, getMonth, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// --- INTERFACES ---
interface Categoria { id: string; name: string; emoji: string; }
interface Transaccion { amount: number; category: string; timestamp: any; }
interface Presupuesto { id: string; categoryName: string; categoryEmoji: string; limit: number; periodo: 'mensual' | 'semanal'; createdAt?: any; rollover?: boolean; }

interface AddBudgetModalProps {
    categories: Categoria[];
    transactions: Transaccion[];
    onClose: () => void;
    onBudgetSaved: (newBudget: any) => Promise<void>;
    budgetToEdit?: Presupuesto | null;
    viewDate: Date;
    existingBudgets: Presupuesto[];
}

const meses = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    name: format(new Date(0, i), 'MMMM', { locale: es })
}));

export default function AddBudgetModal({ categories, transactions, onClose, onBudgetSaved, budgetToEdit, viewDate, existingBudgets }: AddBudgetModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    
    const [limit, setLimit] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [period, setPeriod] = useState<'mensual' | 'semanal'>('mensual');
    const [budgetMonth, setBudgetMonth] = useState(getMonth(viewDate));
    const [budgetYear, setBudgetYear] = useState(getYear(viewDate));
    const [enableRollover, setEnableRollover] = useState(false);

    const toDate = (timestamp: any): Date => timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

    useEffect(() => {
        if (budgetToEdit) {
            setLimit(String(budgetToEdit.limit));
            setSelectedCategory(`${budgetToEdit.categoryEmoji} ${budgetToEdit.categoryName}`);
            setPeriod(budgetToEdit.periodo);
            setEnableRollover(budgetToEdit.rollover || false);
            const budgetDate = toDate(budgetToEdit.createdAt);
            setBudgetMonth(getMonth(budgetDate));
            setBudgetYear(getYear(budgetDate));
        } else {
            if (categories && categories.length > 0) {
                setSelectedCategory(`${categories[0].emoji} ${categories[0].name}`);
            }
            setEnableRollover(false);
            setBudgetMonth(getMonth(viewDate));
            setBudgetYear(getYear(viewDate));
        }
    }, [budgetToEdit, categories, viewDate]);
    
    const suggestedLimit = useMemo(() => {
        if (!selectedCategory || !transactions || transactions.length === 0) return null;
        const toDate = (timestamp: any): Date => timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        const relevantTransactions = transactions.filter(t => t.category === selectedCategory);
        if (relevantTransactions.length < 3) return null;
        const monthlyExpenses: { [key: string]: number } = {};
        relevantTransactions.forEach(t => {
            const date = toDate(t.timestamp);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyExpenses[monthKey]) {
                monthlyExpenses[monthKey] = 0;
            }
            monthlyExpenses[monthKey] += t.amount;
        });
        const monthlyValues = Object.values(monthlyExpenses);
        if (monthlyValues.length === 0) return null;
        const total = monthlyValues.reduce((sum, val) => sum + val, 0);
        const average = total / monthlyValues.length;
        return Math.ceil(average / 1000) * 1000;
    }, [selectedCategory, transactions]);


    const handleSaveBudget = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const numericLimit = parseFloat(limit);
        if (isNaN(numericLimit) || numericLimit <= 0 || !selectedCategory) {
            alert("Por favor, introduce un límite válido y selecciona una categoría.");
            return;
        }

        const [emoji, ...nameParts] = selectedCategory.split(' ');
        const name = nameParts.join(' ');
        const budgetDate = new Date(budgetYear, budgetMonth, 1);

        if (!budgetToEdit) {
            const isDuplicate = existingBudgets.some(budget => 
                budget.categoryName === name &&
                isSameMonth(toDate(budget.createdAt), budgetDate)
            );

            if (isDuplicate) {
                alert(`Ya existe un presupuesto para "${name}" en ${format(budgetDate, 'MMMM yyyy', { locale: es })}.`);
                return; 
            }
        }
        
        setIsLoading(true);
        const budgetData = {
            categoryName: name,
            categoryEmoji: emoji,
            limit: numericLimit,
            periodo: period,
            createdAt: budgetToEdit ? budgetToEdit.createdAt : budgetDate,
            rollover: enableRollover,
        };
        
        try {
            await onBudgetSaved(budgetData);
        } catch (error) {
            console.error("Error al guardar presupuesto:", error);
            alert("Hubo un error al guardar el presupuesto.");
        } finally {
            setIsLoading(false);
        }
    };

    const yearOptions = Array.from({ length: 3 }, (_, i) => getYear(new Date()) + i);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-xl font-bold text-center mb-4">{budgetToEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
                <form onSubmit={handleSaveBudget} className="space-y-4">
                    {!budgetToEdit && (
                        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                            <label className="block text-gray-400 mb-2 text-sm">Presupuesto para el mes de:</label>
                            <div className="flex gap-2">
                                <select 
                                    value={budgetMonth} 
                                    onChange={(e) => setBudgetMonth(Number(e.target.value))}
                                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2 text-white capitalize"
                                >
                                    {meses.map(mes => (
                                        <option key={mes.value} value={mes.value}>{mes.name}</option>
                                    ))}
                                </select>
                                <select 
                                    value={budgetYear} 
                                    onChange={(e) => setBudgetYear(Number(e.target.value))}
                                    className="w-1/2 bg-gray-700 border-2 border-gray-600 rounded-lg p-2 text-white"
                                >
                                    {yearOptions.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="category" className="block text-gray-400 mb-2">Categoría</label>
                        <select 
                            name="category" 
                            id="category" 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)} 
                            className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white disabled:opacity-50"
                            disabled={!!budgetToEdit}
                        >
                            {(categories || []).map(cat => ( <option key={cat.id} value={`${cat.emoji} ${cat.name}`}>{cat.emoji} {cat.name}</option>))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="period" className="block text-gray-400 mb-2">Período</label>
                        <select name="period" id="period" value={period} onChange={(e) => setPeriod(e.target.value as any)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white">
                            <option value="mensual">Mensual</option>
                            <option value="semanal">Semanal</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="limit" className="block text-gray-400 mb-2">Límite ({currency})</label>
                        <input type="number" step="any" name="limit" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={`Ej: 200000`} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                        {suggestedLimit && !budgetToEdit && (
                            <div className="text-xs text-teal-300 mt-2 flex gap-2 items-center">
                                <span>💡</span>
                                <div>
                                    Sugerencia basada en tu gasto promedio: <button type="button" className="font-bold underline" onClick={() => setLimit(suggestedLimit.toString())}>
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(suggestedLimit)}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <label htmlFor="rollover-switch" className="flex justify-between items-center cursor-pointer p-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-300 pr-4">
                           <p className="font-semibold">Acumular sobrante/déficit</p>
                           <p className="text-xs text-gray-500">El dinero no gastado (o gastado de más) se pasará al siguiente mes.</p>
                           <div className="text-xs italic mt-2 space-y-1">
                               <p><strong className="text-green-400">Ej (Sobrante):</strong> Límite $50.000, gasto $45.000 → próximo límite será $55.000.</p>
                               <p><strong className="text-red-400">Ej (Déficit):</strong> Límite $50.000, gasto $55.000 → próximo límite será $45.000.</p>
                           </div>
                        </span>
                        <div className="relative">
                            <input id="rollover-switch" type="checkbox" className="sr-only peer" checked={enableRollover} onChange={(e) => setEnableRollover(e.target.checked)} />
                            <div className="block bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-teal-600 transition-colors"></div>
                            <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full"></div>
                        </div>
                    </label>
                    
                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg disabled:bg-gray-500">{isLoading ? 'Guardando...' : (budgetToEdit ? 'Guardar Cambios' : 'Establecer')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}