'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { format } from 'date-fns';
// ✅ AÑADIDO: Se importan las funciones de Storage y la configuración
import { storage } from '@/firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image'; // Para la vista previa

// ✅ MODIFICADO: Se añade 'receiptUrl' a la interfaz
interface Gasto {
    id?: string;
    amount: number;
    category: string;
    accountId: string;
    description?: string;
    timestamp: any;
    receiptUrl?: string; // URL del comprobante
}
interface Cuenta { id: string; name: string; }
interface Categoria { id?: string; name:string; emoji: string; }

interface AddExpenseModalProps {
    accounts: Cuenta[];
    categories: Categoria[];
    onClose: () => void;
    onSave: (expense: Gasto) => Promise<void>;
    expenseToEdit?: Gasto | null;
}

export default function AddExpenseModal({ accounts, categories, onClose, onSave, expenseToEdit }: AddExpenseModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // ✅ AÑADIDO: Estados para manejar la imagen
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (expenseToEdit) {
            setAmount(expenseToEdit.amount);
            setCategory(expenseToEdit.category);
            setAccountId(expenseToEdit.accountId);
            setDescription(expenseToEdit.description || '');
            setDate(format(expenseToEdit.timestamp.toDate(), 'yyyy-MM-dd'));
            setImagePreview(expenseToEdit.receiptUrl || null);
        } else {
            if (accounts.length > 0) setAccountId(accounts[0].id);
            if (categories.length > 0) setCategory(`${categories[0].emoji} ${categories[0].name}`);
        }
    }, [expenseToEdit, accounts, categories]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        let finalReceiptUrl = expenseToEdit?.receiptUrl || '';

        try {
            if (imageFile) { // Si hay un archivo nuevo para subir
                setIsUploading(true);
                const storageRef = ref(storage, `receipts/${Date.now()}-${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                finalReceiptUrl = await getDownloadURL(storageRef);
                setIsUploading(false);
            } else if (!imagePreview && expenseToEdit?.receiptUrl) { // Si se quitó una imagen existente
                finalReceiptUrl = '';
                // Opcional: Borrar el archivo viejo de Firebase Storage
                const oldImageRef = ref(storage, expenseToEdit.receiptUrl);
                await deleteObject(oldImageRef).catch(err => console.error("La imagen antigua no se pudo borrar, puede que ya no exista:", err));
            }

            const expenseData: Gasto = {
                id: expenseToEdit?.id,
                amount: Number(amount),
                category: category,
                accountId: accountId,
                description: description.trim(),
                timestamp: new Date(date + "T12:00:00"),
                receiptUrl: finalReceiptUrl,
            };
            
            await onSave(expenseData);
            onClose();

        } catch (error) {
            console.error("Error al procesar el gasto:", error);
            alert("No se pudo guardar el gasto. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm overflow-y-auto max-h-[95vh]">
                <h2 className="text-xl font-bold text-center mb-4">{expenseToEdit ? 'Editar Gasto' : 'Añadir Nuevo Gasto'} 💸</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ... campos de monto, fecha, categoría, descripción ... */}
                     <div>
                        <label htmlFor="amount" className="block text-gray-400 mb-2">Monto ({currency})</label>
                        <input type="number" name="amount" id="amount" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 10000" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-gray-400 mb-2">Fecha</label>
                        <input type="date" name="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-gray-400 mb-2">Categoría</label>
                        <select name="category" id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white">
                            {categories.map(cat => (<option key={cat.id} value={`${cat.emoji} ${cat.name}`}>{cat.emoji} {cat.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-gray-400 mb-2">Descripción (Opcional)</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Café con amigos, regalo..." className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white h-20 resize-none"></textarea>
                    </div>
                    
                    {/* ✅ AÑADIDO: Interfaz para adjuntar comprobante */}
                    <div>
                        <label className="block text-gray-400 mb-2">Adjuntar Comprobante (Opcional)</label>
                        <div className="flex items-center gap-4">
                            <label htmlFor="receipt-upload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg">Seleccionar Archivo</label>
                            <input id="receipt-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </div>
                        {imagePreview && (
                             <div className="mt-4 relative w-full">
                                <Image src={imagePreview} alt="Vista previa" width={200} height={200} className="rounded-lg object-cover w-full h-auto max-h-48" />
                                <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 leading-none">&times;</button>
                             </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="accountId" className="block text-gray-400 mb-2">Pagar desde la cuenta</label>
                        <select name="accountId" id="accountId" value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white disabled:bg-gray-900" required disabled={!!expenseToEdit}>
                            {accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                        </select>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading || isUploading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg disabled:bg-gray-500">
                            {isUploading ? 'Subiendo...' : isLoading ? 'Guardando...' : (expenseToEdit ? 'Guardar Cambios' : 'Guardar Gasto')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}