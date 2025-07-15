'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase.config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import EmojiPicker from 'emoji-picker-react';

// --- INTERFACES ---
interface Categoria {
	id: string;
	name: string;
	emoji: string;
	parentId?: string | null;
	position?: number;
	status?: 'active' | 'deleted';
}

interface AddCategoryModalProps {
	// ✅ MODIFICADO: Se añade el tipo 'savings'
	type: 'expense' | 'income' | 'savings';
	onClose: () => void;
	onSave: (newCategory: any) => void;
	categoryToEdit?: Categoria | null;
	existingCategories: Categoria[];
	preselectedParentId?: string | null;
}

export default function AddCategoryModal({ type, onClose, onSave, categoryToEdit, existingCategories, preselectedParentId }: AddCategoryModalProps) {
	const [isLoading, setIsLoading] = useState(false);
	// ✅ MODIFICADO: Se añade un emoji por defecto para 'savings'
	const [emoji, setEmoji] = useState(
		type === 'expense' ? '🍔' : type === 'income' ? '💰' : '🏆'
	);
	const [name, setName] = useState('');
	const [parentId, setParentId] = useState<string | null>(null);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);

	useEffect(() => {
		if (categoryToEdit) {
			setName(categoryToEdit.name);
			setEmoji(categoryToEdit.emoji);
			setParentId(categoryToEdit.parentId || null);
		} else {
			setName('');
			// ✅ MODIFICADO: Se actualiza la lógica del emoji aquí también
			setEmoji(
				type === 'expense' ? '🍔' : type === 'income' ? '💰' : '🏆'
			);
			setParentId(preselectedParentId || null);
		}
	}, [categoryToEdit, preselectedParentId, type]);

	const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) {
			alert("El nombre de la categoría no puede estar vacío.");
			return;
		}
		setIsLoading(true);

		// ✅ MODIFICADO: Lógica para seleccionar la colección correcta en Firebase
		const collectionName =
			type === 'expense' ? 'categories'
			: type === 'income' ? 'incomeCategories'
			: 'savingsCategories';

		const isDuplicate = existingCategories.some(cat =>
			cat.id !== categoryToEdit?.id &&
			cat.name.toLowerCase() === trimmedName.toLowerCase() &&
			(cat.parentId || null) === (parentId || null)
		);

		if (isDuplicate) {
			const parentName = parentId ? existingCategories.find(c => c.id === parentId)?.name : "la lista principal";
			alert(`Ya existe una categoría llamada "${trimmedName}" dentro de "${parentName}".`);
			setIsLoading(false);
			return;
		}

		if (parentId) {
			const parentCategory = existingCategories.find(c => c.id === parentId);
			if (parentCategory && parentCategory.name.toLowerCase() === trimmedName.toLowerCase()) {
				alert(`Una sub-categoría no puede tener el mismo nombre que su categoría padre ("${parentCategory.name}").`);
				setIsLoading(false);
				return;
			}
		}

		try {
			const dataToSave = {
				name: trimmedName,
				emoji,
				parentId: parentId || null
			};

			if (categoryToEdit) {
				const categoryRef = doc(db, collectionName, categoryToEdit.id);
				await updateDoc(categoryRef, dataToSave);
				onSave({ ...categoryToEdit, ...dataToSave });
			} else {
				const newCategory = {
					...dataToSave,
					createdAt: new Date(),
					isArchived: false,
					position: existingCategories.length,
					status: 'active'
				};
				const docRef = await addDoc(collection(db, collectionName), newCategory);
				onSave({ id: docRef.id, ...newCategory });
			}
			onClose();
		} catch (error) {
			console.error("Error al guardar la categoría:", error);
			alert("No se pudo guardar la categoría.");
		} finally {
			setIsLoading(false);
		}
	};

	const possibleParents = existingCategories.filter(cat => cat.id !== categoryToEdit?.id && !cat.parentId);
	const parentCategoryInfo = preselectedParentId ? existingCategories.find(p => p.id === preselectedParentId) : null;

	return (
		<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
			<div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm relative">
				<h2 className="text-xl font-bold text-center mb-4">
					{categoryToEdit ? 'Editar Categoría' : (preselectedParentId ? 'Nueva Sub-categoría' : 'Nueva Categoría Principal')}
				</h2>
				<form onSubmit={handleSave} className="space-y-4">
					<div className="flex items-center gap-4">
						<div>
							<label className="block text-gray-400 mb-2">Emoji</label>
							<button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-4xl bg-gray-700 p-2 rounded-lg">{emoji}</button>
							{showEmojiPicker && (<div className="absolute z-10 mt-2"><EmojiPicker onEmojiClick={(e) => { setEmoji(e.emoji); setShowEmojiPicker(false); }} theme="dark" /></div>)}
						</div>
						<div className="flex-1">
							<label htmlFor="name" className="block text-gray-400 mb-2">Nombre</label>
							{/* ✅ MODIFICADO: Placeholder dinámico para el nombre */}
							<input type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'expense' ? 'Ej: Supermercado' : type === 'income' ? 'Ej: Sueldo' : 'Ej: Viaje a Japón'} className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white" required />
						</div>
					</div>

					{(() => {
						if (preselectedParentId && !categoryToEdit) {
							return (
								<div>
									<label className="block text-gray-400 mb-2">Sub-categoría de:</label>
									<div className="w-full bg-gray-900 rounded-lg p-3 text-gray-300 font-semibold">
										{parentCategoryInfo?.emoji} {parentCategoryInfo?.name}
									</div>
								</div>
							);
						}
						if (categoryToEdit) {
							return (
								<div>
									<label htmlFor="parentId" className="block text-gray-400 mb-2">Categoría Padre (Opcional)</label>
									<select
										id="parentId"
										value={parentId || ''}
										onChange={(e) => setParentId(e.target.value || null)}
										className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg p-3 text-white"
									>
										<option value="">-- Ninguna (Categoría Principal) --</option>
										{possibleParents.map(cat => (
											<option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
										))}
									</select>
								</div>
							);
						}
						return null;
					})()}

					<div className="flex gap-4 pt-4">
						<button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg">Cancelar</button>
						<button type="submit" disabled={isLoading} className="w-full bg-green-500 hover:bg-green-600 font-bold py-3 rounded-lg disabled:bg-gray-500">
							{isLoading ? 'Guardando...' : (categoryToEdit ? 'Guardar Cambios' : 'Crear')}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}