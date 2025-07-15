'use client';

import { useState, useEffect, useMemo } from 'react';
import { Montserrat } from 'next/font/google';
import { db } from '@/firebase.config';
import { collection, getDocs, query, doc, updateDoc, writeBatch } from 'firebase/firestore';
import AddCategoryModal from '@/components/AddCategoryModal';

// --- IMPORTACIONES PARA DRAG AND DROP ---
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

// --- INTERFACES ---
interface Categoria { id: string; name: string; emoji: string; createdAt?: any; isArchived?: boolean; parentId?: string | null; position?: number; status?: 'active' | 'deleted'; }
interface NestedCategoria extends Categoria { children: NestedCategoria[]; }

// --- ICONOS ---
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" /></svg>);
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" /><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" /></svg>);
const ArchiveBoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 2.25a.75.75 0 00-.75.75v11.25c0 .414.336.75.75.75h19.5a.75.75 0 00.75-.75V3a.75.75 0 00-.75-.75H2.25zM6.56 3.44a.75.75 0 00-1.12 0L3.75 5.25V4.5a.75.75 0 00-1.5 0v2.25c0 .414.336.75.75.75h2.25a.75.75 0 000-1.5H3.56l1.22-1.22a.75.75 0 000-1.06zM17.44 3.44a.75.75 0 011.12 0L20.25 5.25V4.5a.75.75 0 011.5 0v2.25c0 .414-.336.75-.75.75h-2.25a.75.75 0 010-1.5h1.69l-1.22-1.22a.75.75 0 010-1.06z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h19.5a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75H2.25z" /></svg>);
const ArrowUturnLeftIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.53 2.47a.75.75 0 010 1.06L4.81 8.25H15a6.75 6.75 0 010 13.5h-3a.75.75 0 010-1.5h3a5.25 5.25 0 100-10.5H4.81l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>);
const PlusCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" /></svg>);
const ChevronDownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>);
const DragHandleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500 hover:text-white transition-colors"><path d="M10 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.006a.75.75 0 01-.749.654H5.88a.75.75 0 01-.749-.654L4.125 6.67a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.9h1.368c1.603 0 2.816 1.336 2.816 2.9zM5.25 6.75L6.08 18.75h11.84L18.75 6.75H5.25z" clipRule="evenodd" /></svg>);

