

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { uploadProductImage, resolveProductImageUrl } from '../services/cloudinary';
import { Product, Category, Ingredient, RecipeItem } from '../types';
import Modal from '../components/Modal';
import { PlusCircle, Edit, Trash2, Search, Settings, GripVertical, CheckCircle, Clock, XCircle, MoreVertical, Upload, HelpCircle } from 'lucide-react';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';

const BEST_SELLER_RANKS = [1, 2, 3, 4, 5, 6];

const getStatusInfo = (status: Product['estado']) => {
    switch (status) {
        case 'disponible':
            return { text: 'Disponible', color: 'bg-green-100 text-green-800', Icon: CheckCircle };
        case 'agotado_temporal':
            return { text: 'Rupture (Temp.)', color: 'bg-yellow-100 text-yellow-800', Icon: Clock };
        case 'agotado_indefinido':
            return { text: 'Indisponible', color: 'bg-red-100 text-red-800', Icon: XCircle };
        default:
            return { text: 'Inconnu', color: 'bg-gray-100 text-gray-800', Icon: HelpCircle };
    }
};

// --- Main Page Component ---
const Produits: React.FC = () => {
    const { role } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    const canEdit = role?.permissions['/produits'] === 'editor';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData, ingredientsData] = await Promise.all([
                api.getProducts(),
                api.getCategories(),
                api.getIngredients()
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
            setIngredients(ingredientsData);
            setError(null);
        } catch (err) {
            setError("Impossible de charger les données des produits.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            (p.nom_produit.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (categoryFilter === 'all' || p.categoria_id === categoryFilter)
        ), [products, searchTerm, categoryFilter]);

    const occupiedBestSellerPositions = useMemo(() => {
        const map = new Map<number, Product>();
        products.forEach(prod => {
            if (prod.is_best_seller && prod.best_seller_rank != null) {
                map.set(prod.best_seller_rank, prod);
            }
        });
        return map;
    }, [products]);

    const handleOpenModal = (type: 'product' | 'category' | 'delete', mode: 'add' | 'edit' = 'add', product: Product | null = null) => {
        if (type === 'product') {
            setModalMode(mode);
            setSelectedProduct(product);
            setProductModalOpen(true);
        } else if (type === 'category') {
            setCategoryModalOpen(true);
        } else if (type === 'delete' && product) {
            setSelectedProduct(product);
            setDeleteModalOpen(true);
        }
    };
    
    const handleStatusChange = async (product: Product, newStatus: Product['estado']) => {
        try {
            await api.updateProduct(product.id, { estado: newStatus });
            fetchData();
        } catch (error) {
            console.error("Failed to update status", error);
            const message = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            alert(`Échec de la mise à jour du statut du produit : ${message}`);
        }
    }

    if (loading) return <p className="text-gray-800">Chargement des produits...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="space-y-6">
            <div className="mt-6 ui-card p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="relative flex-grow md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="ui-input pl-10"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="ui-select md:w-56"
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                    </select>
                </div>
                {canEdit && (
                    <div className="flex gap-2 w-full lg:w-auto">
                        <button onClick={() => setCategoryModalOpen(true)} className="flex-1 lg:flex-initial ui-btn-secondary">
                            <Settings size={20} />
                        </button>
                        <button onClick={() => handleOpenModal('product', 'add')} className="flex-1 lg:flex-initial ui-btn-primary">
                            <PlusCircle size={20} />
                            Ajouter Produit
                        </button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(p => (
                    <ProductCard 
                        key={p.id} 
                        product={p} 
                        category={categories.find(c => c.id === p.categoria_id)}
                        onEdit={() => handleOpenModal('product', 'edit', p)}
                        onDelete={() => handleOpenModal('delete', 'edit', p)}
                        onStatusChange={handleStatusChange}
                        canEdit={canEdit}
                    />
                ))}
            </div>

            {isProductModalOpen && canEdit && (
                <AddEditProductModal
                    isOpen={isProductModalOpen}
                    onClose={() => setProductModalOpen(false)}
                    onSuccess={fetchData}
                    product={selectedProduct}
                    mode={modalMode}
                    categories={categories}
                    ingredients={ingredients}
                    occupiedPositions={occupiedBestSellerPositions}
                />
            )}
            {isCategoryModalOpen && canEdit && (
                <ManageCategoriesModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setCategoryModalOpen(false)}
                    onSuccess={fetchData}
                    categories={categories}
                />
            )}
             {isDeleteModalOpen && canEdit && selectedProduct && (
                <DeleteProductModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onSuccess={fetchData}
                    product={selectedProduct}
                />
            )}
        </div>
    );
};


// --- Child Components ---

