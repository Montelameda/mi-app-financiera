'use client';

import { useState, useEffect, useMemo } from 'react';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query } from 'firebase/firestore';
import { useSettings } from '@/context/SettingsContext';

// ✅ MODIFICADO: Se importan componentes para los 3 gráficos
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,    // Para Dona
  PointElement,  // Para Línea
  LineElement,   // Para Línea
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// ✅ MODIFICADO: Se añaden más funciones de fecha
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, eachMonthOfInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';

const montserrat = Montserrat({ subsets: ['latin'] });

// ✅ MODIFICADO: Se registran todos los componentes necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// --- INTERFACES ---
interface Transaction {
    amount: number;
    type: 'income' | 'expense';
    timestamp: any;
    category: string;
}

export default function ReportsPage() {
    const { currency, showDecimals } = useSettings();
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [timeFilter, setTimeFilter] = useState('this-month');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const toDate = (timestamp: any): Date => timestamp ? timestamp.toDate() : new Date();
            try {
                const incomesSnapshot = await getDocs(collection(db, 'income'));
                const expensesSnapshot = await getDocs(collection(db, 'expense'));
                const incomes = incomesSnapshot.docs.map(doc => ({ type: 'income', ...doc.data(), timestamp: toDate(doc.data().timestamp) } as Transaction));
                const expenses = expensesSnapshot.docs.map(doc => ({ type: 'expense', ...doc.data(), timestamp: toDate(doc.data().timestamp) } as Transaction));
                setTransactions([...incomes, ...expenses]);
            } catch (error) { console.error("Error al cargar los datos:", error); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, []);

    const reportData = useMemo(() => {
        const now = new Date();
        let startDate: Date, endDate: Date;

        switch(timeFilter) {
            case 'last-month':
                const lastMonth = subMonths(now, 1);
                startDate = startOfMonth(lastMonth);
                endDate = endOfMonth(lastMonth);
                break;
            case 'this-year':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                break;
            default:
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
        }
        const filteredTx = transactions.filter(tx => tx.timestamp >= startDate && tx.timestamp <= endDate);
        const totals = { income: 0, expense: 0 };
        const expensesByCategory: { [key: string]: number } = {};
        for (const tx of filteredTx) {
            if (tx.type === 'income') {
                totals.income += tx.amount;
            } else if (tx.type === 'expense') {
                totals.expense += tx.amount;
                if(tx.category && tx.category !== '🔁 Transferencia') {
                    const categoryName = tx.category.substring(tx.category.indexOf(' ') + 1);
                    expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + tx.amount;
                }
            }
        }
        return { totals, expensesByCategory };
    }, [transactions, timeFilter]);
    
    const monthlyNetChangeData = useMemo(() => {
        const last12Months = eachMonthOfInterval({
            start: subMonths(new Date(), 11),
            end: new Date()
        });
        const labels = last12Months.map(date => format(date, 'MMM', { locale: es }));
        const data = Array(12).fill(0);
        transactions.forEach(tx => {
            const txDate = tx.timestamp;
            const monthIndex = last12Months.findIndex(monthStart => 
                txDate >= monthStart && txDate <= endOfMonth(monthStart)
            );
            if (monthIndex !== -1) {
                if (tx.type === 'income') data[monthIndex] += tx.amount;
                else data[monthIndex] -= tx.amount;
            }
        });
        return { labels, data };
    }, [transactions]);

    const formatCurrencyForChart = (amount: number) => {
        const options: Intl.NumberFormatOptions = { style: 'currency', currency: currency };
        if (showDecimals) { options.minimumFractionDigits = 2; } else { options.minimumFractionDigits = 0; }
        return new Intl.NumberFormat('es-CL', options).format(amount);
    }

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Resumen de Ingresos vs. Gastos', color: '#FFFFFF', font: { size: 16 } },
            tooltip: { callbacks: { label: (context: any) => formatCurrencyForChart(context.parsed.y) } }
        },
        scales: { y: { ticks: { color: '#9CA3AF' } }, x: { ticks: { color: '#FFFFFF', font: { size: 14 } } } }
    };

    const barChartData = {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
            label: 'Monto',
            data: [reportData.totals.income, reportData.totals.expense],
            backgroundColor: ['rgba(74, 222, 128, 0.7)', 'rgba(248, 113, 113, 0.7)'],
            borderColor: ['rgba(74, 222, 128, 1)', 'rgba(248, 113, 113, 1)'],
            borderWidth: 1,
        }],
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { color: '#FFFFFF' } },
            title: { display: true, text: 'Gastos por Categoría', color: '#FFFFFF', font: { size: 16 } },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const percentage = reportData.totals.expense > 0 ? ((value / reportData.totals.expense) * 100).toFixed(1) : 0;
                        return `${label}: ${formatCurrencyForChart(value)} (${percentage}%)`;
                    }
                }
            }
        },
    };
    
    const doughnutChartData = {
        labels: Object.keys(reportData.expensesByCategory),
        datasets: [{
            label: 'Gasto',
            data: Object.values(reportData.expensesByCategory),
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#d946ef'],
            borderColor: '#1F2937',
            borderWidth: 3,
        }],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Evolución de Ahorro/Déficit Mensual (Últimos 12 Meses)', color: '#FFFFFF', font: { size: 16 } },
            tooltip: { callbacks: { label: (context: any) => `Balance: ${formatCurrencyForChart(context.parsed.y)}` } }
        },
        scales: { y: { ticks: { color: '#9CA3AF' } }, x: { ticks: { color: '#FFFFFF' } } },
        elements: { line: { tension: 0.2 } }
    };

    const lineChartData = {
        labels: monthlyNetChangeData.labels,
        datasets: [{
            label: 'Balance Neto Mensual',
            data: monthlyNetChangeData.data,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            fill: true,
        }]
    };

    return (
        <div className={`${montserrat.className} text-white`}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Reportes y Estadísticas</h1>
                <div className="flex items-center gap-2">
                    <label htmlFor="time-filter" className="text-sm font-medium text-gray-300">Mostrar:</label>
                    <select id="time-filter" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-lg p-2 text-white">
                        <option value="this-month">Este Mes</option>
                        <option value="last-month">Mes Pasado</option>
                        <option value="this-year">Este Año</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-xl"><p>Cargando datos...</p></div>
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-800/50 rounded-xl p-4 md:p-6" style={{ minHeight: '400px' }}>
                            <Bar options={barChartOptions} data={barChartData} />
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 flex items-center justify-center" style={{ minHeight: '400px' }}>
                            {doughnutChartData.datasets[0].data.length > 0 ? (
                                <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                            ) : (
                                <div className="text-center text-gray-500">No hay datos de gastos para mostrar.</div>
                            )}
                        </div>
                    </div>
                     <div className="bg-gray-800/50 rounded-xl p-4 md:p-6" style={{ height: '400px' }}>
                        <Line options={lineChartOptions} data={lineChartData} />
                    </div>
                </div>
            )}
        </div>
    );
}