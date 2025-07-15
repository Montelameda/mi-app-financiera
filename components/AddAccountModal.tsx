'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/firebase.config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import EmojiPicker from 'emoji-picker-react';
import Image from 'next/image';

// --- INTERFAZ ---
interface Cuenta {
    id: string;
    name: string;
    balance: number;
    emoji: string;
    imageUrl?: string;
    type: string;
    description?: string;
    position?: number;
    currency?: string;
    banco?: string;
    nombreTitular?: string;
    numeroCuenta?: string;
    tipoCuentaBanco?: string;
    rut?: string;
    email?: string;
    limiteCredito?: number;
    diaFacturacion?: number;
    diaPago?: number;
}

interface AddAccountModalProps {
    onClose: () => void;
    onSave: (account: any) => void;
    accountToEdit?: Cuenta | null;
    existingAccounts: Cuenta[];
    activeCurrency: string;
}

const accountTypes = ['Efectivo', 'Cuenta Corriente', 'Cuenta Vista', 'Ahorro', 'Tarjeta de Crédito', 'Billetera Digital'];
const bankAccountTypes = ['Cuenta Corriente', 'Cuenta Vista', 'Ahorro', 'Tarjeta de Crédito'];

export default function AddAccountModal({ onClose, onSave, accountToEdit, existingAccounts, activeCurrency }: AddAccountModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [balance, setBalance] = useState<number | ''>('');
    const [emoji, setEmoji] = useState('🏦');
    const [accountType, setAccountType] = useState(accountTypes[1]);
    const [description, setDescription] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAddingCustomType, setIsAddingCustomType] = useState(false);
    const [customAccountType, setCustomAccountType] = useState('');
    const [banco, setBanco] = useState('');
    const [nombreTitular, setNombreTitular] = useState('');
    const [numeroCuenta, setNumeroCuenta] = useState('');
    const [tipoCuentaBanco, setTipoCuentaBanco] = useState('');
    const [rut, setRut] = useState('');
    const [email, setEmail] = useState('');
    const [limiteCredito, setLimiteCredito] = useState<number | ''>('');
    const [diaFacturacion, setDiaFacturacion] = useState<number | ''>('');
    const [diaPago, setDiaPago] = useState<number | ''>('');

    useEffect(() => {
        if (accountToEdit) {
            setAccountName(accountToEdit.name);
            setBalance(accountToEdit.balance);
            setEmoji(accountToEdit.emoji);
            setImagePreview(accountToEdit.imageUrl || null);
            setDescription(accountToEdit.description || '');
            setBanco(accountToEdit.banco || '');
            setNombreTitular(accountToEdit.nombreTitular || '');
            setNumeroCuenta(accountToEdit.numeroCuenta || '');
            setTipoCuentaBanco(accountToEdit.tipoCuentaBanco || '');
            setRut(accountToEdit.rut || '');
            setEmail(accountToEdit.email || '');

            if (accountToEdit.type === 'Tarjeta de Crédito') {
                setLimiteCredito(accountToEdit.limiteCredito || '');
                setDiaFacturacion(accountToEdit.diaFacturacion || '');
                setDiaPago(accountToEdit.diaPago || '');
            }

            if (!accountTypes.includes(accountToEdit.type)) {
                setIsAddingCustomType(true);
                setCustomAccountType(accountToEdit.type);
                setAccountType('custom');
            } else {
                setAccountType(accountToEdit.type);
            }
        } else {
            setBalance('');
            if (bankAccountTypes.includes(accountTypes[1])) {
                setTipoCuentaBanco(accountTypes[1]);
            }
        }
    }, [accountToEdit]);

    useEffect(() => {
        if (bankAccountTypes.includes(accountType)) {
            setTipoCuentaBanco(accountType);
        }
    }, [accountType]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (!file) return;
        const MAX_SIZE_MB = 2;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            alert(`La imagen es demasiado grande. El límite es de ${MAX_SIZE_MB}MB.`);
            e.target.value = '';
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'custom') {
            setIsAddingCustomType(true);
        } else {
            setIsAddingCustomType(false);
            setCustomAccountType('');
        }
        setAccountType(value);
    };

    const handleSaveAccount = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        const finalAccountType = isAddingCustomType ? customAccountType.trim() : accountType;

        if (finalAccountType === 'Tarjeta de Crédito') {
            const limiteNum = Number(limiteCredito);
            if (!limiteCredito || isNaN(limiteNum) || limiteNum <= 0) {
                alert("Debes especificar un 'Límite de Crédito' válido y mayor a cero.");
                setIsLoading(false);
                return;
            }

            const facturacionNum = Number(diaFacturacion);
            if (diaFacturacion !== '' && (facturacionNum < 1 || facturacionNum > 31)) {
                alert("El 'Día de Facturación' debe ser un número entre 1 y 31.");
                setIsLoading(false);
                return;
            }

            const pagoNum = Number(diaPago);
            if (diaPago !== '' && (pagoNum < 1 || pagoNum > 31)) {
                alert("El 'Día de Pago' debe ser un número entre 1 y 31.");
                setIsLoading(false);
                return;
            }
        }

        const trimmedName = accountName.trim();
        const isDuplicate = existingAccounts.some(
            (acc) =>
                acc.name.toLowerCase() === trimmedName.toLowerCase() &&
                acc.type.toLowerCase() === finalAccountType.toLowerCase() &&
                acc.id !== accountToEdit?.id
        );

        if (isDuplicate) {
            alert(`Ya existe una cuenta llamada "${trimmedName}" con el tipo "${finalAccountType}".`);
            setIsLoading(false);
            return;
        }
        
        if (!finalAccountType) {
            alert("Por favor, especifica un tipo de cuenta.");
            setIsLoading(false);
            return;
        }

        try {
            let finalImageUrl = imagePreview || '';
            if (imageFile) {
                if (accountToEdit && accountToEdit.imageUrl && accountToEdit.imageUrl !== imagePreview) {
                    const oldImageRef = ref(storage, accountToEdit.imageUrl);
                    await deleteObject(oldImageRef).catch(err => console.error("No se pudo borrar la imagen antigua:", err));
                }
                const storageRef = ref(storage, `account-logos/${Date.now()}-${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                finalImageUrl = await getDownloadURL(storageRef);
            }
            else if (accountToEdit && accountToEdit.imageUrl && !imagePreview) {
                const oldImageRef = ref(storage, accountToEdit.imageUrl);
                await deleteObject(oldImageRef).catch(err => console.error("No se pudo borrar la imagen antigua:", err));
                finalImageUrl = '';
            }

            // --- VALIDACIÓN DE SALDO / GASTO OBLIGATORIO ---
            const numericBalance = parseFloat(String(balance));
            if (String(balance).trim() === '' || isNaN(numericBalance)) {
                alert("Debes introducir un valor para el Saldo / Dinero Gastado. Si es una tarjeta sin uso, ingresa 0.");
                setIsLoading(false);
                return;
            }
            // --- FIN VALIDACIÓN ---

            if (numericBalance < 0 && finalAccountType !== 'Tarjeta de Crédito') {
                alert("El saldo inicial no puede ser negativo para este tipo de cuenta.");
                setIsLoading(false);
                return;
            }

            const accountData: any = {
                name: trimmedName,
                emoji: emoji,
                imageUrl: finalImageUrl,
                type: finalAccountType,
                balance: numericBalance,
                description: description.trim() || null,
                currency: activeCurrency,
            };

            if (finalAccountType === 'Tarjeta de Crédito') {
                accountData.limiteCredito = Number(limiteCredito) || null;
                accountData.diaFacturacion = Number(diaFacturacion) || null;
                accountData.diaPago = Number(diaPago) || null;
            } else {
                accountData.banco = banco.trim() || null;
                accountData.nombreTitular = nombreTitular.trim() || null;
                accountData.numeroCuenta = numeroCuenta.trim() || null;
                accountData.tipoCuentaBanco = tipoCuentaBanco.trim() || null;
                accountData.rut = rut.trim() || null;
                accountData.email = email.trim() || null;
            }
            
            Object.keys(accountData).forEach(key => {
                if (accountData[key] === null || accountData[key] === '') {
                    delete accountData[key];
                }
            });

            if (accountToEdit) {
                const accountRef = doc(db, 'accounts', accountToEdit.id);
                await updateDoc(accountRef, accountData);
                onSave({ ...accountToEdit, ...accountData });
            } else {
                const newAccount = { 
                    ...accountData, 
                    createdAt: new Date(),
                    position: existingAccounts.length
                };
                const docRef = await addDoc(collection(db, "accounts"), newAccount);
                onSave({ id: docRef.id, ...newAccount });
            }
            onClose();
        } catch (error) { console.error("Error:", error); alert("No se pudo guardar.");
        } finally { setIsLoading(false); }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
                <h2 className="text-xl font-bold text-center mb-4">{accountToEdit ? 'Editar Cuenta' : 'Añadir Nueva Cuenta'}</h2>
                <form onSubmit={handleSaveAccount} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 mb-2">Ícono (Emoji)</label>
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-4xl bg-gray-700 p-2 rounded-lg">{emoji}</button>
                            {showEmojiPicker && ( <div className="absolute z-10 mt-2"><EmojiPicker onEmojiClick={(e) => {setEmoji(e.emoji); setShowEmojiPicker(false);}} theme="dark" /></div> )}
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2">O sube un Logo</label>
                            {imagePreview && ( <div className="flex items-center gap-4 mb-2"><Image src={imagePreview} alt="Vista previa" width={40} height={40} className="w-10 h-10 rounded-full object-cover" /><button type="button" onClick={handleRemoveImage} className="text-xs text-red-400 hover:underline">Quitar</button></div> )}
                            <div className="flex items-center gap-4">
                                <label htmlFor="logo-upload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg">Seleccionar</label>
                                <input id="logo-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="hidden"/>
                                {imageFile && <span className="text-sm text-gray-400 truncate">{imageFile.name}</span>}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="accountName" className="block text-gray-400 mb-2">Nombre de la Cuenta</label>
                        <input type="text" name="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ej: Tarjeta Santander, MACH" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="accountType" className="block text-gray-400 mb-2">Tipo de Cuenta (Categoría)</label>
                        <select id="accountType" value={accountType} onChange={handleTypeChange} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white">
                            {accountTypes.map(type => ( <option key={type} value={type}>{type}</option>))}
                            <option value="custom">Agregar nuevo...</option>
                        </select>
                    </div>
                    {isAddingCustomType && (
                        <div>
                            <label htmlFor="customAccountType" className="block text-gray-400 mb-2">Nombre del Nuevo Tipo</label>
                            <input type="text" id="customAccountType" value={customAccountType} onChange={(e) => setCustomAccountType(e.target.value)} placeholder="Ej: Inversiones Cripto" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required={isAddingCustomType}/>
                        </div>
                    )}
                    <div>
                        <label htmlFor="description" className="block text-gray-400 mb-2">Descripción (Opcional)</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Para gastos diarios, viajes..." className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white h-20 resize-none"></textarea>
                    </div>

                    <div>
                        <label htmlFor="balance" className="block text-gray-400 mb-2">
                            {accountType === 'Tarjeta de Crédito' ? `Dinero Gastado (${activeCurrency})` : `Saldo (${activeCurrency})`}
                        </label>
                        <input 
                            type="number" 
                            step="any" 
                            name="balance"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ej: 50000" 
                            className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" 
                            required 
                        />
                    </div>
                    
                    {accountType === 'Tarjeta de Crédito' && (
                         <div className="pt-4 border-t border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-300 mb-3">Detalles de la Tarjeta de Crédito</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Límite de Crédito</label>
                                    <input type="number" value={limiteCredito} onChange={(e) => setLimiteCredito(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 500000" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" required />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Día de Facturación</label>
                                    <input type="number" value={diaFacturacion} onChange={(e) => setDiaFacturacion(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1 - 31" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" min="1" max="31" />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Día de Pago</label>
                                    <input type="number" value={diaPago} onChange={(e) => setDiaPago(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1 - 31" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" min="1" max="31" />
                                </div>
                            </div>
                        </div>
                    )}

                    {accountType !== 'Tarjeta de Crédito' && (
                        <div className="pt-4 border-t border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-300 mb-3">Datos para Compartir (Opcional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Nombre del Banco</label>
                                    <input type="text" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ej: Banco Falabella" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Nombre del Titular</label>
                                    <input type="text" value={nombreTitular} onChange={(e) => setNombreTitular(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">RUT del Titular</label>
                                    <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej: 12.345.678-9" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                                </div>
                                    <div>
                                    <label className="block text-gray-400 text-sm mb-1">Email de Contacto</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@correo.com" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Tipo de Cuenta (Banco)</label>
                                    <input type="text" value={tipoCuentaBanco} onChange={(e) => setTipoCuentaBanco(e.target.value)} placeholder="Ej: Cuenta Corriente" className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Número de Cuenta</label>
                                    <input type="text" value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg disabled:bg-gray-500">{isLoading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}