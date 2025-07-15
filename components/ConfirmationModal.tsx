'use client';

import { Fragment } from 'react';

// --- ICONO DE ADVERTENCIA ---
const ExclamationTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-400">
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
);


interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    // ✅ AÑADIDO: Nueva prop para controlar si el botón está deshabilitado
    isConfirmDisabled?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isLoading = false,
    // ✅ AÑADIDO: Se recibe la nueva prop con un valor por defecto
    isConfirmDisabled = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-700">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <h3 className="text-xl font-semibold leading-6 text-white" id="modal-title">
                            {title}
                        </h3>
                        <div className="mt-2">
                            {/* Se cambia <p> por <div> para aceptar componentes más complejos en el mensaje */}
                            <div className="text-sm text-gray-400">
                                {message}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        onClick={onConfirm}
                        // ✅ MODIFICADO: El botón ahora se deshabilita por dos motivos: si está cargando O si la nueva prop es verdadera
                        disabled={isLoading || isConfirmDisabled}
                        className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:bg-red-800 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Eliminando..." : confirmText}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-gray-600 sm:mt-0 sm:w-auto"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}