// --- COMPONENTE PARA UN ITEM ARRASTRABLE ---
function SortableCategoryItem({ category, onEdit, onArchive, onAddSubcategory, onToggleExpand, expandedCategories, children }: {
	category: NestedCategoria,
	onEdit: (cat: Categoria) => void,
	onArchive: (cat: Categoria) => void,
	onAddSubcategory: (parentId: string) => void,
	onToggleExpand: (id: string) => void,
	expandedCategories: string[],
	children: React.ReactNode
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: category.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const isExpanded = expandedCategories.includes(category.id);
	const hasChildren = category.children && category.children.length > 0;

	return (
		<div ref={setNodeRef} style={style}>
			<div className="bg-gray-700/50 p-2 rounded-lg flex items-center gap-1 group">
				<div {...attributes} {...listeners} className="p-2 cursor-grab touch-none">
					<DragHandleIcon />
				</div>

				<div
					className="flex items-center gap-2 flex-1 min-w-0"
					onClick={() => hasChildren && onToggleExpand(category.id)}
					style={{ cursor: hasChildren ? 'pointer' : 'default' }}
				>
					{hasChildren ? (
						<ChevronDownIcon className={`flex-shrink-0 w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
					) : (
						<div className="w-5 flex-shrink-0"></div>
					)}
					<span className="font-semibold truncate">{category.emoji} {category.name}</span>
				</div>
				<div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
					{!category.parentId && (
						<button onPointerDown={e => e.stopPropagation()} onClick={() => onAddSubcategory(category.id)} className="p-2 text-gray-400 hover:text-green-400" title="Añadir Sub-categoría"><PlusCircleIcon /></button>
					)}
					<button onPointerDown={e => e.stopPropagation()} onClick={() => onEdit(category)} className="p-2 text-gray-400 hover:text-white" title="Editar"><PencilIcon /></button>
					<button onPointerDown={e => e.stopPropagation()} onClick={() => onArchive(category)} className="p-2 text-gray-400 hover:text-yellow-500" title="Archivar"><ArchiveBoxIcon /></button>
				</div>
			</div>
			{isExpanded && hasChildren && (
				<div className="pl-8 mt-2 border-l-2 border-gray-700">
					{children}
				</div>
			)}
		</div>
	);
}

// --- COMPONENTE RECURSIVO PARA LISTAR ---
const CategoryList = ({ categories, ...props }: { categories: NestedCategoria[], [key: string]: any }) => {
	return (
		<div className="space-y-2">
			<SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
				{categories.map((cat) => (
					<SortableCategoryItem key={cat.id} category={cat} {...props}>
						<CategoryList categories={cat.children} {...props} />
					</SortableCategoryItem>
				))}
			</SortableContext>
		</div>
	);
};


export default function CategoriesPage() {
	const [allExpenseCategories, setAllExpenseCategories] = useState<Categoria[]>([]);
	const [allIncomeCategories, setAllIncomeCategories] = useState<Categoria[]>([]);
	// ✅ MODIFICADO: Nuevo estado para categorías de ahorro
	const [allSavingsCategories, setAllSavingsCategories] = useState<Categoria[]>([]);

	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	// ✅ MODIFICADO: Se actualiza el tipo para incluir 'savings'
	const [categoryTypeToAdd, setCategoryTypeToAdd] = useState<'expense' | 'income' | 'savings'>('expense');
	const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [preselectedParentId, setPreselectedParentId] = useState<string | null>(null);
	const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
	const [sortBy, setSortBy] = useState('position');

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const buildCategoryTree = (categories: Categoria[]): NestedCategoria[] => {
		const categoryMap = new Map<string, NestedCategoria>();
		const rootCategories: NestedCategoria[] = [];
		categories.forEach(cat => { categoryMap.set(cat.id, { ...cat, children: [] }); });
		categories.forEach(cat => {
			if (cat.parentId && categoryMap.has(cat.parentId)) {
				categoryMap.get(cat.parentId)!.children.push(categoryMap.get(cat.id)!);
			} else {
				rootCategories.push(categoryMap.get(cat.id)!);
			}
		});
		return rootCategories;
	};

	const getSortedCategories = (categories: Categoria[], sortType: string) => {
		const activeCategories = categories.filter(c => c.status !== 'deleted' && !c.isArchived);
		if (sortType === 'alphabetical') {
			return [...activeCategories].sort((a, b) => a.name.localeCompare(b.name));
		}
		return [...activeCategories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
	};

	useEffect(() => {
		const fetchAndMigrateCategories = async (collectionName: string, setCategories: React.Dispatch<React.SetStateAction<Categoria[]>>) => {
			const catCollection = collection(db, collectionName);
			const q = query(catCollection);
			const catSnapshot = await getDocs(q);
			let catList = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria));

			const needsMigration = catList.some(c => typeof c.position !== 'number');

			if (needsMigration) {
				console.log(`Migrando posiciones para la colección: ${collectionName}`);
				const batch = writeBatch(db);
				catList.sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0))
					.forEach((cat, index) => {
						if (typeof cat.position !== 'number') {
							const catRef = doc(db, collectionName, cat.id);
							batch.update(catRef, { position: index });
							cat.position = index;
						}
					});
				await batch.commit();
			}

			setCategories(catList);
		};

		fetchAndMigrateCategories('categories', setAllExpenseCategories);
		fetchAndMigrateCategories('incomeCategories', setAllIncomeCategories);
		// ✅ MODIFICADO: Se añade la llamada para la nueva colección de ahorros
		fetchAndMigrateCategories('savingsCategories', setAllSavingsCategories);
	}, []);

	const activeExpenseTree = useMemo(() => buildCategoryTree(getSortedCategories(allExpenseCategories, sortBy)), [allExpenseCategories, sortBy]);
	const archivedExpenseList = useMemo(() => allExpenseCategories.filter(c => c.isArchived && c.status !== 'deleted').sort((a, b) => a.name.localeCompare(b.name)), [allExpenseCategories]);

	const activeIncomeTree = useMemo(() => buildCategoryTree(getSortedCategories(allIncomeCategories, sortBy)), [allIncomeCategories, sortBy]);
	const archivedIncomeList = useMemo(() => allIncomeCategories.filter(c => c.isArchived && c.status !== 'deleted').sort((a, b) => a.name.localeCompare(b.name)), [allIncomeCategories]);

	// ✅ MODIFICADO: Se crean los memos para las categorías de ahorro
	const activeSavingsTree = useMemo(() => buildCategoryTree(getSortedCategories(allSavingsCategories, sortBy)), [allSavingsCategories, sortBy]);
	const archivedSavingsList = useMemo(() => allSavingsCategories.filter(c => c.isArchived && c.status !== 'deleted').sort((a, b) => a.name.localeCompare(b.name)), [allSavingsCategories]);


	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setSortBy('position');

			// ✅ MODIFICADO: Lógica para determinar el tipo de lista (expense, income, o savings)
			let listType: 'expense' | 'income' | 'savings';
			if (allExpenseCategories.some(c => c.id === active.id)) {
				listType = 'expense';
			} else if (allIncomeCategories.some(c => c.id === active.id)) {
				listType = 'income';
			} else {
				listType = 'savings';
			}

			const list = listType === 'expense' ? allExpenseCategories : listType === 'income' ? allIncomeCategories : allSavingsCategories;
			const setList = listType === 'expense' ? setAllExpenseCategories : listType === 'income' ? setAllIncomeCategories : setAllSavingsCategories;
			const collectionName = listType === 'expense' ? 'categories' : listType === 'income' ? 'incomeCategories' : 'savingsCategories';


			const oldIndex = list.findIndex(c => c.id === active.id);
			const newIndex = list.findIndex(c => c.id === over.id);

			if (oldIndex === -1 || newIndex === -1) return;

			const activeItem = list[oldIndex];
			const overItem = list[newIndex];

			if (activeItem.parentId !== overItem.parentId) {
				console.log("Movimiento entre diferentes niveles no permitido por ahora.");
				return;
			}

			const reorderedList = arrayMove(list, oldIndex, newIndex);

			const batch = writeBatch(db);
			reorderedList.forEach((category, index) => {
				const docRef = doc(db, collectionName, category.id);
				batch.update(docRef, { position: index });
			});

			await batch.commit();
			setList(reorderedList.map((item, index) => ({ ...item, position: index })));
		}
	}

	const handleToggleExpand = (categoryId: string) => {
		setExpandedCategories(prev =>
			prev.includes(categoryId)
				? prev.filter(id => id !== categoryId)
				: [...prev, categoryId]
		);
	};

	// ✅ MODIFICADO: Se actualiza el tipo para incluir 'savings'
	const handleOpenAddModal = (type: 'expense' | 'income' | 'savings') => {
		setEditingCategory(null);
		setPreselectedParentId(null);
		setCategoryTypeToAdd(type);
		setIsCategoryModalOpen(true);
	};

	// ✅ MODIFICADO: Se actualiza el tipo para incluir 'savings'
	const handleOpenAddSubcategoryModal = (parentId: string, type: 'expense' | 'income' | 'savings') => {
		setEditingCategory(null);
		setPreselectedParentId(parentId);
		setCategoryTypeToAdd(type);
		setIsCategoryModalOpen(true);
	};

	// ✅ MODIFICADO: Se actualiza el tipo para incluir 'savings'
	const handleOpenEditModal = (category: Categoria, type: 'expense' | 'income' | 'savings') => {
		setCategoryTypeToAdd(type);
		setEditingCategory(category);
		setPreselectedParentId(null);
		setIsCategoryModalOpen(true);
	};

	const handleSaveCategory = (savedCategory: Categoria) => {
		// ✅ MODIFICADO: Lógica para determinar qué estado actualizar
		const setList = categoryTypeToAdd === 'expense' ? setAllExpenseCategories : categoryTypeToAdd === 'income' ? setAllIncomeCategories : setAllSavingsCategories;
		if (editingCategory) {
			setList(prev => prev.map(c => c.id === savedCategory.id ? { ...c, ...savedCategory } : c));
		} else {
			setList(prev => [...prev, savedCategory]);
		}
	};

	// ✅ MODIFICADO: Se actualiza el tipo para incluir 'savings'
	const handleToggleArchive = async (category: Categoria, type: 'expense' | 'income' | 'savings', archive: boolean) => {
		const collectionName = type === 'expense' ? 'categories' : type === 'income' ? 'incomeCategories' : 'savingsCategories';
		const confirmationMessage = archive ? `¿Estás seguro de que quieres archivar la categoría "${category.name}"?` : `¿Quieres restaurar la categoría "${category.name}"?`;

		if (window.confirm(confirmationMessage)) {
			const categoryRef = doc(db, collectionName, category.id);
			await updateDoc(categoryRef, { isArchived: archive });

			const setList = type === 'expense' ? setAllExpenseCategories : type === 'income' ? setAllIncomeCategories : setAllSavingsCategories;
			setList(prev => prev.map(c => c.id === category.id ? { ...c, isArchived: archive } : c));
		}
	};

	// ✅ MODIFICADO: Se actualiza el tipo para incluir 'savings'
	const handleDeleteForever = async (category: Categoria, type: 'expense' | 'income' | 'savings') => {
		const collectionName = type === 'expense' ? 'categories' : type === 'income' ? 'incomeCategories' : 'savingsCategories';
		const confirmationMessage = `¡ADVERTENCIA! Estás a punto de eliminar "${category.name}" para siempre. Esta acción no se puede deshacer.\n\nLas transacciones pasadas asociadas a esta categoría se mostrarán como "(Eliminada)" en los informes.\n\n¿Estás seguro?`;

		if (window.confirm(confirmationMessage)) {
			const categoryRef = doc(db, collectionName, category.id);
			await updateDoc(categoryRef, { status: 'deleted' });

			const setList = type === 'expense' ? setAllExpenseCategories : type === 'income' ? setAllIncomeCategories : setAllSavingsCategories;
			setList(prev => prev.map(c => c.id === category.id ? { ...c, status: 'deleted' } : c));
		}
	};

	const handleCloseModal = () => {
		setIsCategoryModalOpen(false);
		setEditingCategory(null);
		setPreselectedParentId(null);
	};

	return (
		<div className={`${montserrat.className} text-white`}>
			<h1 className="text-3xl font-bold mb-6">Gestión de Categorías</h1>

			<div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-gray-300">Ordenar por:</span>
					<button onClick={() => setSortBy('position')} className={`px-3 py-1 text-sm rounded-full ${sortBy === 'position' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Personalizado</button>
					<button onClick={() => setSortBy('alphabetical')} className={`px-3 py-1 text-sm rounded-full ${sortBy === 'alphabetical' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Alfabético</button>
					<button className="px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-500 cursor-not-allowed" title="Próximamente">Más Usadas</button>
				</div>

				<label className="flex items-center cursor-pointer">
					<span className="mr-3 text-sm font-medium text-gray-300">Mostrar Archivadas</span>
					<div className="relative">
						<input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="sr-only peer" />
						<div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</div>
				</label>
			</div>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				{/* ✅ MODIFICADO: Se cambia el grid a 3 columnas para pantallas grandes */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{/* --- COLUMNA DE GASTOS --- */}
					<div className="bg-gray-800/50 rounded-xl p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold">Categorías de Gasto</h2>
							<button onClick={() => handleOpenAddModal('expense')} className="flex items-center gap-2 text-sm bg-red-500/20 text-red-300 font-semibold px-3 py-2 rounded-lg hover:bg-red-500/40">
								<PlusIcon />Añadir Principal
							</button>
						</div>
						<CategoryList
							categories={activeExpenseTree}
							onEdit={(cat) => handleOpenEditModal(cat, 'expense')}
							onArchive={(cat) => handleToggleArchive(cat, 'expense', true)}
							onAddSubcategory={(parentId) => handleOpenAddSubcategoryModal(parentId, 'expense')}
							expandedCategories={expandedCategories}
							onToggleExpand={handleToggleExpand}
						/>
						{showArchived && archivedExpenseList.length > 0 && (
							<div className="mt-6 pt-4 border-t border-gray-700">
								<h3 className="text-lg font-semibold text-gray-400 mb-3">Archivadas</h3>
								<div className="space-y-2">{archivedExpenseList.map((cat) => (
									<div key={cat.id} className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center group opacity-60">
										<span className="font-semibold">{cat.emoji} {cat.name}{cat.parentId ? ` (Sub-categoría)` : ''}</span>
										<div className="flex items-center opacity-0 group-hover:opacity-100">
											<button onClick={() => handleToggleArchive(cat, 'expense', false)} className="p-1 text-gray-400 hover:text-green-400" title="Restaurar"><ArrowUturnLeftIcon /></button>
											<button onClick={() => handleDeleteForever(cat, 'expense')} className="p-1 text-gray-400 hover:text-red-500" title="Eliminar Permanentemente"><TrashIcon /></button>
										</div>
									</div>
								))}</div>
							</div>
						)}
					</div>

					{/* --- COLUMNA DE INGRESOS --- */}
					<div className="bg-gray-800/50 rounded-xl p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold">Categorías de Ingreso</h2>
							<button onClick={() => handleOpenAddModal('income')} className="flex items-center gap-2 text-sm bg-green-500/20 text-green-300 font-semibold px-3 py-2 rounded-lg hover:bg-green-500/40">
								<PlusIcon />Añadir Principal
							</button>
						</div>
						<CategoryList
							categories={activeIncomeTree}
							onEdit={(cat) => handleOpenEditModal(cat, 'income')}
							onArchive={(cat) => handleToggleArchive(cat, 'income', true)}
							onAddSubcategory={(parentId) => handleOpenAddSubcategoryModal(parentId, 'income')}
							expandedCategories={expandedCategories}
							onToggleExpand={handleToggleExpand}
						/>
						{showArchived && archivedIncomeList.length > 0 && (
							<div className="mt-6 pt-4 border-t border-gray-700">
								<h3 className="text-lg font-semibold text-gray-400 mb-3">Archivadas</h3>
								<div className="space-y-2">{archivedIncomeList.map((cat) => (
									<div key={cat.id} className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center group opacity-60">
										<span className="font-semibold">{cat.emoji} {cat.name}{cat.parentId ? ` (Sub-categoría)` : ''}</span>
										<div className="flex items-center opacity-0 group-hover:opacity-100">
											<button onClick={() => handleToggleArchive(cat, 'income', false)} className="p-1 text-gray-400 hover:text-green-400" title="Restaurar"><ArrowUturnLeftIcon /></button>
											<button onClick={() => handleDeleteForever(cat, 'income')} className="p-1 text-gray-400 hover:text-red-500" title="Eliminar Permanentemente"><TrashIcon /></button>
										</div>
									</div>
								))}</div>
							</div>
						)}
					</div>

					{/* ✅ MODIFICADO: Nueva columna para categorías de Ahorro */}
					<div className="bg-gray-800/50 rounded-xl p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold">Categorías de Ahorro</h2>
							<button onClick={() => handleOpenAddModal('savings')} className="flex items-center gap-2 text-sm bg-teal-500/20 text-teal-300 font-semibold px-3 py-2 rounded-lg hover:bg-teal-500/40">
								<PlusIcon />Añadir Principal
							</button>
						</div>
						<CategoryList
							categories={activeSavingsTree}
							onEdit={(cat) => handleOpenEditModal(cat, 'savings')}
							onArchive={(cat) => handleToggleArchive(cat, 'savings', true)}
							onAddSubcategory={(parentId) => handleOpenAddSubcategoryModal(parentId, 'savings')}
							expandedCategories={expandedCategories}
							onToggleExpand={handleToggleExpand}
						/>
						{showArchived && archivedSavingsList.length > 0 && (
							<div className="mt-6 pt-4 border-t border-gray-700">
								<h3 className="text-lg font-semibold text-gray-400 mb-3">Archivadas</h3>
								<div className="space-y-2">{archivedSavingsList.map((cat) => (
									<div key={cat.id} className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center group opacity-60">
										<span className="font-semibold">{cat.emoji} {cat.name}{cat.parentId ? ` (Sub-categoría)` : ''}</span>
										<div className="flex items-center opacity-0 group-hover:opacity-100">
											<button onClick={() => handleToggleArchive(cat, 'savings', false)} className="p-1 text-gray-400 hover:text-green-400" title="Restaurar"><ArrowUturnLeftIcon /></button>
											<button onClick={() => handleDeleteForever(cat, 'savings')} className="p-1 text-gray-400 hover:text-red-500" title="Eliminar Permanentemente"><TrashIcon /></button>
										</div>
									</div>
								))}</div>
							</div>
						)}
					</div>
				</div>
			</DndContext>

			{isCategoryModalOpen && (
				<AddCategoryModal
					type={categoryTypeToAdd}
					onClose={handleCloseModal}
					onSave={handleSaveCategory}
					categoryToEdit={editingCategory}
					// ✅ MODIFICADO: Lógica para pasar las categorías correctas al modal
					existingCategories={
						categoryTypeToAdd === 'expense' ? allExpenseCategories.filter(c => c.status !== 'deleted')
						: categoryTypeToAdd === 'income' ? allIncomeCategories.filter(c => c.status !== 'deleted')
						: allSavingsCategories.filter(c => c.status !== 'deleted')
					}
					preselectedParentId={preselectedParentId}
				/>
			)}
		</div>
	);
}