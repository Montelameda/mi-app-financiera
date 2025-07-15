'use client';

import { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';

// --- INTERFACES ---
interface Cuenta {
    id: string;
    name: string;
    type: string;
}

interface Presupuesto {
    id: string;
    categoryName: string;
    categoryEmoji: string;
}

interface AddSavingsModalProps {
    onClose: () => void;
    // La función onSave ahora pasará el monto y la cuenta de origen
    onSave: (aporte: { amount: number, sourceAccountId: string }) => void;
    accounts: Cuenta[];
    goal: Presupuesto; // Para saber a qué meta se está aportando
}

export default function AddSavingsModal({ onClose, onSave, accounts, goal }: AddSavingsModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    const [amount, setAmount] = useState<number | ''>('');
    const [sourceAccountId, setSourceAccountId] = useState<string>(accounts[0]?.id || '');

    // Filtramos las tarjetas de crédito, ya que no se puede "sacar" dinero de ellas para ahorrar.
    const availableAccounts = accounts.filter(acc => acc.type !== 'Tarjeta de Crédito');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            alert("Por favor, introduce un monto válido.");
            setIsLoading(false);
            return;
        }

        if (!sourceAccountId) {
            alert("Por favor, selecciona una cuenta de origen.");
            setIsLoading(false);
            return;
        }

        try {
            await onSave({ amount: numericAmount, sourceAccountId });
            onClose();
        } catch (error) {
            console.error("Error al guardar el aporte:", error);
            alert("Hubo un error al guardar el aporte.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-xl font-bold text-center mb-2">Aportar a tu Meta</h2>
                <p className="text-center text-teal-300 font-semibold mb-6">{goal.categoryEmoji} {goal.categoryName}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-gray-400 mb-2">Monto a Aportar ({currency})</label>
                        <input
                            type="number"
                            step="any"
                            name="amount"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ej: 20000"
                            className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="accountId" className="block text-gray-400 mb-2">¿Desde qué cuenta?</label>
                        <select
                            name="accountId"
                            id="accountId"
                            value={sourceAccountId}
                            onChange={(e) => setSourceAccountId(e.target.value)}
                            className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white"
                            required
                        >
                            {availableAccounts.length > 0 ? (
                                availableAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))
                            ) : (
                                <option disabled>No tienes cuentas de origen disponibles</option>
                            )}
                        </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading || availableAccounts.length === 0} className="w-full bg-teal-500 hover:bg-teal-600 font-bold py-3 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isLoading ? 'Guardando...' : 'Aportar Dinero'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}