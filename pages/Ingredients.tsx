import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Ingredient } from '../types';
import Modal from '../components/Modal';
import { PlusCircle, Edit, Trash2, PackagePlus, Search } from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';

const Ingredients: React.FC = () => {
    const { role } = useAuth();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddEditModalOpen, setAddEditModalOpen] = useState(false);
    const [isResupplyModalOpen, setResupplyModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    const canEdit = role?.permissions['/ingredients'] === 'editor';

    const fetchIngredients = useCallback(async () => {
        try {
            // No setLoading on refetch for smoother UX
            const data = await api.getIngredients();
            setIngredients(data);
            setError(null);
        } catch (err) {
            setError("Impossible de charger les ingrédients.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchIngredients();
    }, [fetchIngredients]);

    const filteredIngredients = useMemo(() =>
        ingredients.filter(ing =>
            ing.nom.toLowerCase().includes(searchTerm.toLowerCase())
        ), [ingredients, searchTerm]);

    const handleOpenModal = (mode: 'add' | 'edit' | 'resupply' | 'delete', ingredient: Ingredient | null = null) => {
        setSelectedIngredient(ingredient);
        if (mode === 'add' || mode === 'edit') {
            setModalMode(mode);
            setAddEditModalOpen(true);
        } else if (mode === 'resupply') {
            setResupplyModalOpen(true);
        } else if (mode === 'delete') {
            setDeleteModalOpen(true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mt-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un ingrédient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ui-input pl-10 sm:w-64"
                    />
                </div>
                {canEdit && (
                    <button onClick={() => handleOpenModal('add')} className="w-full md:w-auto ui-btn-primary">
                        <PlusCircle size={20} />
                        Ajouter un ingrédient
                    </button>
                )}
            </div>

            {loading ? <p className="text-gray-800">Chargement...</p> : error ? <p className="text-red-500">{error}</p> : (
                <div className="ui-card p-4 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b">
                            <tr>
                                <th className="p-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                                <th className="p-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Stock Actuel</th>
                                <th className="p-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Stock Minimum</th>
                                <th className="p-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Prix unitaire moyen</th>
                                {canEdit && <th className="p-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIngredients.map(ing => {
                                const isLowStock = ing.stock_actuel <= ing.stock_minimum;
                                return (
                                <tr key={ing.id} className={`border-b hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                                    <td className={`p-3 font-semibold ${isLowStock ? 'text-red-900' : 'text-gray-900'}`}>{ing.nom}</td>
                                    <td className={`p-3 font-bold ${isLowStock ? 'text-red-700' : 'text-gray-800'}`}>
                                        {ing.stock_actuel} {ing.unite}
                                    </td>
                                    <td className={`p-3 ${isLowStock ? 'text-red-800' : 'text-gray-700'}`}>
                                        {ing.stock_minimum} {ing.unite}
                                    </td>
                                     <td className={`p-3 ${isLowStock ? 'text-red-800' : 'text-gray-700'}`}>
                                        {formatCurrencyCOP(ing.prix_unitaire)}
                                    </td>
                                    {canEdit && (
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal('resupply', ing)} title="Réapprovisionner" className="p-2 text-green-600 hover:bg-green-100 rounded-full"><PackagePlus size={20} /></button>
                                                <button onClick={() => handleOpenModal('edit', ing)} title="Modifier" className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={20} /></button>
                                                <button onClick={() => handleOpenModal('delete', ing)} title="Supprimer" className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={20} /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* --- Modals --- */}
            {isAddEditModalOpen && canEdit && (
                <AddEditIngredientModal
                    isOpen={isAddEditModalOpen}
                    onClose={() => setAddEditModalOpen(false)}
                    onSuccess={fetchIngredients}
                    ingredient={selectedIngredient}
                    mode={modalMode}
                />
            )}
            {isResupplyModalOpen && canEdit && selectedIngredient && (
                <ResupplyModal
                    isOpen={isResupplyModalOpen}
                    onClose={() => setResupplyModalOpen(false)}
                    onSuccess={fetchIngredients}
                    ingredient={selectedIngredient}
                />
            )}
            {isDeleteModalOpen && canEdit && selectedIngredient && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onSuccess={fetchIngredients}
                    ingredient={selectedIngredient}
                />
            )}
        </div>
    );
};

// --- Modal Components ---

const AddEditIngredientModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; ingredient: Ingredient | null; mode: 'add' | 'edit' }> = ({ isOpen, onClose, onSuccess, ingredient, mode }) => {
    const [formData, setFormData] = useState({
        nom: ingredient?.nom || '',
        unite: ingredient?.unite || 'g',
        stock_minimum: ingredient?.stock_minimum || 0,
    });
    const [isSubmitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (mode === 'edit' && ingredient) {
                await api.updateIngredient(ingredient.id, formData);
            } else {
                await api.addIngredient(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to save ingredient", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Ajouter un Ingrédient' : 'Modifier l\'Ingrédient'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom</label>
                    <input type="text" id="nom" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required className="mt-1 ui-input"/>
                </div>
                <div>
                    <label htmlFor="unite" className="block text-sm font-medium text-gray-700">Unité</label>
                    <select id="unite" value={formData.unite} onChange={e => setFormData({...formData, unite: e.target.value as Ingredient['unite']})} required className="mt-1 ui-select">
                        <option value="g">Grammes (g)</option>
                        <option value="kg">Kilogrammes (kg)</option>
                        <option value="ml">Millilitres (ml)</option>
                        <option value="L">Litres (L)</option>
                        <option value="unite">Unité</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="stock_minimum" className="block text-sm font-medium text-gray-700">Stock Minimum</label>
                    <input type="number" id="stock_minimum" min="0" value={formData.stock_minimum} onChange={e => setFormData({...formData, stock_minimum: parseFloat(e.target.value)})} required className="mt-1 ui-input"/>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">Annuler</button>
                    <button type="submit" disabled={isSubmitting} className="w-full ui-btn-primary py-3 disabled:opacity-60">{isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                </div>
            </form>
        </Modal>
    );
};

const ResupplyModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; ingredient: Ingredient }> = ({ isOpen, onClose, onSuccess, ingredient }) => {
    const [quantity, setQuantity] = useState(0);
    const [unitPrice, setUnitPrice] = useState(0);
    const [isSubmitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity <= 0 || unitPrice < 0) return;
        setSubmitting(true);
        try {
            await api.resupplyIngredient(ingredient.id, quantity, unitPrice);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to resupply ingredient", error);
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Réapprovisionner: ${ingredient.nom}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantité Achetée ({ingredient.unite})</label>
                    <input type="number" id="quantity" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value))} required className="mt-1 ui-input"/>
                </div>
                <div>
                    <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">Prix par unité ({ingredient.unite})</label>
                    <input type="number" id="unitPrice" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(parseFloat(e.target.value))} required className="mt-1 ui-input"/>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">Annuler</button>
                    <button type="submit" disabled={isSubmitting} className="w-full ui-btn-success py-3 disabled:opacity-60">{isSubmitting ? 'Ajout...' : 'Ajouter au Stock'}</button>
                </div>
            </form>
        </Modal>
    );
};

const DeleteModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; ingredient: Ingredient }> = ({ isOpen, onClose, onSuccess, ingredient }) => {
    const [isSubmitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleDelete = async () => {
        setSubmitting(true);
        setErrorMessage(null);
        try {
            await api.deleteIngredient(ingredient.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to delete ingredient", error);
            setErrorMessage("Impossible de supprimer cet ingrédient car il est utilisé dans au moins une recette.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmer la Suppression">
            <p className="text-gray-700">Êtes-vous sûr de vouloir supprimer l'ingrédient <strong className="text-gray-900">{ingredient.nom}</strong> ? Cette action est irréversible.</p>
            {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">Annuler</button>
                <button onClick={handleDelete} disabled={isSubmitting} className="w-full ui-btn-danger py-3 disabled:opacity-60">{isSubmitting ? 'Suppression...' : 'Supprimer'}</button>
            </div>
        </Modal>
    );
}

export default Ingredients;