'use client';

import { useState, useEffect, useMemo } from 'react';
import { Montserrat } from 'next/font/google';
import { db, storage } from '@/firebase.config';
import { collection, getDocs, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage";
import AddAccountModal from '@/components/AddAccountModal';
import ConfirmationModal from '@/components/ConfirmationModal'; // <-- 1. IMPORTAMOS EL MODAL
import Image from 'next/image';
import { useSettings } from '@/context/SettingsContext'; 

// IMPORTS PARA DRAG AND DROP
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const montserrat = Montserrat({ subsets: ['latin'] });

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
    createdAt?: any;
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

// ÍCONOS
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.006a.75.75 0 01-.749.654H5.88a.75.75 0 01-.749-.654L4.125 6.67a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.9h1.368c1.603 0 2.816 1.336 2.816 2.9zM5.25 6.75L6.08 18.75h11.84L18.75 6.75H5.25z" clipRule="evenodd" /></svg> );
const PencilIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" /><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" /></svg>);
const CopyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 3.5A1.5 1.5 0 018.5 2h5.25a.75.75 0 010 1.5H8.5A.5.5 0 008 4v10.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V8.75a.75.75 0 011.5 0V14.5a2 2 0 01-2 2h-7a2 2 0 01-2-2V4a2 2 0 012-1.5z" /><path d="M10.5 2a.75.75 0 00-.75.75v5.5a.75.75 0 00.75.75h5.5a.75.75 0 00.75-.75V2.75a.75.75 0 00-.75-.75h-5.5z" /></svg>);
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const EyeSlashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243l-4.243-4.243" /></svg>);
const BookmarkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400"><path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.372a.75.75 0 01-.53-.22L10 12.94l-1.848 1.848a.75.75 0 01-.53.22H4.25A2.25 2.25 0 012 12.75v-8.5z" clipRule="evenodd" /></svg>);
const DragHandleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>);
const AlertIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>);


