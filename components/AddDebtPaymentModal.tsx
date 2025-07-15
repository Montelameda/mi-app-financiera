'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

// --- INTERFACES ---

// La deuda que estamos pagando (puede ser tarjeta o manual)
interface CombinedDebt {
    id: string;
    isCreditCard: boolean;
    name: string;
    totalAmount: number;
    amountPaidOrSpent: number;
}

// Las cuentas del usuario para seleccionar el origen del pago
interface Account {
    id:string;
    name: string;
    balance: number;
    type: string;
}

// La información que el modal enviará de vuelta a la página
export interface PaymentData {
    debt: CombinedDebt;
    amount: number;
    accountId: string;
    date: Date;
    description: string;
}

interface AddDebtPaymentModalProps {
    onClose: () => void;
    onSave: (paymentData: PaymentData) => Promise<void>;
    debtToPay: CombinedDebt;
    accounts: Account[]; // Necesitamos la lista de cuentas
    formatCurrency: (amount: number) => string;
}


export default function AddDebtPaymentModal({ onClose, onSave, debtToPay, accounts, formatCurrency }: AddDebtPaymentModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);

    // Estados del formulario
    const [amount, setAmount] = useState<number | ''>('');
    const [accountId, setAccountId] = useState<string>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    // Filtramos las cuentas para que no se pueda pagar desde una tarjeta de crédito
    const availableAccounts = accounts.filter(acc => acc.type !== 'Tarjeta de Crédito');

    // Al cargar, seleccionamos la primera cuenta disponible por defecto
    useEffect(() => {
        if (availableAccounts.length > 0) {
            setAccountId(availableAccounts[0].id);
        }
    }, [availableAccounts]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const numericAmount = Number(amount);

        // Validaciones
        if (numericAmount <= 0) {
            alert("El monto del pago debe ser mayor a cero.");
            return;
        }
        if (!accountId) {
            alert("Debes seleccionar una cuenta de origen para el pago.");
            return;
        }
        
        // Para deudas manuales, no se puede pagar más de lo que se debe
        if (!debtToPay.isCreditCard) {
            const remainingAmount = debtToPay.totalAmount - debtToPay.amountPaidOrSpent;
            if (numericAmount > remainingAmount) {
                alert(`No puedes pagar más de lo que debes. Monto restante: ${formatCurrency(remainingAmount)}`);
                return;
            }
        }

        setIsLoading(true);

        const paymentData: PaymentData = {
            debt: debtToPay,
            amount: numericAmount,
            accountId,
            date: new Date(date + "T12:00:00"), // Añadimos hora para evitar problemas de zona horaria
            description: description.trim(),
        };

        try {
            await onSave(paymentData);
        } catch (error) {
            console.error("Error al registrar el pago:", error);
            alert("No se pudo registrar el pago.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-xl font-bold text-center mb-2">Registrar Pago</h2>
                <p className="text-center text-blue-300 font-semibold mb-6">{debtToPay.name}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-gray-400 mb-2">Monto a Pagar ({currency})</label>
                        <input
                            type="number"
                            step="any"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ej: 50000"
                            className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="accountId" className="block text-gray-400 mb-2">Pagar desde la cuenta</label>
                        <select
                            id="accountId"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white"
                            required
                        >
                            {availableAccounts.length > 0 ? (
                                availableAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({formatCurrency(acc.balance)})
                                    </option>
                                ))
                            ) : (
                                <option disabled>No tienes cuentas de origen disponibles</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-gray-400 mb-2">Fecha del Pago</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-gray-400 mb-2">Descripción (Opcional)</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Cuota 5 de 12" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white h-20 resize-none"></textarea>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading || availableAccounts.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg disabled:bg-gray-500">
                            {isLoading ? 'Guardando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}