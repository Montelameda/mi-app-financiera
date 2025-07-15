'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { format } from 'date-fns';
import { storage } from '@/firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';

interface Ingreso {
    id?: string;
    amount: number;
    category: string;
    accountId: string;
    description?: string;
    timestamp: any;
    receiptUrl?: string;
}
interface Cuenta { id: string; name: string; }
interface Categoria { id: string; name: string; emoji: string; }

interface AddIncomeModalProps {
    accounts: Cuenta[];
    incomeCategories: Categoria[];
    onClose: () => void;
    onSave: (income: Ingreso) => Promise<void>;
    incomeToEdit?: Ingreso | null;
}

export default function AddIncomeModal({ accounts, incomeCategories, onClose, onSave, incomeToEdit }: AddIncomeModalProps) {
    const { currency } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (incomeToEdit) {
            setAmount(incomeToEdit.amount);
            setCategory(incomeToEdit.category);
            setAccountId(incomeToEdit.accountId);
            setDescription(incomeToEdit.description || '');
            setDate(format(incomeToEdit.timestamp.toDate(), 'yyyy-MM-dd'));
            setImagePreview(incomeToEdit.receiptUrl || null);
        } else {
            if (accounts.length > 0) setAccountId(accounts[0].id);
            if (incomeCategories.length > 0) setCategory(`${incomeCategories[0].emoji} ${incomeCategories[0].name}`);
        }
    }, [incomeToEdit, accounts, incomeCategories]);

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
        let finalReceiptUrl = incomeToEdit?.receiptUrl || '';

        try {
            if (imageFile) {
                setIsUploading(true);
                const storageRef = ref(storage, `receipts/${Date.now()}-${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                finalReceiptUrl = await getDownloadURL(storageRef);
                setIsUploading(false);
            } else if (!imagePreview && incomeToEdit?.receiptUrl) {
                finalReceiptUrl = '';
                const oldImageRef = ref(storage, incomeToEdit.receiptUrl);
                await deleteObject(oldImageRef).catch(err => console.error("Error borrando imagen:", err));
            }

            const incomeData: Ingreso = {
                id: incomeToEdit?.id,
                amount: Number(amount),
                category: category,
                accountId: accountId,
                description: description.trim(),
                timestamp: new Date(date + "T12:00:00"),
                receiptUrl: finalReceiptUrl,
            };
            
            await onSave(incomeData);
            onClose();
        } catch (error) {
            console.error("Error al procesar el ingreso:", error);
            alert("No se pudo guardar el ingreso. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm overflow-y-auto max-h-[95vh]">
                <h2 className="text-xl font-bold text-center mb-4">{incomeToEdit ? 'Editar Ingreso' : 'Añadir Nuevo Ingreso'} 🤑</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-gray-400 mb-2">Monto ({currency})</label>
                        <input type="number" name="amount" id="amount" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 500000" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>
                     <div>
                        <label htmlFor="date" className="block text-gray-400 mb-2">Fecha</label>
                        <input type="date" name="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-gray-400 mb-2">Categoría de Ingreso</label>
                        {/* ✅ CORREGIDO: Se añade el mapeo de las categorías */}
                        <select name="category" id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required>
                            {incomeCategories.map(cat => (<option key={cat.id} value={`${cat.emoji} ${cat.name}`}>{cat.emoji} {cat.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-gray-400 mb-2">Descripción (Opcional)</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Pago de cliente X..." className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white h-20 resize-none"></textarea>
                    </div>
                     <div>
                        <label className="block text-gray-400 mb-2">Adjuntar Comprobante (Opcional)</label>
                        <div className="flex items-center gap-4">
                            <label htmlFor="receipt-upload-income" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg">Seleccionar Archivo</label>
                            <input id="receipt-upload-income" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </div>
                        {imagePreview && (
                             <div className="mt-4 relative w-full">
                                <Image src={imagePreview} alt="Vista previa" width={200} height={200} className="rounded-lg object-cover w-full h-auto max-h-48" />
                                <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 leading-none">&times;</button>
                             </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="accountId" className="block text-gray-400 mb-2">Añadir a la cuenta</label>
                        {/* ✅ CORREGIDO: Se añade el mapeo de las cuentas */}
                        <select name="accountId" id="accountId" value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white disabled:bg-gray-900" required disabled={!!incomeToEdit}>
                            {accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
                        </select>
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading || isUploading} className="w-full bg-green-500 hover:bg-green-600 font-bold py-3 rounded-lg disabled:bg-gray-500">
                             {isUploading ? 'Subiendo...' : isLoading ? 'Guardando...' : (incomeToEdit ? 'Guardar Cambios' : 'Guardar Ingreso')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}