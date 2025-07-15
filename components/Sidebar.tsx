'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Iconos para cada sección
const DashboardIcon = () => <span>🏠</span>;
const AccountsIcon = () => <span>🏦</span>;
const CategoriesIcon = () => <span>🏷️</span>;
const BudgetsIcon = () => <span>📊</span>;
const GoalsIcon = () => <span>🏆</span>;
const SettingsIcon = () => <span>⚙️</span>;
const TransactionsIcon = () => <span>🔁</span>;
const ReportsIcon = () => <span>📈</span>;
// ✅ AÑADIDO: Icono para la nueva página de Deudas
const DebtsIcon = () => <span>⚖️</span>;


const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
    { name: 'Transacciones', href: '/transactions', icon: TransactionsIcon },
    { name: 'Reportes', href: '/reports', icon: ReportsIcon },
    { name: 'Cuentas', href: '/accounts', icon: AccountsIcon },
    { name: 'Categorías', href: '/categories', icon: CategoriesIcon },
    { name: 'Presupuestos', href: '/budgets', icon: BudgetsIcon },
    { name: 'Metas', href: '/metas', icon: GoalsIcon },
    // ✅ AÑADIDO: El nuevo enlace a la página de Deudas
    { name: 'Deudas', href: '/debts', icon: DebtsIcon },
    { name: 'Configuración', href: '/settings', icon: SettingsIcon },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-gray-900 text-white flex flex-col p-4 border-r border-gray-700">
            <div className="text-2xl font-bold mb-10">Tu App Financiera</div>
            <nav className="flex flex-col space-y-2 flex-grow">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link key={item.name} href={item.href}>
                            <span className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                isActive 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}>
                                <item.icon />
                                <span className="font-medium">{item.name}</span>
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}