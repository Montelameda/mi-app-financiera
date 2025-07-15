'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

// --- INTERFACES ---
// ✅ MODIFICADO: La interfaz de Cuenta ahora incluye el balance
interface Cuenta { 
    id: string; 
    name: string; 
    type: string;
    balance: number; 
}
interface Transferencia {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    description: string;
    date: Date;
}

interface AddTransferModalProps {
    accounts: Cuenta[];
    onClose: () => void;
    onSave: (transferData: Transferencia) => Promise<void>;
    // ✅ AÑADIDO: Se pasa la función para dar formato al dinero
    formatCurrency: (amount: number) => string;
}

export default function AddTransferModal({ accounts, onClose, onSave, formatCurrency }: AddTransferModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);

    // Estados del formulario
    const [amount, setAmount] = useState<number | ''>('');
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Filtrar cuentas para que no se pueda transferir a/desde tarjetas de crédito
    const availableAccounts = accounts.filter(acc => acc.type !== 'Tarjeta de Crédito');

    useEffect(() => {
        // Asignar cuentas por defecto para evitar errores y mejorar la experiencia
        if (availableAccounts.length > 0) {
            setFromAccountId(availableAccounts[0].id);
        }
        if (availableAccounts.length > 1) {
            setToAccountId(availableAccounts[1].id);
        }
    }, [accounts]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (!fromAccountId || !toAccountId) {
            alert("Debes seleccionar una cuenta de origen y destino.");
            return;
        }
        if (fromAccountId === toAccountId) {
            alert("La cuenta de origen y destino no pueden ser la misma.");
            return;
        }
        if (Number(amount) <= 0) {
            alert("El monto debe ser mayor a cero.");
            return;
        }

        setIsLoading(true);
        try {
            await onSave({
                amount: Number(amount),
                fromAccountId,
                toAccountId,
                description: description.trim(),
                date: new Date(date + "T12:00:00"),
            });
            onClose();
        } catch (error) {
            console.error("Error al guardar la transferencia:", error);
            alert("No se pudo realizar la transferencia.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm overflow-y-auto max-h-[95vh]">
                <h2 className="text-xl font-bold text-center mb-6">Realizar Transferencia 🔁</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-gray-400 mb-2">Monto a Transferir ({currency})</label>
                        <input type="number" step="any" id="amount" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required/>
                    </div>
                    <div>
                        <label htmlFor="fromAccountId" className="block text-gray-400 mb-2">Desde la cuenta</label>
                        <select id="fromAccountId" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required>
                            {/* ✅ MODIFICADO: Ahora cada opción muestra el saldo formateado */}
                            {availableAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({formatCurrency(acc.balance)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="toAccountId" className="block text-gray-400 mb-2">Hacia la cuenta</label>
                        <select id="toAccountId" value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required>
                            {availableAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-gray-400 mb-2">Descripción (Opcional)</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Ahorro para vacaciones..." className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white h-20 resize-none"></textarea>
                    </div>
                     <div>
                        <label htmlFor="date" className="block text-gray-400 mb-2">Fecha de la Transferencia</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading || availableAccounts.length < 2} className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg disabled:bg-gray-500">
                            {isLoading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}