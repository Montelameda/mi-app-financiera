'use client';

import { useMemo, useState } from 'react';
// ✅ PASO 1: Importar el componente del gráfico que creamos
import DebtProjectionChart from './DebtProjectionChart';

// --- INTERFACES ---
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

interface DebtCardProps {
    debt: CombinedDebt;
    formatCurrency: (amount: number) => string;
    onPay: (debt: CombinedDebt) => void;
    onEdit: (debtId: string) => void;
    onDelete: (debtId: string) => void;
}

// --- ICONOS ---
const PencilIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1H8.75zM10 4.5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5A.75.75 0 0110 4.5z" clipRule="evenodd" /></svg> );
const WalletIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 7.5a.75.75 0 01.75.75v3.75h3.75a.75.75 0 010 1.5h-3.75v3.75a.75.75 0 01-1.5 0v-3.75H8.25a.75.75 0 010-1.5h3.75V8.25A.75.75 0 0112 7.5z" /><path fillRule="evenodd" d="M.75 5.25A2.25 2.25 0 013 3h18a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0121 21H3a2.25 2.25 0 01-2.25-2.25V5.25zM3 4.5a.75.75 0 00-.75.75v13.5c0 .414.336.75.75.75h18a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3z" clipRule="evenodd" /></svg>);
const ChartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15.5 2.5a.75.75 0 01.75.75v12.5a.75.75 0 01-1.5 0V3.25a.75.75 0 01.75-.75zM8.5 6.5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0V7.25a.75.75 0 01.75-.75zM4.5 10.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75z" /></svg>);


export default function DebtCard({ debt, formatCurrency, onPay, onEdit, onDelete }: DebtCardProps) {

    // ✅ PASO 2: Añadir estados para la proyección
    const [showProjection, setShowProjection] = useState(false);
    const [monthlyPayment, setMonthlyPayment] = useState<number | ''>(debt.minPayment || '');

    const { progress, remainingAmount, isPaidOff } = useMemo(() => {
        if (debt.isCreditCard) {
            const progress = debt.totalAmount > 0 ? (debt.amountPaidOrSpent / debt.totalAmount) * 100 : 0;
            return { progress, remainingAmount: 0, isPaidOff: false };
        }
        
        const progress = debt.totalAmount > 0 ? (debt.amountPaidOrSpent / debt.totalAmount) * 100 : 0;
        const remaining = debt.totalAmount - debt.amountPaidOrSpent;
        return {
            progress: Math.min(progress, 100),
            remainingAmount: remaining,
            isPaidOff: remaining <= 0
        };
    }, [debt]);

    const barColor = useMemo(() => {
        if (debt.isCreditCard) return 'bg-red-500';
        if (progress > 80) return 'bg-green-500';
        if (progress > 50) return 'bg-blue-500';
        return 'bg-yellow-500';
    }, [progress, debt.isCreditCard]);

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg group transition-all hover:bg-gray-700/80 flex flex-col">
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {debt.isCreditCard && <span title="Tarjeta de Crédito">💳</span>}
                            <h3 className="font-bold text-lg truncate">{debt.name}</h3>
                        </div>
                        <p className="text-xs text-gray-400 bg-gray-600 px-2 py-0.5 rounded-full inline-block mt-1">
                            {debt.category || 'Sin categoría'}
                        </p>
                    </div>
                    {!debt.isCreditCard && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(debt.id)} className="p-1.5 bg-gray-600/50 hover:bg-blue-600 rounded-full text-white" title="Editar Deuda"><PencilIcon /></button>
                            <button onClick={() => onDelete(debt.id)} className="p-1.5 bg-gray-600/50 hover:bg-red-600 rounded-full text-white" title="Eliminar Deuda"><TrashIcon /></button>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <div className="w-full bg-gray-600 rounded-full h-4 overflow-hidden">
                        <div
                            className={`${barColor} h-4 rounded-full text-right text-white text-[10px] font-bold pr-2 flex items-center justify-end transition-all duration-500`}
                            style={{ width: `${progress}%` }}
                        >
                           {progress > 10 && `${progress.toFixed(0)}%`}
                        </div>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="font-semibold text-gray-300">
                            {debt.isCreditCard ? 'Gastado: ' : 'Pagado: '}
                            {formatCurrency(debt.amountPaidOrSpent)}
                        </span>
                        <span className="text-gray-400">
                            {debt.isCreditCard ? 'Límite: ' : 'Total: '}
                            {formatCurrency(debt.totalAmount)}
                        </span>
                    </div>
                </div>

                {isPaidOff ? (
                    <div className="mt-4 text-center bg-green-900/50 text-green-300 font-bold p-3 rounded-lg text-sm">
                        ¡Felicidades, deuda saldada! 🎉
                    </div>
                ) : (
                    <div className="mt-4 pt-4 border-t border-gray-600/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-gray-400">Restante</p>
                            <p className="font-bold text-lg text-red-400">
                                {debt.isCreditCard ? 'N/A' : formatCurrency(remainingAmount)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Pago Mínimo</p>
                            <p className="font-bold text-lg">
                                {debt.minPayment ? formatCurrency(debt.minPayment) : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Tasa Interés</p>
                            <p className="font-bold text-lg">
                                {debt.interestRate ? `${debt.interestRate}%` : 'N/A'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4">
                <button 
                    onClick={() => onPay(debt)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg"
                >
                    <WalletIcon />
                    {debt.isCreditCard ? 'Pagar Tarjeta' : 'Registrar Pago'}
                </button>

                {/* ✅ PASO 3: Añadir la sección de proyección solo para deudas manuales */}
                {!debt.isCreditCard && !isPaidOff && (
                    <div className="mt-2">
                        <button 
                            onClick={() => setShowProjection(!showProjection)}
                            className="w-full flex items-center justify-center gap-2 text-sm text-teal-300 hover:text-teal-200 font-semibold py-2 rounded-lg"
                        >
                            <ChartIcon />
                            {showProjection ? 'Ocultar Proyección' : 'Proyectar Pago'}
                        </button>
                        
                        {/* Contenedor del gráfico que se muestra/oculta */}
                        <div className={`transition-all duration-500 ease-in-out ${showProjection ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0'}`}>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Simular pago mensual de:</label>
                                <input 
                                    type="number"
                                    value={monthlyPayment}
                                    onChange={(e) => setMonthlyPayment(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
                                    placeholder="Ej: 150000"
                                />
                            </div>
                            <DebtProjectionChart
                                debt={debt}
                                monthlyPayment={Number(monthlyPayment)}
                                formatCurrency={formatCurrency}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