// COMPONENTE PARA CADA TARJETA DE CUENTA
function SortableAccountItem({ account, selected, onSelectionChange, actions, details }: { account: Cuenta, selected: boolean, onSelectionChange: (id: string) => void, actions: React.ReactNode, details: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: account.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div className={`p-4 rounded-lg flex flex-col group transition-all duration-300 ${selected ? 'bg-blue-900/50 ring-2 ring-blue-500' : 'bg-gray-700/50'}`}>
                <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500/50 rounded cursor-pointer"
                            checked={selected}
                            onChange={() => onSelectionChange(account.id)}
                        />
                        <div {...listeners} className="cursor-grab p-2 text-gray-500 touch-none">
                           <DragHandleIcon />
                        </div>
                        <div className="flex items-center gap-4 min-w-0">
                            {account.imageUrl ? <Image src={account.imageUrl} alt={account.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" /> : <span className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-600 rounded-full">{account.emoji || '🏦'}</span>}
                            <div className="min-w-0">
                                <p className="font-bold text-lg truncate">{account.name}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs text-gray-400 bg-gray-600 px-2 py-0.5 rounded-full inline-block">
                                        {account.type || 'General'}
                                    </span>
                                    {account.description && (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-gray-900/50 ring-1 ring-inset ring-gray-500/20 px-2 py-0.5 rounded-full">
                                            <BookmarkIcon />
                                            {account.description}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {actions}
                </div>
                {details}
            </div>
        </div>
    );
}

// PÁGINA PRINCIPAL
export default function AccountsPage() {
    const { currency, showDecimals, t } = useSettings(); 
    
    const [accounts, setAccounts] = useState<Cuenta[]>([]);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Cuenta | null>(null);
    const [visibleDetails, setVisibleDetails] = useState<string | null>(null);
    const [isSensitiveDataVisible, setIsSensitiveDataVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterBank, setFilterBank] = useState('all');
    const [sortBy, setSortBy] = useState('position');
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

    // --- 2. NUEVOS ESTADOS PARA EL MODAL DE CONFIRMACIÓN ---
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<Cuenta | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    const formatCurrency = (amount: number) => {
        const options: Intl.NumberFormatOptions = {
            style: 'currency', 
            currency: currency,
            currencyDisplay: 'code'
        };
        if (showDecimals) {
            options.minimumFractionDigits = 2;
            options.maximumFractionDigits = 2;
        } else {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        }
        return new Intl.NumberFormat('es-CL', options).format(amount);
    };

    useEffect(() => {
        const fetchAndMigrateAccounts = async () => {
            const accountsCollection = collection(db, 'accounts');
            const q = query(accountsCollection, orderBy("position"));
            const accountsSnapshot = await getDocs(q);
            let accountsList = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cuenta));
            
            const needsMigration = accountsList.some(acc => typeof acc.position !== 'number');
            if (needsMigration) {
                const batch = writeBatch(db);
                let maxPosition = accountsList.reduce((max, acc) => (acc.position && acc.position > max ? acc.position : max), -1);
                accountsList.forEach((account) => {
                    if (typeof account.position !== 'number') {
                        maxPosition++;
                        const accountRef = doc(db, "accounts", account.id);
                        batch.update(accountRef, { position: maxPosition });
                        account.position = maxPosition; 
                    }
                });
                await batch.commit();
                accountsList.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            }
            setAccounts(accountsList);
        };
        fetchAndMigrateAccounts();
    }, []);
    
    const displayedAccounts = useMemo(() => {
        let processedAccounts = [...accounts];
        if (searchTerm) {
            processedAccounts = processedAccounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (filterType !== 'all') {
            processedAccounts = processedAccounts.filter(acc => acc.type === filterType);
        }
        if (filterBank !== 'all') {
            processedAccounts = processedAccounts.filter(acc => acc.banco === filterBank);
        }
        if (sortBy === 'balance') {
            processedAccounts.sort((a, b) => {
                 const balanceA = a.type === 'Tarjeta de Crédito' ? (a.limiteCredito || 0) - a.balance : a.balance;
                 const balanceB = b.type === 'Tarjeta de Crédito' ? (b.limiteCredito || 0) - b.balance : b.balance;
                 return balanceB - balanceA;
            });
        } else if (sortBy === 'type') {
            processedAccounts.sort((a, b) => a.type.localeCompare(b.type));
        } else {
             processedAccounts.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        }
        return processedAccounts;
    }, [accounts, searchTerm, filterType, filterBank, sortBy]);
    
    const totalAssets = useMemo(() => {
        return displayedAccounts
            .filter(acc => acc.type !== 'Tarjeta de Crédito')
            .reduce((sum, acc) => sum + acc.balance, 0);
    }, [displayedAccounts]);

    const totalAvailableCredit = useMemo(() => {
        return displayedAccounts
            .filter(acc => acc.type === 'Tarjeta de Crédito')
            .reduce((sum, acc) => sum + ((acc.limiteCredito || 0) - acc.balance), 0);
    }, [displayedAccounts]);
    
    const totalSelectedBalance = useMemo(() => {
        return selectedAccounts.reduce((sum, id) => {
            const account = accounts.find(acc => acc.id === id);
            if (!account) return sum;

            if (account.type === 'Tarjeta de Crédito') {
                return sum + ((account.limiteCredito || 0) - account.balance);
            }
            return sum + account.balance;
        }, 0);
    }, [selectedAccounts, accounts]);

    const selectedCreditCardsInfo = useMemo(() => {
        const creditCards = selectedAccounts
            .map(id => accounts.find(acc => acc.id === id))
            .filter((acc): acc is Cuenta => !!acc && acc.type === 'Tarjeta de Crédito');

        const totalDebt = creditCards.reduce((sum, acc) => sum + acc.balance, 0);
        
        return {
            count: creditCards.length,
            debt: totalDebt,
        };
    }, [selectedAccounts, accounts]);
    
    const uniqueAccountTypes = useMemo(() => [...new Set(accounts.map(acc => acc.type).filter(Boolean))], [accounts]);
    const uniqueBankNames = useMemo(() => [...new Set(accounts.map(acc => acc.banco).filter(Boolean))], [accounts]) as string[];

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = accounts.findIndex((item) => item.id === active.id);
            const newIndex = accounts.findIndex((item) => item.id === over.id);
            const newOrderedAccounts = arrayMove(accounts, oldIndex, newIndex);
            setAccounts(newOrderedAccounts);
            const batch = writeBatch(db);
            newOrderedAccounts.forEach((account, index) => {
                const accountRef = doc(db, "accounts", account.id);
                batch.update(accountRef, { position: index });
            });
            await batch.commit().catch(err => {
                console.error("Error al guardar el nuevo orden:", err);
            });
        }
    }

    const handleSelectionChange = (id: string) => {
        setSelectedAccounts(prev => 
            prev.includes(id) ? prev.filter(accId => accId !== id) : [...prev, id]
        );
    };

    // --- 3. SE REEMPLAZA handleDeleteAccount CON DOS NUEVAS FUNCIONES ---
    const handleRequestDelete = (account: Cuenta) => {
        setAccountToDelete(account);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!accountToDelete) return;

        setIsDeleting(true);
        try {
            // Lógica de borrado que estaba en la función original
            if (accountToDelete.imageUrl) {
                const imageRef = ref(storage, accountToDelete.imageUrl);
                await deleteObject(imageRef).catch(err => console.error("Error borrando imagen:", err));
            }
            await deleteDoc(doc(db, "accounts", accountToDelete.id));
            setAccounts(accounts.filter(acc => acc.id !== accountToDelete.id));
        } catch (error) { 
            console.error("Error al eliminar la cuenta:", error); 
            alert("No se pudo eliminar la cuenta."); 
        } finally {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setAccountToDelete(null);
        }
    };
    
    const handleOpenEditModal = (account: Cuenta) => {
        setEditingAccount(account);
        setIsAccountModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setEditingAccount(null);
        setIsAccountModalOpen(true);
    };

    const handleSaveAccount = (savedAccount: Cuenta) => {
        if (editingAccount) {
            setAccounts(accounts.map(acc => acc.id === savedAccount.id ? savedAccount : acc));
        } else {
            const newPosition = accounts.length > 0 ? Math.max(...accounts.map(acc => acc.position || 0)) + 1 : 0;
            setAccounts(prev => [...prev, {...savedAccount, position: newPosition}]);
        }
    };

    const handleCopyDetails = (account: Cuenta) => {
        let details = '';
        if (account.type === 'Tarjeta de Crédito') {
            details = `Tarjeta de Crédito: ${account.name}
Límite: ${account.limiteCredito ? formatCurrency(account.limiteCredito) : 'No especificado'}
Gastado: ${formatCurrency(account.balance)}
Disponible: ${account.limiteCredito ? formatCurrency(account.limiteCredito - account.balance) : 'No especificado'}
Día Facturación: ${account.diaFacturacion || 'No especificado'}
Día Pago: ${account.diaPago || 'No especificado'}`.trim();
        } else {
            details = `Banco: ${account.banco || 'No especificado'}
Titular: ${account.nombreTitular || 'No especificado'}
RUT: ${account.rut || 'No especificado'}
Email: ${account.email || 'No especificado'}
Tipo de Cuenta: ${account.tipoCuentaBanco || 'No especificado'}
Número de Cuenta: ${account.numeroCuenta || 'No especificado'}`.trim();
        }
        
        navigator.clipboard.writeText(details)
            .then(() => alert('¡Datos copiados al portapapeles!'))
            .catch(err => alert('Error al copiar los datos.'));
    };
    
    const toggleDetails = (accountId: string) => {
        const isOpeningANewCard = visibleDetails !== accountId;
        setVisibleDetails(isOpeningANewCard ? accountId : null);
        
        if (isOpeningANewCard) {
            setIsSensitiveDataVisible(false);
        }
    };
    
    const toggleAllSensitiveData = () => {
        setIsSensitiveDataVisible(prev => !prev);
    };
    
    return (
        <div className={`${montserrat.className} text-white`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('accounts_title')}</h1>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"><PlusIcon />{t('add_account_button')}</button>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-400">Total en Cuentas</p>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(totalAssets)}</p>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-400">Crédito Disponible (Tarjetas)</p>
                        <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalAvailableCredit)}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center transition-all duration-300 ${selectedAccounts.length > 0 ? 'bg-blue-900/50' : 'bg-gray-900/50 opacity-50'}`}>
                        <p className="text-sm text-gray-400">Total Seleccionado ({selectedAccounts.length})</p>
                        <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalSelectedBalance)}</p>
                    </div>
                </div>

                {selectedCreditCardsInfo.count > 0 && (
                    <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-300 px-4 py-2 rounded-lg flex items-center gap-3 text-sm animate-fade-in">
                        <AlertIcon />
                        <span>
                            Has seleccionado <strong>{selectedCreditCardsInfo.count} {selectedCreditCardsInfo.count > 1 ? 'tarjetas' : 'tarjeta'}</strong>. La deuda total de esta selección es de <strong className="font-bold">{formatCurrency(selectedCreditCardsInfo.debt)}</strong>.
                        </span>
                    </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-1">{t('search_by_name_label')}</label>
                        <input type="text" id="search" placeholder={t('search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                         <label htmlFor="filterType" className="block text-sm font-medium text-gray-300 mb-1">{t('filter_by_type_label')}</label>
                         <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" >
                            <option value="all">{t('all_types_option')}</option>
                            {uniqueAccountTypes.map(type => <option key={type} value={type}>{type}</option>)}
                         </select>
                    </div>
                    <div>
                         <label htmlFor="filterBank" className="block text-sm font-medium text-gray-300 mb-1">{t('filter_by_bank_label')}</label>
                         <select id="filterBank" value={filterBank} onChange={(e) => setFilterBank(e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-2.5 text-white" >
                            <option value="all">{t('all_banks_option')}</option>
                            {uniqueBankNames.map(banco => <option key={banco} value={banco}>{banco}</option>)}
                         </select>
                    </div>
                </div>
                 <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                    <span className="text-sm font-medium text-gray-300">{t('sort_by_label')}</span>
                     <button onClick={() => setSortBy('position')} className={`px-3 py-1 text-sm rounded-full ${sortBy === 'position' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>{t('sort_by_custom')}</button>
                     <button onClick={() => setSortBy('balance')} className={`px-3 py-1 text-sm rounded-full ${sortBy === 'balance' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>{t('sort_by_balance')}</button>
                     <button onClick={() => setSortBy('type')} className={`px-3 py-1 text-sm rounded-full ${sortBy === 'type' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>{t('sort_by_type')}</button>
                </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">{t('your_accounts_header')} ({displayedAccounts.length})</h2>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={accounts.map(a => a.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                            {displayedAccounts.map((account) => {
                                const hasShareableData = account.type !== 'Tarjeta de Crédito' && (account.banco || account.nombreTitular || account.numeroCuenta || account.rut || account.email);
                                const isCreditCard = account.type === 'Tarjeta de Crédito';
                                const isVisible = visibleDetails === account.id;

                                let displayBalance = account.balance;
                                let balanceColorClass = 'text-white';

                                if (isCreditCard) {
                                    displayBalance = (account.limiteCredito || 0) - account.balance;
                                    balanceColorClass = 'text-green-400';
                                } else if (account.balance < 0) {
                                    balanceColorClass = 'text-red-400';
                                }

                                // --- CÁLCULO PARA LA BARRA DE PROGRESO ---
                                const usagePercentage = isCreditCard && account.limiteCredito
                                    ? (account.balance / account.limiteCredito) * 100
                                    : 0;

                                return (
                                    <SortableAccountItem 
                                        key={account.id} 
                                        account={account}
                                        selected={selectedAccounts.includes(account.id)}
                                        onSelectionChange={handleSelectionChange}
                                        actions={
                                            <div className="flex items-center gap-4 pl-4">
                                                <span className={`font-semibold text-xl ${balanceColorClass}`}>
                                                    {formatCurrency(displayBalance)}
                                                </span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenEditModal(account)} className="p-2 text-gray-500 hover:text-white"><PencilIcon /></button>
                                                    {/* --- 4. CONECTAR EL BOTÓN A LA NUEVA FUNCIÓN --- */}
                                                    <button onClick={() => handleRequestDelete(account)} className="p-2 text-gray-500 hover:text-red-500"><TrashIcon /></button>
                                                </div>
                                            </div>
                                        }
                                        details={
                                            (hasShareableData || isCreditCard) && (
                                                <div className="mt-4 pt-4 border-t border-gray-600/50">
                                                    <button onClick={() => toggleDetails(account.id)} className="text-sm font-semibold text-blue-400 hover:text-blue-300 w-full text-left flex justify-between items-center">
                                                        <span>{isVisible ? 'Ocultar Detalles' : 'Mostrar Detalles'}</span>
                                                        <svg className={`w-5 h-5 transition-transform ${isVisible ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </button>
                                                    {isVisible && (
                                                        <div className="mt-4 space-y-4 text-sm animate-fade-in">
                                                            {isCreditCard ? (
                                                                <div>
                                                                    {/* --- NUEVA BARRA DE PROGRESO --- */}
                                                                    <div className="w-full bg-gray-600 rounded-full h-2.5 mb-2 overflow-hidden">
                                                                        <div 
                                                                            className="bg-red-500 h-2.5" 
                                                                            style={{ width: `${usagePercentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                                                        <div><strong>Límite de Crédito:</strong> {account.limiteCredito ? formatCurrency(account.limiteCredito) : '-'}</div>
                                                                        <div className="font-semibold"><strong className="font-normal">Gastado:</strong> <span className="text-red-400">{formatCurrency(account.balance)}</span></div>
                                                                        <div className="font-semibold"><strong className="font-normal">Disponible:</strong> <span className="text-green-400">{account.limiteCredito ? formatCurrency(displayBalance) : '-'}</span></div>
                                                                        <div><strong>Día de Facturación:</strong> {account.diaFacturacion || '-'}</div>
                                                                        <div><strong>Día de Pago:</strong> {account.diaPago || '-'}</div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                                                    <div><strong>Banco:</strong> {account.banco || '-'}</div>
                                                                    <div><strong>Titular:</strong> <span>{isSensitiveDataVisible ? account.nombreTitular : '*****************'}</span></div>
                                                                    <div><strong>Tipo Cuenta:</strong> {account.tipoCuentaBanco || '-'}</div>
                                                                    <div><strong>N° Cuenta:</strong> <span>{isSensitiveDataVisible ? account.numeroCuenta : `**** **** ${account.numeroCuenta?.slice(-4)}`}</span></div>
                                                                    <div><strong>RUT:</strong> <span>{isSensitiveDataVisible ? account.rut : '**.***.***-*'}</span></div>
                                                                    <div><strong>Email:</strong> <span>{isSensitiveDataVisible ? account.email : '*******@*****.**'}</span></div>
                                                                </div>
                                                            )}
                                                            <div className="pt-2 flex items-center gap-4">
                                                                <button onClick={() => handleCopyDetails(account)} className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg">
                                                                    <CopyIcon /> Copiar Datos
                                                                </button>
                                                                {!isCreditCard && (
                                                                    <button onClick={toggleAllSensitiveData} className="p-2 text-gray-400 hover:text-white rounded-full" title={isSensitiveDataVisible ? "Ocultar datos sensibles" : "Mostrar datos sensibles"}>
                                                                        {isSensitiveDataVisible ? <EyeSlashIcon /> : <EyeIcon />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
            {isAccountModalOpen && (
                <AddAccountModal
                    onClose={() => setIsAccountModalOpen(false)}
                    onSave={handleSaveAccount}
                    accountToEdit={editingAccount}
                    existingAccounts={accounts}
                    activeCurrency={currency}
                />
            )}

             {/* --- 5. RENDERIZAR EL MODAL DE CONFIRMACIÓN --- */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Cuenta"
                message={
                    <span>
                        ¿Seguro que quieres eliminar la cuenta <strong className="text-white">"{accountToDelete?.name}"</strong>? Esta acción es irreversible.
                    </span>
                }
                confirmText="Sí, Eliminar"
                isLoading={isDeleting}
            />
        </div>
    );
}