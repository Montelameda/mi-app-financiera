// components/AddGoalModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { startOfMonth, format } from 'date-fns';

// --- INTERFACES ---
interface Categoria { id: string; name: string; emoji: string; }
// ✅ MODIFICADO: La interfaz ya no necesita 'limit' para la creación
interface Presupuesto { id: string; categoryName: string; categoryEmoji: string; periodo: 'objetivo'; createdAt?: any; objetivoMonto?: number; objetivoFecha?: any; }

interface AddGoalModalProps {
    categories: Categoria[];
    onClose: () => void;
    onGoalSaved: (newGoal: any) => Promise<void>;
    goalToEdit?: Presupuesto & { limit?: number }; // Se añade limit opcional para la edición
    existingBudgets: Presupuesto[];
}

export default function AddGoalModal({ categories, onClose, onGoalSaved, goalToEdit, existingBudgets }: AddGoalModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados del formulario
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [objetivoMonto, setObjetivoMonto] = useState('');
    const [objetivoFecha, setObjetivoFecha] = useState('');
    
    // ✅ ELIMINADO: El estado para 'limit' (aporte mensual) ya no es necesario
    // const [limit, setLimit] = useState('');

    const toDate = (timestamp: any): Date => timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

    useEffect(() => {
        if (goalToEdit) {
            setSelectedCategory(`${goalToEdit.categoryEmoji} ${goalToEdit.categoryName}`);
            setObjetivoMonto(String(goalToEdit.objetivoMonto || ''));
            if (goalToEdit.objetivoFecha) {
                setObjetivoFecha(format(toDate(goalToEdit.objetivoFecha), 'yyyy-MM-dd'));
            }
        } else {
            if (categories && categories.length > 0) {
                setSelectedCategory(`${categories[0].emoji} ${categories[0].name}`);
            }
        }
    }, [goalToEdit, categories]);
    
    const handleSaveGoal = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const numericGoalAmount = parseFloat(objetivoMonto);

        // ✅ MODIFICADO: La validación ya no incluye el aporte mensual
        if (isNaN(numericGoalAmount) || numericGoalAmount <= 0 || !objetivoFecha || !selectedCategory) {
            alert("Por favor, especifica una categoría, un monto y una fecha límite para tu meta.");
            return;
        }

        const [emoji, ...nameParts] = selectedCategory.split(' ');
        const name = nameParts.join(' ');
        
        if (!goalToEdit) {
            const isDuplicate = existingBudgets.some(budget => budget.categoryName === name && budget.periodo === 'objetivo');
            if (isDuplicate) {
                alert(`Ya existe una meta de ahorro para la categoría "${name}".`);
                return;
            }
        }
        
        setIsLoading(true);

        const goalData = {
            categoryName: name,
            categoryEmoji: emoji,
            periodo: 'objetivo',
            // ✅ MODIFICADO: 'limit' se omite o se establece en 0, ya no viene del formulario
            limit: 0, 
            objetivoMonto: numericGoalAmount,
            objetivoFecha: new Date(objetivoFecha),
            rollover: true, // Las metas siempre son acumulativas
            createdAt: goalToEdit ? toDate(goalToEdit.createdAt) : startOfMonth(new Date()),
        };
        
        try {
            await onGoalSaved(goalData);
        } catch (error) {
            console.error("Error al guardar la meta:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm overflow-y-auto max-h-[95vh]">
                <h2 className="text-xl font-bold text-center mb-4">{goalToEdit ? 'Editar Meta' : 'Nueva Meta de Ahorro'}</h2>
                <form onSubmit={handleSaveGoal} className="space-y-4">
                    <div className="mb-4">
                        <label htmlFor="category" className="block text-gray-400 mb-2">Categoría de Ahorro</label>
                        <select name="category" id="category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white disabled:opacity-50" disabled={!!goalToEdit}>
                            {(categories || []).map(cat => ( <option key={cat.id} value={`${cat.emoji} ${cat.name}`}>{cat.emoji} {cat.name}</option>))}
                        </select>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-teal-500/30">
                         <div>
                            <label htmlFor="objetivoMonto" className="block text-gray-400 mb-2">¿Cuánto quieres ahorrar? ({currency})</label>
                            <input type="number" step="any" name="objetivoMonto" value={objetivoMonto} onChange={e => setObjetivoMonto(e.target.value)} placeholder="Ej: 1000000" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                        </div>
                         <div>
                            <label htmlFor="objetivoFecha" className="block text-gray-400 mb-2">¿Para qué fecha?</label>
                            <input type="date" name="objetivoFecha" value={objetivoFecha} onChange={e => setObjetivoFecha(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                        </div>
                    </div>

                    {/* ✅ ELIMINADO: Todo el 'div' del aporte mensual ha sido removido */}
                    
                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg disabled:bg-gray-500">{isLoading ? 'Guardando...' : (goalToEdit ? 'Guardar Cambios' : 'Crear Meta')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}