'use client';

import { useState, useMemo } from 'react';
import { useSettings } from '@/context/SettingsContext';

// --- INTERFACES ---
// Usamos una versión simplificada de la interfaz de Deuda para la calculadora
interface Debt {
    id: string;
    name: string;
    totalAmount: number;
    amountPaid: number;
    interestRate: number;
    minPayment: number;
}

interface DebtStrategyModalProps {
    onClose: () => void;
    // Pasamos solo las deudas manuales, ya que las estrategias no aplican a tarjetas de crédito
    manualDebts: Debt[];
    formatCurrency: (amount: number) => string;
}

// --- ICONOS ---
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>);
const CalculatorIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.25 2.25a.75.75 0 01.75.75v.518l.983.491a.75.75 0 01.467.893l-.848 3.391a.75.75 0 01-1.33.28l-.975-2.437a.75.75 0 01.28-1.33l.983-.492v-.518a.75.75 0 01-.75-.75z" /><path fillRule="evenodd" d="M9.75 3.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v9a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-9zM10.5 4.5v3h3v-3h-3zM10.5 9v3h3v-3h-3zM3.75 15a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-6zM4.5 15.75v4.5h3v-4.5h-3zM9.75 15a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-6zM10.5 15.75v4.5h3v-4.5h-3zM15.75 15a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-6zM16.5 15.75v4.5h3v-4.5h-3z" clipRule="evenodd" /></svg>);


export default function DebtStrategyModal({ onClose, manualDebts, formatCurrency }: DebtStrategyModalProps) {
    const { currency } = useSettings();
    const [extraPayment, setExtraPayment] = useState<number | ''>('');
    const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
    const [plan, setPlan] = useState<any[] | null>(null);

    const calculatePlan = () => {
        let debts = JSON.parse(JSON.stringify(manualDebts)).map((d: Debt) => ({
            ...d,
            remaining: d.totalAmount - d.amountPaid
        })).filter((d: any) => d.remaining > 0);

        if (debts.length === 0) {
            alert("No tienes deudas manuales pendientes para calcular un plan.");
            return;
        }

        if (strategy === 'snowball') {
            debts.sort((a: any, b: any) => a.remaining - b.remaining);
        } else { // Avalanche
            debts.sort((a: any, b: any) => b.interestRate - a.interestRate);
        }

        let snowball = Number(extraPayment) || 0;
        let months = 0;
        let paymentLog: any[] = [];

        while (debts.length > 0 && months < 240) { // Límite de 20 años para evitar bucles infinitos
            months++;
            let monthLog = { month: months, payments: [] as any[], totalPaid: 0 };
            let totalMonthPayment = 0;
            
            // Aplicar interés mensual si corresponde
            for (const debt of debts) {
                if (debt.interestRate > 0) {
                    debt.remaining += debt.remaining * (debt.interestRate / 100 / 12);
                }
            }
            
            // Pagar mínimos
            for (const debt of debts) {
                let payment = Math.min(debt.remaining, debt.minPayment);
                debt.remaining -= payment;
                totalMonthPayment += payment;
                monthLog.payments.push({ name: debt.name, amount: payment, type: 'min' });
            }

            // Aplicar la bola de nieve a la deuda prioritaria
            let availableSnowball = snowball;
            for (const debt of debts) {
                if(availableSnowball <= 0) break;

                let extraPaid = Math.min(debt.remaining, availableSnowball);
                debt.remaining -= extraPaid;
                totalMonthPayment += extraPaid;
                availableSnowball -= extraPaid;

                const paymentRecord = monthLog.payments.find((p: any) => p.name === debt.name);
                if (paymentRecord) {
                    paymentRecord.amount += extraPaid;
                    paymentRecord.type = 'focus';
                }
            }
            
            monthLog.totalPaid = totalMonthPayment;
            
            // Chequear deudas pagadas y hacer crecer la bola de nieve
            const paidOffDebts = debts.filter((d: any) => d.remaining <= 0);
            for (const paidDebt of paidOffDebts) {
                snowball += paidDebt.minPayment;
            }
            
            paymentLog.push(monthLog);
            debts = debts.filter((d: any) => d.remaining > 0);
        }
        setPlan(paymentLog);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Calculadora de Estrategia de Deudas</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><CloseIcon /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-300 mb-2">
                            Esta herramienta te ayuda a visualizar cómo pagar tus deudas más rápido.
                            Solo funciona con deudas manuales (préstamos, etc.).
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <label htmlFor="extraPayment" className="block text-sm font-medium text-gray-400 mb-1">Monto extra mensual ({currency})</label>
                                <input
                                    type="number"
                                    id="extraPayment"
                                    value={extraPayment}
                                    onChange={e => setExtraPayment(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Ej: 50000"
                                    className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label htmlFor="strategy" className="block text-sm font-medium text-gray-400 mb-1">Estrategia</label>
                                <select id="strategy" value={strategy} onChange={e => setStrategy(e.target.value as any)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white">
                                    <option value="snowball">Bola de Nieve (Pagar la más pequeña primero)</option>
                                    <option value="avalanche">Avalancha (Pagar la de mayor interés primero)</option>
                                </select>
                            </div>
                            <button onClick={calculatePlan} className="self-end w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg">
                                <CalculatorIcon /> Calcular Plan
                            </button>
                        </div>
                    </div>

                    {plan && (
                        <div className="mt-6">
                            <h3 className="text-lg font-bold mb-2">Tu Plan de Pago:</h3>
                            <p className="text-gray-400 mb-4">
                                ¡Felicidades! Siguiendo este plan, podrías estar libre de deudas en <strong className="text-white">{plan.length} meses</strong> (aproximadamente {(plan.length / 12).toFixed(1)} años).
                            </p>
                            <div className="space-y-4">
                                {plan.map(month => (
                                    <div key={month.month} className="bg-gray-700/50 p-3 rounded-lg">
                                        <p className="font-bold text-blue-300">Mes {month.month}</p>
                                        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                            {month.payments.map((p: any, index: number) => (
                                                <li key={index} className={p.type === 'focus' ? 'font-bold text-green-400' : ''}>
                                                    Pagar {formatCurrency(p.amount)} a "{p.name}"
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-right text-xs text-gray-400 mt-2">Total pagado este mes: {formatCurrency(month.totalPaid)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}