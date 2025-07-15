'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

// --- INTERFACES ---
interface DebtData {
    id?: string;
    name: string;
    totalAmount: number;
    interestRate: number;
    minPayment: number;
    paymentDay: number;
    category: string;
    // ✅ PASO 1: Añadir el campo de notas a la interfaz
    notes?: string;
    amountPaid?: number; 
    createdAt?: any;
}

interface AddDebtModalProps {
    onClose: () => void;
    onSave: (debt: Omit<DebtData, 'id' | 'createdAt' | 'amountPaid'> & { id?: string }) => Promise<void>;
    debtToEdit?: DebtData | null;
}

// --- CATEGORÍAS ---
const debtCategories = [
    'Préstamo de Consumo',
    'Crédito Automotriz',
    'Crédito Hipotecario',
    'Préstamo Estudiantil',
    'Deuda con Familiar/Amigo',
    'Otro'
];

const informalCategories = ['Deuda con Familiar/Amigo', 'Otro'];


export default function AddDebtModal({ onClose, onSave, debtToEdit }: AddDebtModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState('');
    const [totalAmount, setTotalAmount] = useState<number | ''>('');
    const [interestRate, setInterestRate] = useState<number | ''>('');
    const [minPayment, setMinPayment] = useState<number | ''>('');
    const [paymentDay, setPaymentDay] = useState<number | ''>(1);
    // ✅ PASO 2: La categoría empieza vacía para que el usuario deba elegir una
    const [category, setCategory] = useState('');
    // ✅ PASO 3: Añadir estado para las notas
    const [notes, setNotes] = useState('');

    const [isFormalDebt, setIsFormalDebt] = useState(true);

    useEffect(() => {
        setIsFormalDebt(!informalCategories.includes(category));
    }, [category]);

    useEffect(() => {
        if (debtToEdit) {
            setName(debtToEdit.name);
            setTotalAmount(debtToEdit.totalAmount);
            setInterestRate(debtToEdit.interestRate);
            setMinPayment(debtToEdit.minPayment);
            setPaymentDay(debtToEdit.paymentDay);
            setCategory(debtToEdit.category);
            // ✅ PASO 4: Cargar las notas si estamos editando
            setNotes(debtToEdit.notes || '');
        }
    }, [debtToEdit]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const numTotalAmount = Number(totalAmount);
        const numInterestRate = Number(interestRate);
        const numMinPayment = Number(minPayment);
        const numPaymentDay = Number(paymentDay);

        if (isNaN(numTotalAmount) || numTotalAmount <= 0) {
            alert("El monto total debe ser un número válido y mayor a cero.");
            return;
        }
        if (isNaN(numPaymentDay) || numPaymentDay < 1 || numPaymentDay > 31) {
            alert("El día de pago debe ser un número válido entre 1 y 31.");
            return;
        }

        if (isFormalDebt) {
            if (isNaN(numInterestRate)) {
                alert("La tasa de interés debe ser un número válido.");
                return;
            }
            if (isNaN(numMinPayment)) {
                alert("El pago mínimo debe ser un número válido.");
                return;
            }
        }

        setIsLoading(true);

        const debtData: Omit<DebtData, 'id' | 'createdAt' | 'amountPaid'> & { id?: string } = {
            name: name.trim(),
            totalAmount: numTotalAmount,
            interestRate: numInterestRate,
            minPayment: numMinPayment,
            paymentDay: numPaymentDay,
            category: category,
            // ✅ PASO 5: Incluir las notas en los datos a guardar
            notes: notes.trim(),
        };

        if (debtToEdit) {
            debtData.id = debtToEdit.id;
        }

        try {
            await onSave(debtData);
        } catch (error) {
            console.error("Error al guardar la deuda:", error);
            alert("No se pudo guardar la deuda. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md overflow-y-auto max-h-[95vh]">
                <h2 className="text-xl font-bold text-center mb-6">
                    {debtToEdit ? 'Editar Deuda' : 'Añadir Nueva Deuda'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-gray-400 mb-2">Nombre de la Deuda</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Préstamo automotriz" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-gray-400 mb-2">Categoría</label>
                        {/* ✅ PASO 6: El selector ahora tiene una opción por defecto y es requerido */}
                        <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required>
                            <option value="" disabled>-- Elige una categoría --</option>
                            {debtCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    {/* ✅ PASO 7: Contenedor que oculta todos los campos hasta que se elija una categoría */}
                    <div className={`space-y-4 transition-all duration-500 ease-in-out ${category ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        {/* Contenedor para los campos de deudas formales */}
                        <div className={`transition-all duration-500 ease-in-out ${isFormalDebt ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <div>
                                    <label htmlFor="interestRate" className="block text-gray-400 mb-2">Tasa de Interés Anual (%)</label>
                                    <input type="number" step="any" id="interestRate" value={interestRate} onChange={e => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 19.5" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" />
                                </div>
                                <div>
                                    <label htmlFor="minPayment" className="block text-gray-400 mb-2">Pago Mínimo Mensual</label>
                                    <input type="number" step="any" id="minPayment" value={minPayment} onChange={e => setMinPayment(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="totalAmount" className="block text-gray-400 mb-2">Monto Total ({currency})</label>
                                <input type="number" step="any" id="totalAmount" value={totalAmount} onChange={e => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                            </div>
                            <div>
                                <label htmlFor="paymentDay" className="block text-gray-400 mb-2">Día de Pago (1-31)</label>
                                <input type="number" id="paymentDay" value={paymentDay} onChange={e => setPaymentDay(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" min="1" max="31" required />
                            </div>
                        </div>

                        {/* ✅ PASO 8: Añadir el campo de texto para las notas */}
                        <div>
                            <label htmlFor="notes" className="block text-gray-400 mb-2">Notas (Opcional)</label>
                            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Préstamo para el pie del auto, acordado en enero." className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white h-24 resize-none"></textarea>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg disabled:bg-gray-500">
                            {isLoading ? 'Guardando...' : (debtToEdit ? 'Guardar Cambios' : 'Añadir Deuda')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}