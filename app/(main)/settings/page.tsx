'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Montserrat } from 'next/font/google';
import { currencies } from '@/data/currencies';
import { timezones } from '@/data/timezones';
// ✅ AÑADIDO: Se importa la base de datos y las funciones de borrado
import { db } from '@/firebase.config';
import { collection, writeBatch, getDocs } from 'firebase/firestore';
import ConfirmationModal from '@/components/ConfirmationModal';

const montserrat = Montserrat({ subsets: ['latin'] });

// --- Componente Reutilizable para el Selector con Buscador (sin cambios) ---
const SearchableSelect = ({ options, selectedValue, onSelect, searchPlaceholder, id }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowercasedTerm = searchTerm.toLowerCase();
        return options.filter((option: any) =>
            option.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, options]);

    const handleSelect = (value: string) => {
        onSelect(value);
        setIsOpen(false);
        setSearchTerm('');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-left flex justify-between items-center"
            >
                <span>{selectedValue}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                    <div className="p-2"><input type="text" placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-4" autoFocus /></div>
                    <ul className="max-h-60 overflow-y-auto">
                        {filteredOptions.map((option: string) => ( <li key={option} onClick={() => handleSelect(option)} className="px-4 py-2 hover:bg-blue-600 cursor-pointer">{option}</li> ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


export default function SettingsPage() {
    const { 
        currency, setCurrency, 
        showDecimals, setShowDecimals,
        language, setLanguage,
        timeZone, setTimeZone
    } = useSettings();

    const [saved, setSaved] = useState(false);
    
    // ✅ AÑADIDO: Estados para el modal de reinicio
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    
    // ✅ AÑADIDO: Lógica para reiniciar la cuenta
    const handleResetAccount = async () => {
        if (resetConfirmationText !== 'ELIMINAR') {
            alert("Debes escribir ELIMINAR para confirmar.");
            return;
        }

        setIsResetting(true);
        try {
            const collectionsToDelete = [
                'accounts', 'expense', 'income', 'categories', 
                'incomeCategories', 'savingsCategories', 'budgets'
            ];
            const batch = writeBatch(db);

            for (const collectionName of collectionsToDelete) {
                const collectionRef = collection(db, collectionName);
                const snapshot = await getDocs(collectionRef);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
            }

            await batch.commit();

            alert("¡Todos tus datos han sido eliminados! La aplicación se recargará.");
            window.location.reload();

        } catch (error) {
            console.error("Error al reiniciar la cuenta:", error);
            alert("Hubo un problema al eliminar los datos. Inténtalo de nuevo.");
        } finally {
            setIsResetting(false);
            setIsResetModalOpen(false);
            setResetConfirmationText(''); // Limpia el texto de confirmación
        }
    };

    const selectedCurrencyName = currencies.find(c => c.code === currency)?.name || currency;

    return (
        <div className={`${montserrat.className} text-white`}>
            <h1 className="text-3xl font-bold mb-6">Configuración</h1>

            <div className="bg-gray-800/50 rounded-xl p-6 max-w-lg mx-auto mt-4 space-y-6">
                
                <div>
                    <h2 className="text-xl font-semibold mb-2">Moneda Principal</h2>
                    <p className="text-gray-400 mb-4 text-sm">Busca y selecciona la moneda por defecto para la aplicación.</p>
                    <SearchableSelect
                        options={currencies.map(c => `${c.name} (${c.code})`)}
                        selectedValue={selectedCurrencyName}
                        onSelect={(value: string) => {
                            const code = value.match(/\(([^)]+)\)/)?.[1];
                            if (code) setCurrency(code);
                        }}
                        searchPlaceholder="Buscar por nombre o código..."
                    />
                </div>

                <div className="pt-6 border-t border-gray-700">
                    <h2 className="text-xl font-semibold mb-2">Formato de Números</h2>
                     <label htmlFor="show-decimals" className="flex justify-between items-center cursor-pointer">
                        <span className="text-gray-300">
                           <p>Mostrar decimales</p>
                           <p className="text-xs text-gray-500">Ej: 100.000,00 vs 100.000</p>
                        </span>
                        <div className="relative">
                            <input id="show-decimals" type="checkbox" className="sr-only peer" checked={showDecimals} onChange={(e) => setShowDecimals(e.target.checked)} />
                            <div className="block bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                            <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full"></div>
                        </div>
                    </label>
                </div>

                <div className="pt-6 border-t border-gray-700">
                    <h2 className="text-xl font-semibold mb-2">Idioma y Región</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="language-select" className="block text-gray-300 mb-2">Idioma</label>
                            <select id="language-select" value={language} onChange={(e: any) => setLanguage(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3">
                                <option value="es">Español</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div>
                           <label className="block text-gray-300 mb-2">Zona Horaria</label>
                           <SearchableSelect
                                options={timezones}
                                selectedValue={timeZone}
                                onSelect={setTimeZone}
                                searchPlaceholder="Buscar zona horaria..."
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end items-center pt-6 border-t border-gray-700">
                    {saved && <span className="text-green-400 mr-4 transition-opacity duration-300">¡Guardado!</span>}
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">Guardar Cambios</button>
                </div>

                {/* ✅ MODIFICADO: Zona de Peligro ahora tiene la lógica conectada */}
                <div className="pt-6 border-t border-red-500/30">
                    <h2 className="text-xl font-semibold text-red-400 mb-2">Zona de Peligro</h2>
                    <div className="flex justify-between items-center bg-red-900/20 p-4 rounded-lg">
                        <div>
                            <h3 className="font-bold">Reiniciar Cuenta</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Esto eliminará permanentemente todos tus datos. Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsResetModalOpen(true)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg flex-shrink-0 ml-4"
                        >
                            Reiniciar
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ AÑADIDO: Modal de confirmación para el reinicio */}
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => {
                    setIsResetModalOpen(false);
                    setResetConfirmationText(''); // Limpia el texto al cerrar
                }}
                onConfirm={handleResetAccount}
                title="¿Estás absolutamente seguro?"
                confirmText={isResetting ? "Eliminando..." : "Sí, eliminar todo"}
                isLoading={isResetting}
                isConfirmDisabled={resetConfirmationText !== 'ELIMINAR'}
                message={
                    <div className="space-y-4">
                        <p>
                            Esta acción es irreversible. Se borrarán todos los datos de tu cuenta.
                        </p>
                        <p className="font-medium text-gray-300">
                            Para confirmar, por favor escribe <strong className="text-red-400">ELIMINAR</strong> en el campo de abajo.
                        </p>
                        <input
                            type="text"
                            value={resetConfirmationText}
                            onChange={(e) => setResetConfirmationText(e.target.value)}
                            className="w-full bg-gray-900 border-2 border-gray-600 rounded-lg p-3 text-white text-center tracking-widest"
                            placeholder="ELIMINAR"
                        />
                    </div>
                }
            />
        </div>
    );
}