'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Necesario para rellenar el área bajo la línea
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- INTERFACES ---
interface DebtProjectionChartProps {
    debt: {
        totalAmount: number;
        amountPaidOrSpent: number;
        interestRate?: number;
        minPayment?: number;
    };
    // El pago mensual que el usuario quiere simular
    monthlyPayment: number;
    formatCurrency: (amount: number) => string;
}

export default function DebtProjectionChart({ debt, monthlyPayment, formatCurrency }: DebtProjectionChartProps) {

    const projectionData = useMemo(() => {
        const labels: string[] = [];
        const dataPoints: number[] = [];

        let remainingBalance = debt.totalAmount - (debt.amountPaidOrSpent || 0);
        const monthlyInterestRate = (debt.interestRate || 0) / 100 / 12;

        // Si la deuda ya está pagada o el pago es 0, no hay nada que proyectar
        if (remainingBalance <= 0 || monthlyPayment <= 0) {
            return { labels: ['Ahora'], dataPoints: [remainingBalance] };
        }

        const today = new Date();
        labels.push(today.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
        dataPoints.push(remainingBalance);

        let months = 0;
        // Límite de 30 años (360 meses) para evitar bucles infinitos con pagos muy bajos
        while (remainingBalance > 0 && months < 360) { 
            months++;
            
            // 1. Aplicar interés al saldo restante (si aplica)
            if (monthlyInterestRate > 0) {
                remainingBalance += remainingBalance * monthlyInterestRate;
            }
            
            // 2. Realizar el pago mensual
            remainingBalance -= monthlyPayment;
            
            // Asegurarse de que el saldo no sea negativo
            if (remainingBalance < 0) remainingBalance = 0;

            // Añadir el nuevo punto de datos al gráfico
            const futureDate = new Date(today);
            futureDate.setMonth(today.getMonth() + months);
            
            labels.push(futureDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
            dataPoints.push(remainingBalance);
        }

        return { labels, dataPoints };
    }, [debt, monthlyPayment]);

    const chartData = {
        labels: projectionData.labels,
        datasets: [
            {
                label: 'Saldo Pendiente',
                data: projectionData.dataPoints,
                borderColor: 'rgb(74, 222, 128)',
                backgroundColor: 'rgba(74, 222, 128, 0.2)',
                fill: true,
                tension: 0.2,
                pointRadius: 0, // Ocultar los puntos en la línea
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: `Proyección de Pago - Terminarías en ${projectionData.labels.length - 1} meses`,
                color: '#FFFFFF',
                font: { size: 14 }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return `Saldo: ${formatCurrency(context.parsed.y)}`;
                    },
                },
            },
        },
        scales: {
            y: {
                ticks: { 
                    color: '#9CA3AF',
                    callback: function(value: any) {
                        // Para no mostrar tantos números en el eje Y
                        if (value === 0) return formatCurrency(0);
                        if (value === projectionData.dataPoints[0]) return formatCurrency(value);
                        return '';
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: { color: '#9CA3AF' },
                grid: {
                    display: false
                }
            },
        },
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg mt-4 h-64">
            <Line options={chartOptions as any} data={chartData} />
        </div>
    );
}
