'use client';

import { useMemo } from 'react';
// ✅ Se importan las funciones de date-fns para los cálculos
import {
    endOfMonth, startOfMonth, endOfWeek, startOfWeek,
    differenceInDays, isSameMonth, isSameYear,
    formatDistanceStrict, differenceInMonths, differenceInWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';

// --- ICONOS PARA LOS BOTONES ---
const PencilIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1H8.75zM10 4.5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5A.75.75 0 0110 4.5z" clipRule="evenodd" /></svg> );
// ✅ AÑADIDO: Icono para el nuevo botón de Aportar Dinero
const PlusCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" /></svg>);


// --- INTERFACES ---
interface Presupuesto { id: string; categoryName: string; categoryEmoji: string; limit: number; periodo: 'mensual' | 'semanal' | 'objetivo'; createdAt: any; rollover?: boolean; objetivoMonto?: number; objetivoFecha?: any; }
interface Transaccion { amount: number; category: string; timestamp: any; }

interface BudgetCardProps {
    budget: Presupuesto;
    transactions: Transaccion[];
    viewDate: Date;
    formatCurrency: (amount: number) => string;
    onEdit: (budget: Presupuesto) => void;
    onDelete: () => void;
    // ✅ AÑADIDO: Se añade la nueva prop para manejar el clic del botón de aporte
    onAddSavings: () => void;
    adjustedLimit?: number;
    rolloverAmount?: number;
}

export default function BudgetCard({ budget, transactions, viewDate, formatCurrency, onEdit, onDelete, onAddSavings, adjustedLimit, rolloverAmount }: BudgetCardProps) {
    
    const toDate = (timestamp: any): Date => timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const categoryString = `${budget.categoryEmoji} ${budget.categoryName}`;
    
    if (budget.periodo === 'objetivo') {
        const totalSaved = useMemo(() => transactions
            .filter(t => t.category === categoryString)
            .reduce((sum, t) => sum + t.amount, 0), 
        [transactions, categoryString]);

        const goalAmount = budget.objetivoMonto || 0;
        const perc = goalAmount > 0 ? Math.min((totalSaved / goalAmount) * 100, 100) : 0;
        const goalDate = budget.objetivoFecha ? toDate(budget.objetivoFecha) : new Date();
        const timeLeft = formatDistanceStrict(goalDate, new Date(), { locale: es, addSuffix: true });
        
        const remainingAmount = Math.max(0, goalAmount - totalSaved);
        const today = new Date();
        const daysRemaining = differenceInDays(goalDate, today);
        const weeksRemaining = Math.max(1, differenceInWeeks(goalDate, today));
        const monthsRemaining = Math.max(1, differenceInMonths(goalDate, today));
        
        return (
            <div className="bg-gradient-to-br from-teal-900/50 to-gray-800 p-4 rounded-lg group relative border border-teal-500/20 h-full flex flex-col justify-between gap-4">
                <div>
                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <button onClick={() => onEdit(budget)} className="p-1.5 bg-gray-600/50 hover:bg-blue-600 rounded-full text-white" title="Editar meta"><PencilIcon /></button>
                        <button onClick={onDelete} className="p-1.5 bg-gray-600/50 hover:bg-red-600 rounded-full text-white" title="Eliminar meta"><TrashIcon /></button>
                    </div>
                    
                    <span className="font-bold text-lg pr-4">{budget.categoryEmoji} {budget.categoryName}</span>
                    <p className="text-xs text-gray-400 mb-1">Meta {timeLeft}</p>
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="w-full bg-gray-700 rounded-full h-4">
                        <div className="bg-teal-500 h-4 rounded-full text-right text-white text-[10px] font-bold pr-2 flex items-center justify-end transition-all duration-500" style={{ width: `${perc}%` }}>
                           {perc > 10 && `${perc.toFixed(0)}%`}
                        </div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-teal-300 font-semibold">{formatCurrency(totalSaved)}</span>
                        <span className="text-gray-300">{formatCurrency(goalAmount)}</span>
                    </div>
                </div>

                {remainingAmount > 0 && daysRemaining > 0 ? (
                    <div className="bg-gray-900/40 p-3 rounded-lg text-xs space-y-2">
                        <h4 className="font-bold text-gray-300 text-center mb-2">Plan para alcanzar tu meta:</h4>
                        <div className="flex justify-around text-center">
                            <div>
                                <p className="text-gray-400">Diario</p>
                                <p className="font-bold text-white">{formatCurrency(remainingAmount / daysRemaining)}</p>
                            </div>
                             <div>
                                <p className="text-gray-400">Semanal</p>
                                <p className="font-bold text-white">{formatCurrency(remainingAmount / weeksRemaining)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Mensual</p>
                                <p className="font-bold text-white">{formatCurrency(remainingAmount / monthsRemaining)}</p>
                            </div>
                        </div>
                    </div>
                ) : remainingAmount <= 0 ? (
                    <div className="bg-green-900/50 text-green-300 text-center font-bold p-3 rounded-lg text-sm">
                        ¡Felicidades, meta cumplida! 🎉
                    </div>
                ) : (
                     <div className="bg-red-900/50 text-red-300 text-center font-bold p-3 rounded-lg text-sm">
                        El plazo para esta meta ha terminado.
                    </div>
                )}
                
                {/* ✅ AÑADIDO: Botón para abrir el modal de aportes */}
                <button 
                    onClick={onAddSavings}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg mt-2"
                >
                    <PlusCircleIcon />
                    Aportar Dinero
                </button>
            </div>
        )
    }

    // --- LÓGICA Y DISEÑO PARA TARJETA DE GASTO (MENSUAL/SEMANAL) ---
    // El código de aquí para abajo no necesita cambios
    const { cycleRange, remainingDays, isCurrentCycle } = useMemo(() => {
        let start, end;
        if (budget.periodo === 'mensual') {
            start = startOfMonth(viewDate);
            end = endOfMonth(viewDate);
        } else {
            start = startOfWeek(viewDate, { weekStartsOn: 1 });
            end = endOfWeek(viewDate, { weekStartsOn: 1 });
        }
        const today = new Date();
        const isCurrentActiveCycle = isSameMonth(viewDate, today) && isSameYear(viewDate, today);
        const daysLeft = isCurrentActiveCycle ? differenceInDays(end, today) + 1 : 0;
        return { cycleRange: { start, end }, remainingDays: daysLeft, isCurrentCycle: isCurrentActiveCycle };
    }, [viewDate, budget.periodo]);

    const spent = useMemo(() => {
        return transactions
            .filter(t => {
                const transactionDate = toDate(t.timestamp);
                return t.category === categoryString &&
                       transactionDate >= cycleRange.start &&
                       transactionDate <= cycleRange.end;
            })
            .reduce((acc, t) => acc + t.amount, 0);
    }, [transactions, categoryString, cycleRange]);

    const finalAdjustedLimit = adjustedLimit ?? budget.limit;
    const finalRolloverAmount = rolloverAmount ?? 0;

    const moneyRemaining = finalAdjustedLimit - spent;
    const dailyAverage = (remainingDays > 0 && moneyRemaining > 0 && isCurrentCycle) ? moneyRemaining / remainingDays : 0;
    const perc = finalAdjustedLimit > 0 ? Math.min((spent / finalAdjustedLimit) * 100, 100) : 0;
    
    let barColor = 'bg-green-500';
    if (perc >= 75 && perc < 100) barColor = 'bg-orange-500';
    else if (perc >= 100) barColor = 'bg-red-500';

    const hasRollover = budget.rollover && finalRolloverAmount !== 0;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg group transition-all hover:bg-gray-700 h-full flex flex-col">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg pr-4">{budget.categoryEmoji} {budget.categoryName}</span>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                            <span className="text-sm text-gray-100 font-mono whitespace-nowrap">{formatCurrency(spent)} / {formatCurrency(finalAdjustedLimit)}</span>
                            {hasRollover && (
                                <p className={`text-xs font-mono ${finalRolloverAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({formatCurrency(budget.limit)} {finalRolloverAmount > 0 ? '+' : ''}{formatCurrency(finalRolloverAmount)})
                                </p>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => onEdit(budget)} className="p-1.5 bg-gray-600/50 hover:bg-blue-600 rounded-full text-white" title="Editar presupuesto"><PencilIcon /></button>
                            <button onClick={onDelete} className="p-1.5 bg-gray-600/50 hover:bg-red-600 rounded-full text-white" title="Eliminar presupuesto"><TrashIcon /></button>
                        </div>
                    </div>
                </div>
                
                <div className="w-full bg-gray-600 rounded-full h-4 mb-3">
                    <div className={`${barColor} h-4 rounded-full transition-all duration-500`} style={{ width: `${perc}%` }}></div>
                </div>
            </div>

            {isCurrentCycle && (
                 <div className="text-xs text-center text-gray-400 bg-gray-800/50 p-2 rounded-md mt-auto">
                    {moneyRemaining > 0 ? (
                        <>
                            Te quedan <span className="font-bold text-green-400">{formatCurrency(moneyRemaining)}</span>. 
                            {dailyAverage > 0 && ` Puedes gastar aprox. ${formatCurrency(dailyAverage)} por día.`}
                        </>
                    ) : (
                        <span className="font-bold text-red-400">Has excedido este presupuesto por {formatCurrency(Math.abs(moneyRemaining))}.</span>
                    )}
                </div>
            )}
        </div>
    );
}