const ProductCard: React.FC<{ product: Product; category?: Category; onEdit: () => void; onDelete: () => void; onStatusChange: (product: Product, newStatus: Product['estado']) => void; canEdit: boolean; }> = ({ product, category, onEdit, onDelete, onStatusChange, canEdit }) => {
    const { text, color, Icon } = getStatusInfo(product.estado);
    const [menuOpen, setMenuOpen] = useState(false);
    
    const margin = product.prix_vente - (product.cout_revient || 0);
    const marginPercentage = product.prix_vente > 0 ? (margin / product.prix_vente) * 100 : 0;

    return (
        <div className="ui-card flex flex-col overflow-hidden">
            <div className="relative">
                <img src={product.image} alt={product.nom_produit} className="w-full h-40 object-cover" />
                {product.is_best_seller && (
                    <span className="absolute top-2 left-2 rounded-full bg-brand-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
                        Best seller{product.best_seller_rank ? ` #${product.best_seller_rank}` : ''}
                    </span>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500">{category?.nom || 'Sans catégorie'}</p>
                        <h3 className="font-bold text-lg text-gray-900">{product.nom_produit}</h3>
                    </div>
                <p className="text-xl font-extrabold text-brand-primary">{formatCurrencyCOP(product.prix_vente)}</p>
                </div>
                 <p className="text-xs text-gray-600 mt-1 flex-grow">{product.description}</p>
                
                <div className="flex justify-between items-center mt-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${color}`}>
                        <Icon size={14} /> {text}
                    </span>
                    {canEdit && (
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-gray-500 hover:text-gray-800"><MoreVertical size={20} /></button>
                            {menuOpen && (
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Modifier</button>
                                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Supprimer</button>
                                    <div className="border-t my-1"></div>
                                    <p className="px-4 pt-2 pb-1 text-xs text-gray-500">Changer statut :</p>
                                    {['disponible', 'agotado_temporal', 'agotado_indefinido'].map(status => (
                                        <button key={status} onClick={() => { onStatusChange(product, status as Product['estado']); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            {getStatusInfo(status as Product['estado']).text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


type ProductFormState = {
    nom_produit: string;
    prix_vente: number;
    categoria_id: string;
    estado: Product['estado'];
    image: string;
    description: string;
    recipe: RecipeItem[];
    is_best_seller: boolean;
    best_seller_rank: number | null;
};

const AddEditProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; product: Product | null; mode: 'add' | 'edit'; categories: Category[]; ingredients: Ingredient[]; occupiedPositions: Map<number, Product>; }> = ({ isOpen, onClose, onSuccess, product, mode, categories, ingredients, occupiedPositions }) => {
    const [formData, setFormData] = useState<ProductFormState>({
        nom_produit: product?.nom_produit || '',
        prix_vente: product?.prix_vente || 0,
        categoria_id: product?.categoria_id || (categories[0]?.id ?? ''),
        estado: product?.estado || 'disponible',
        image: product?.image ?? '',
        description: product?.description || '',
        recipe: product?.recipe || [],
        is_best_seller: product?.is_best_seller ?? false,
        best_seller_rank: product?.best_seller_rank ?? null,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setFormData({
            nom_produit: product?.nom_produit || '',
            prix_vente: product?.prix_vente || 0,
            categoria_id: product?.categoria_id || (categories[0]?.id ?? ''),
            estado: product?.estado || 'disponible',
            image: product?.image ?? '',
            description: product?.description || '',
            recipe: product?.recipe || [],
            is_best_seller: product?.is_best_seller ?? false,
            best_seller_rank: product?.best_seller_rank ?? null,
        });
        setImageFile(null);
    }, [isOpen, product, categories]);

    const findFirstAvailablePosition = useCallback(() => {
        for (const rank of BEST_SELLER_RANKS) {
            const occupant = occupiedPositions.get(rank);
            if (!occupant || occupant.id === product?.id) {
                return rank;
            }
        }
        return null;
    }, [occupiedPositions, product?.id]);

    const handleBestSellerToggle = useCallback(
        (checked: boolean) => {
            setFormData(prev => {
                if (checked) {
                    const nextRank = prev.best_seller_rank ?? findFirstAvailablePosition();
                    return { ...prev, is_best_seller: true, best_seller_rank: nextRank ?? null };
                }
                return { ...prev, is_best_seller: false, best_seller_rank: null };
            });
        },
        [findFirstAvailablePosition],
    );

    const handleBestSellerRankChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, best_seller_rank: value ? Number(value) : null }));
    }, []);

    const ingredientMap = useMemo(() => new Map(ingredients.map(ing => [ing.id, ing])), [ingredients]);

    const recipeCost = useMemo(() => {
        return formData.recipe.reduce((total, item) => {
            const ingredient = ingredientMap.get(item.ingredient_id);
            if (!ingredient) return total;

            let unitPrice = ingredient.prix_unitaire;
            if (ingredient.unite === 'kg' || ingredient.unite === 'L') {
                unitPrice = unitPrice / 1000;
            }

            return total + unitPrice * item.qte_utilisee;
        }, 0);
    }, [formData.recipe, ingredientMap]);

    const marginValue = formData.prix_vente - recipeCost;
    const marginPercentage = formData.prix_vente > 0 ? (marginValue / formData.prix_vente) * 100 : 0;

    const handleRecipeChange = (
        index: number,
        field: keyof RecipeItem,
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const newRecipe = [...formData.recipe];
        if (field === 'qte_utilisee') {
            const { valueAsNumber, value } = event.currentTarget;
            const normalizedValue = Number.isNaN(valueAsNumber) ? Number(value.replace(',', '.')) : valueAsNumber;
            newRecipe[index] = {
                ...newRecipe[index],
                [field]: Number.isNaN(normalizedValue) ? newRecipe[index].qte_utilisee : normalizedValue,
            };
        } else {
            newRecipe[index] = { ...newRecipe[index], [field]: event.currentTarget.value };
        }
        setFormData(prev => ({ ...prev, recipe: newRecipe }));
    };

    const addRecipeItem = () => {
        if (ingredients.length === 0) return;
        setFormData({ ...formData, recipe: [...formData.recipe, { ingredient_id: ingredients[0].id, qte_utilisee: 0 }] });
    };
    
    const removeRecipeItem = (index: number) => {
        const newRecipe = formData.recipe.filter((_, i) => i !== index);
        setFormData({ ...formData, recipe: newRecipe });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.recipe.length === 0) {
            alert("Veuillez ajouter au moins un ingrédient à la recette.");
            return;
        }
        if (formData.is_best_seller) {
            if (formData.best_seller_rank == null) {
                alert('Veuillez sélectionner une position de best seller disponible.');
                return;
            }
            const occupant = occupiedPositions.get(formData.best_seller_rank);
            if (occupant && occupant.id !== product?.id) {
                alert(`La position ${formData.best_seller_rank} est déjà occupée par ${occupant.nom_produit}.`);
                return;
            }
        }
        setSubmitting(true);
        try {
            let imageUrl = formData.image?.trim() ?? '';
            if (imageFile) {
                imageUrl = await uploadProductImage(imageFile, formData.nom_produit);
            }

            const finalData = {
                ...formData,
                image: imageUrl,
                is_best_seller: formData.is_best_seller,
                best_seller_rank: formData.is_best_seller ? formData.best_seller_rank : null,
            };

            if (mode === 'edit' && product) {
                await api.updateProduct(product.id, finalData);
            } else {
                await api.addProduct(finalData as Omit<Product, 'id'>);
            }
            onSuccess();
            setImageFile(null);
            onClose();
        } catch (error) {
            console.error("Failed to save product", error);
            const message = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            alert(`Échec du téléversement de l'image du produit : ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Ajouter un Produit' : 'Modifier le Produit'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nom</label>
                            <input type="text" value={formData.nom_produit} onChange={e => setFormData({...formData, nom_produit: e.target.value})} required className="mt-1 ui-input"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prix de vente</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.prix_vente}
                                onChange={event => {
                                    const { valueAsNumber, value } = event.currentTarget;
                                    const normalizedValue = Number.isNaN(valueAsNumber)
                                        ? Number(value.replace(',', '.'))
                                        : valueAsNumber;
                                    setFormData(prev => ({
                                        ...prev,
                                        prix_vente: Number.isNaN(normalizedValue) ? prev.prix_vente : normalizedValue,
                                    }));
                                }}
                                required
                                className="mt-1 ui-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                            <select value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} required className="mt-1 ui-select">
                                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Statut</label>
                            <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value as Product['estado']})} required className="mt-1 ui-select">
                                <option value="disponible">Disponible</option>
                                <option value="agotado_temporal">Rupture (Temp.)</option>
                                <option value="agotado_indefinido">Indisponible</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                            <input
                                id="best-seller-toggle"
                                type="checkbox"
                                checked={formData.is_best_seller}
                                onChange={event => handleBestSellerToggle(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <label htmlFor="best-seller-toggle" className="text-sm font-medium text-gray-700">Best seller</label>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="best-seller-rank">Position dans le classement</label>
                            <select
                                id="best-seller-rank"
                                value={formData.best_seller_rank ?? ''}
                                onChange={handleBestSellerRankChange}
                                disabled={!formData.is_best_seller}
                                className="mt-1 ui-select"
                            >
                                <option value="">Sélectionner une position</option>
                                {BEST_SELLER_RANKS.map(rank => {
                                    const occupant = occupiedPositions.get(rank);
                                    const isCurrentProduct = occupant?.id === product?.id;
                                    const isDisabled = Boolean(occupant && !isCurrentProduct);
                                    const label = occupant
                                        ? isCurrentProduct
                                            ? `${rank} – Position actuelle`
                                            : `${rank} – Occupé par ${occupant.nom_produit}`
                                        : `${rank}`;
                                    return (
                                        <option key={rank} value={rank} disabled={isDisabled}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                            {formData.is_best_seller && formData.best_seller_rank === null && (
                                <p className="mt-1 text-xs text-red-600">Sélectionnez une position disponible pour ce best seller.</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Coût de revient</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrencyCOP(recipeCost)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Marge</p>
                            <p className={`text-lg font-semibold ${marginValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrencyCOP(marginValue)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Marge %</p>
                            <p className={`text-lg font-semibold ${marginPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number.isFinite(marginPercentage) ? formatIntegerAmount(marginPercentage) : '0'}%</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="mt-1 ui-textarea"
                            placeholder="Courte description du produit..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Image du produit</label>
                         <div className="mt-1 flex items-center gap-4">
                            <img
                                src={imageFile ? URL.createObjectURL(imageFile) : resolveProductImageUrl(formData.image)}
                                alt="Aperçu"
                                className="w-20 h-20 object-cover rounded-md bg-gray-100"
                            />
                             <label htmlFor="product-image-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                                 <div className="flex items-center gap-2">
                                     <Upload size={16} />
                                     <span>Changer l'image</span>
                                 </div>
                                <input id="product-image-upload" type="file" className="sr-only" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} />
                            </label>
                         </div>
                    </div>


                    <div>
                        <h4 className="text-md font-semibold text-gray-800 border-b pb-2 mb-2">Recette</h4>
                        {formData.recipe.length === 0 && (
                            <div className="text-center p-2 my-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">Un produit doit contenir au moins un ingrédient.</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            {formData.recipe.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <GripVertical className="text-gray-400 cursor-move" size={16}/>
                                    <select value={item.ingredient_id} onChange={event => handleRecipeChange(index, 'ingredient_id', event)} className="ui-select flex-grow">
                                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                                    </select>
                                    <input type="number" placeholder="Qté" value={item.qte_utilisee} onChange={event => handleRecipeChange(index, 'qte_utilisee', event)} className="ui-input w-24" />
                                    <span className="text-gray-500 text-sm w-12">{ingredients.find(i => i.id === item.ingredient_id)?.unite === 'kg' ? 'g' : ingredients.find(i => i.id === item.ingredient_id)?.unite}</span>
                                    <button type="button" onClick={() => removeRecipeItem(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addRecipeItem} className="mt-2 text-sm text-blue-600 hover:underline">Ajouter un ingrédient</button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto ui-btn-secondary py-3">Annuler</button>
                    <button type="submit" disabled={isSubmitting || formData.recipe.length === 0} className="w-full sm:w-auto ui-btn-primary py-3 disabled:opacity-60">{isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                </div>
            </form>
        </Modal>
    );
};

const ManageCategoriesModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; categories: Category[] }> = ({ isOpen, onClose, onSuccess, categories }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [error, setError] = useState('');

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await api.addCategory(newCategoryName);
            setNewCategoryName('');
            onSuccess();
        } catch (err) { console.error(err); }
    };
    
    const handleDelete = async (id: string) => {
        setError('');
        try {
            await api.deleteCategory(id);
            onSuccess();
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gérer les Catégories">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nom de la nouvelle catégorie" className="ui-input flex-grow" />
                    <button onClick={handleAdd} className="ui-btn-primary px-4">Ajouter</button>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {categories.map(cat => (
                        <li key={cat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span className="text-gray-800">{cat.nom}</span>
                            <button onClick={() => handleDelete(cat.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                        </li>
                    ))}
                </ul>
                 <div className="pt-4 flex">
                    <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">Fermer</button>
                </div>
            </div>
        </Modal>
    );
};

const DeleteProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; product: Product }> = ({ isOpen, onClose, onSuccess, product }) => {
    const [isSubmitting, setSubmitting] = useState(false);

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.deleteProduct(product.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to delete product", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmer la Suppression">
            <p className="text-gray-700">Êtes-vous sûr de vouloir supprimer le produit <strong className="text-gray-900">{product.nom_produit}</strong> ? Cette action est irréversible.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <button type="button" onClick={onClose} className="w-full sm:w-auto ui-btn-secondary py-3">Annuler</button>
                <button onClick={handleDelete} disabled={isSubmitting} className="w-full sm:w-auto ui-btn-danger py-3">{isSubmitting ? 'Suppression...' : 'Supprimer'}</button>
            </div>
        </Modal>
    );
}

export default Produits;
