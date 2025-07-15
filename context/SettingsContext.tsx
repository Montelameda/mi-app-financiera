// ruta: context/SettingsContext.tsx

'use client';

import { createContext, useState, useContext, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { translations } from '@/data/translations'; // Asegúrate de que esta ruta es correcta

// Definimos los tipos de datos que puede tener nuestro diccionario
type TranslationKeys = keyof (typeof translations)['es'];
type Languages = keyof typeof translations;

interface SettingsContextType {
    currency: string;
    setCurrency: (currency: string) => void;
    showDecimals: boolean;
    setShowDecimals: (show: boolean) => void;
    language: Languages;
    setLanguage: (language: Languages) => void;
    timeZone: string;
    setTimeZone: (timeZone: string) => void;
    t: (key: TranslationKeys) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState('CLP');
    const [showDecimals, setShowDecimalsState] = useState(true); 
    const [language, setLanguageState] = useState<Languages>('es');
    const [timeZone, setTimeZoneState] = useState('America/Santiago');

    const t = useCallback((key: TranslationKeys): string => {
        // En caso de que la traducción no exista en el idioma seleccionado, usa español como fallback.
        return translations[language]?.[key] || translations['es'][key];
    }, [language]);

    // Este useEffect se ejecuta una sola vez para cargar las configuraciones guardadas.
    useEffect(() => {
        const savedCurrency = localStorage.getItem('userCurrency');
        if (savedCurrency) setCurrencyState(savedCurrency);
        
        const savedShowDecimals = localStorage.getItem('userShowDecimals');
        if (savedShowDecimals) setShowDecimalsState(JSON.parse(savedShowDecimals));

        const savedLanguage = localStorage.getItem('userLanguage');
        if (savedLanguage) setLanguageState(savedLanguage as Languages);

        const savedTimeZone = localStorage.getItem('userTimeZone');
        if (savedTimeZone) setTimeZoneState(savedTimeZone);

    }, []);

    // --- FUNCIONES COMPLETAS Y CORREGIDAS ---
    // Cada función ahora actualiza el estado Y guarda en localStorage.

    const setCurrency = (newCurrency: string) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('userCurrency', newCurrency);
    };

    const setShowDecimals = (show: boolean) => {
        setShowDecimalsState(show);
        localStorage.setItem('userShowDecimals', JSON.stringify(show));
    };

    const setLanguage = (lang: Languages) => {
        setLanguageState(lang);
        localStorage.setItem('userLanguage', lang);
    };

    const setTimeZone = (tz: string) => {
        setTimeZoneState(tz);
        localStorage.setItem('userTimeZone', tz);
    };
    
    // El valor del contexto que se pasa a los componentes hijos.
    const value = useMemo(() => ({ 
        currency, 
        setCurrency, 
        showDecimals, 
        setShowDecimals,
        language, 
        setLanguage,
        timeZone, 
        setTimeZone,
        t
    }), [currency, showDecimals, language, timeZone, t]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

// Hook personalizado para usar el contexto fácilmente en otros componentes.
export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings debe ser usado dentro de un SettingsProvider');
    }
    return context;
}