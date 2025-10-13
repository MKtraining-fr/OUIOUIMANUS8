import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, OrderItem, Order } from '../types';

// Type pour les informations client

import { api } from '../services/api';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import { uploadPaymentReceipt } from '../services/cloudinary';
import { ShoppingCart, Plus, Minus, History, ArrowLeft } from 'lucide-react';
import { getActiveCustomerOrder, storeActiveCustomerOrder, clearActiveCustomerOrder } from '../services/customerOrderStorage';
import ProductCardWithPromotion from '../components/ProductCardWithPromotion';
import ActivePromotionsDisplay from '../components/ActivePromotionsDisplay';
import { fetchActivePromotions, applyPromotionsToOrder } from '../services/promotionsApi';
import useSiteContent from '../hooks/useSiteContent';
import { createHeroBackgroundStyle } from '../utils/siteStyleHelpers';
import OrderConfirmationModal from '../components/OrderConfirmationModal';
import CustomerOrderTracker from '../components/CustomerOrderTracker';

const DOMICILIO_FEE = 8000;
const DOMICILIO_ITEM_NAME = 'Domicilio';

const isDeliveryFeeItem = (item: OrderItem) => item.nom_produit === DOMICILIO_ITEM_NAME;

const createDeliveryFeeItem = (isFree: boolean = false): OrderItem => ({
    id: `delivery-${Date.now()}`,
    produitRef: 'delivery-fee',
    nom_produit: DOMICILIO_ITEM_NAME,
    prix_unitaire: isFree ? 0 : DOMICILIO_FEE,
    quantite: 1,
    excluded_ingredients: [],
    commentaire: '',
    estado: 'en_attente',
});

interface SelectedProductState {
    product: Product;
    commentaire?: string;
    quantite?: number;
    excluded_ingredients?: string[];
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProduct: SelectedProductState | null;
    onAddToCart: (item: OrderItem) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, selectedProduct, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [comment, setComment] = useState('');
    const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            setQuantity(selectedProduct?.quantite || 1);
            setComment(selectedProduct?.commentaire || '');
            setExcludedIngredients(selectedProduct?.excluded_ingredients || []);
        }
    }, [isOpen, selectedProduct]);
    
    if (!isOpen || !selectedProduct) return null;
    
    const handleAddToCart = () => {
        const product = selectedProduct.product;
        onAddToCart({
            id: `oi${Date.now()}`,
            produitRef: product.id,
            nom_produit: product.nom_produit,
            prix_unitaire: product.prix_vente,
            quantite: quantity,
            commentaire: comment.trim() || undefined,
            excluded_ingredients: excludedIngredients.length > 0 ? excludedIngredients : undefined,
        });
    };
    
    const toggleIngredient = (ingredient: string) => {
        if (excludedIngredients.includes(ingredient)) {
            setExcludedIngredients(excludedIngredients.filter(i => i !== ingredient));
        } else {
            setExcludedIngredients([...excludedIngredients, ingredient]);
        }
    };
    
    const ingredients = selectedProduct.product.ingredients?.split(',').map(i => i.trim()).filter(Boolean) || [];
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-gray-800">{selectedProduct.product.nom_produit}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <img src={selectedProduct.product.image} alt={selectedProduct.product.nom_produit} className="w-full h-48 object-cover rounded-lg mb-4" />
                    
                    <p className="text-gray-600 mb-4">{selectedProduct.product.description}</p>
                    
                    <div className="mb-4">
                        <p className="font-bold text-gray-800 mb-2">Precio: {formatCurrencyCOP(selectedProduct.product.prix_vente)}</p>
                        
                        <div className="flex items-center mt-2">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="bg-gray-200 text-gray-700 rounded-l-lg px-3 py-1"
                            >
                                -
                            </button>
                            <span className="bg-gray-100 px-4 py-1">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="bg-gray-200 text-gray-700 rounded-r-lg px-3 py-1"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    
                    {ingredients.length > 0 && (
                        <div className="mb-4">
                            <p className="font-bold text-gray-800 mb-2">Ingredientes:</p>
                            <div className="space-y-2">
                                {ingredients.map((ingredient, index) => (
                                    <div key={index} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`ingredient-${index}`}
                                            checked={!excludedIngredients.includes(ingredient)}
                                            onChange={() => toggleIngredient(ingredient)}
                                            className="mr-2"
                                        />
                                        <label htmlFor={`ingredient-${index}`} className="text-gray-700">{ingredient}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="comment" className="block font-bold text-gray-800 mb-2">Comentarios adicionales:</label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-gray-700"
                            rows={3}
                            placeholder="Instrucciones especiales, alergias, etc."
                        />
                    </div>
                    
                    <button
                        onClick={handleAddToCart}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg transform hover:scale-105"
                    >
                        Agregar al carrito - {formatCurrencyCOP(selectedProduct.product.prix_vente * quantity)}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface OrderMenuViewProps {
    onOrderSubmitted?: (order: Order) => void;
}

const OrderMenuView: React.FC<OrderMenuViewProps> = ({ onOrderSubmitted }) => {
    const { content: siteContent } = useSiteContent();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState('all');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<SelectedProductState | null>(null);
    const [clientName, setClientName] = useState<string>('');
    const [clientPhone, setClientPhone] = useState<string>('');
    const [clientAddress, setClientAddress] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [promoCode, setPromoCode] = useState<string>('');
    const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
    const [promoCodeError, setPromoCodeError] = useState<string>('');
    const [promoCodeDiscount, setPromoCodeDiscount] = useState<number>(0);
    const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);
    const [freeShippingMinAmount, setFreeShippingMinAmount] = useState<number>(80000);
    const [orderType, setOrderType] = useState<'pedir_en_linea' | 'a_emporter'>('pedir_en_linea');
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsData, categoriesData] = await Promise.all([
                    api.getProducts(),
                    api.getCategories()
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
                
                // Fetch order history from localStorage
                try {
                    const historyJSON = localStorage.getItem('customer-order-history');
                    if (historyJSON) {
                        const history: Order[] = JSON.parse(historyJSON);
                        // Get the last 3 orders
                        setOrderHistory(history.slice(0, 3));
                    }
                } catch (err) {
                    console.error('Error fetching order history:', err);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);
    
    const filteredProducts = useMemo(() => {
        if (activeCategoryId === 'all') return products;
        return products.filter(p => p.categoria_id === activeCategoryId);
    }, [products, activeCategoryId]);

    const [orderTotals, setOrderTotals] = useState({
        subtotal: 0,
        total: 0,
        automaticPromotionsDiscount: 0,
        promoCodeDiscount: 0,
        deliveryFee: 0,
        appliedPromotions: []
    });

    useEffect(() => {
        const calculateOrderTotals = async () => {
            const initialSubtotal = cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

            if (cart.length === 0) {
                setOrderTotals({
                    subtotal: 0,
                    total: 0,
                    automaticPromotionsDiscount: 0,
                    promoCodeDiscount: 0,
                    deliveryFee: 0,
                    appliedPromotions: []
                });
                setIsFreeShipping(false);
                return;
            }

            const tempOrder: Order = {
                id: 'temp',
                items: cart,
                subtotal: initialSubtotal,
                total: initialSubtotal,
                total_discount: 0,
                applied_promotions: [],
                promo_code: appliedPromoCode || undefined,
                client_name: clientName,
                client_phone: clientPhone,
                client_address: clientAddress,
                shipping_cost: DOMICILIO_FEE, // Assurez-vous que DOMICILIO_FEE est défini ou récupéré ailleurs
                order_type: orderType,
                payment_method: paymentMethod,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const updatedOrder = await applyPromotionsToOrder(tempOrder);

            const totalDiscount = updatedOrder.total_discount || 0;
            const currentPromoCodeDiscount = updatedOrder.applied_promotions.find(p => p.config?.promo_code === appliedPromoCode)?.discount_amount || 0;
            const automaticPromotionsDiscount = totalDiscount - currentPromoCodeDiscount;

            let deliveryFee = orderType === 'pedir_en_linea' ? DOMICILIO_FEE : 0;
            const freeShippingPromotionApplied = updatedOrder.applied_promotions.some(p => p.type === 'FREE_SHIPPING');
            if (freeShippingPromotionApplied) {
                deliveryFee = 0;
            }
            setIsFreeShipping(freeShippingPromotionApplied);

            // Le total final doit être calculé en utilisant le total de updatedOrder
            // qui a déjà pris en compte toutes les promotions sauf les frais de livraison
            const finalTotal = updatedOrder.total + deliveryFee;

            setOrderTotals({
                subtotal: initialSubtotal,
                total: finalTotal,
                automaticPromotionsDiscount,
                promoCodeDiscount: currentPromoCodeDiscount,
                deliveryFee,
                appliedPromotions: updatedOrder.applied_promotions
            });
        };

        calculateOrderTotals();
    }, [cart, appliedPromoCode, orderType, clientName, clientPhone, clientAddress, paymentMethod]);

    const { total, subtotal, promoCodeDiscount: currentPromoCodeDiscount, deliveryFee } = orderTotals;

    const handleProductClick = (product: Product) => {
        const existingItem = cart.find(item => item.produitRef === product.id);
        setSelectedProduct({ 
            product, 
            quantite: existingItem?.quantite, 
            commentaire: existingItem?.commentaire, 
            excluded_ingredients: existingItem?.excluded_ingredients 
        });
        setModalOpen(true);
    };

    const handleAddToCart = (item: OrderItem) => {
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(i => i.produitRef === item.produitRef);
            if (existingIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingIndex] = { ...newCart[existingIndex], ...item };
                return newCart;
            } else {
                return [...prevCart, item];
            }
        });
        setModalOpen(false);
    };

    const handleQuantityChange = (itemId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === itemId) {
                const newQuantity = item.quantite + delta;
                if (newQuantity <= 0) {
                    return null; // Sera filtré plus tard
                }
                return { ...item, quantite: newQuantity };
            }
            return item;
        }).filter(Boolean) as OrderItem[]);
    };

    const handleReorder = (order: Order) => {
        const itemsToReorder = order.items.filter(item => !isDeliveryFeeItem(item));
        setCart(itemsToReorder);
    };

    const handleApplyPromoCode = async () => {
        if (!promoCode.trim()) return;
        setPromoCodeError('');
        setAppliedPromoCode(promoCode);
    };

    const handleRemovePromoCode = () => {
        setAppliedPromoCode('');
        setPromoCode('');
        setPromoCodeError('');
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        let receiptUrl = '';
        if (paymentMethod === 'transferencia' && paymentProof) {
            try {
                receiptUrl = await uploadPaymentReceipt(paymentProof);
            } catch (error) {
                console.error('Error uploading receipt:', error);
                setError('Error al subir el comprobante de pago.');
                setSubmitting(false);
                return;
            }
        }

        const finalOrder: Order = {
            id: `ord_${Date.now()}`,
            items: cart,
            clientInfo: {
                nom: clientName,
                telephone: clientPhone,
                adresse: clientAddress,
            },
            shipping_cost: deliveryFee,
            order_type: orderType,
            payment_method: paymentMethod,
            receipt_url: receiptUrl,
            subtotal: orderTotals.subtotal,
            total: orderTotals.total,
            total_discount: orderTotals.automaticPromotionsDiscount + orderTotals.promoCodeDiscount,
            promo_code: appliedPromoCode || undefined,
            applied_promotions: orderTotals.appliedPromotions,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        console.log('finalOrder.total avant createOrder:', finalOrder.total);
        console.log('orderTotals:', orderTotals);

        try {
            const submitted = await api.createOrder(finalOrder);
            console.log('submitted.total après createOrder:', submitted.total);
            setSubmittedOrder(submitted);
            setConfirmOpen(true);
            onOrderSubmitted?.(submitted);
            
            // Store order in history
            try {
                const historyJSON = localStorage.getItem('customer-order-history');
                const history: Order[] = historyJSON ? JSON.parse(historyJSON) : [];
                const newHistory = [submitted, ...history].slice(0, 10); // Garder les 10 dernières commandes
                localStorage.setItem('customer-order-history', JSON.stringify(newHistory));
                setOrderHistory(newHistory.slice(0, 3));
            } catch (err) {
                console.error('Error updating order history:', err);
            }

        } catch (error) {
            console.error('Error submitting order:', error);
            setError('Error al enviar el pedido. Por favor, intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 p-4 lg:p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6 drop-shadow-md">Realizar Pedido</h1>

                {/* Active Promotions Display */}
                <ActivePromotionsDisplay />

                {/* Category Filters */}
                <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveCategoryId('all')}
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryId === 'all' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600' : 'bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300'}`}
                    >
                        Todos
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategoryId(category.id)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryId === category.id ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600' : 'bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300'}`}
                        >
                            {category.nom}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map(product => product && (
                        <ProductCardWithPromotion
                            key={product.id}
                            product={product}
                            onClick={() => handleProductClick(product)}
                        />
                    ))}
                </div>
            </div>

            {/* Order Summary / Cart */}
            <div className="lg:w-96 bg-white p-4 lg:p-6 shadow-lg flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Mi Carrito</h2>
                
                {/* Tus ultimos pedidos - Compact version in cart */}
                {orderHistory.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Tus últimos pedidos</h3>
                        <div className="space-y-2">
                            {orderHistory.map(order => {
                                // Try to get date from multiple possible fields
                                let orderDate = 'Fecha no disponible';
                                const dateField = order.created_at || order.date_commande || order.date_servido || order.timestamp;
                                
                                if (dateField) {
                                    try {
                                        const date = new Date(dateField);
                                        if (!isNaN(date.getTime())) {
                                            orderDate = date.toLocaleDateString('es-ES', { 
                                                day: '2-digit', 
                                                month: '2-digit',
                                                year: 'numeric'
                                            });
                                        }
                                    } catch (e) {
                                        console.error('Error parsing date:', e);
                                    }
                                }
                                
                                // If still no date, use current date as fallback
                                if (orderDate === 'Fecha no disponible') {
                                    orderDate = new Date().toLocaleDateString('es-ES', { 
                                        day: '2-digit', 
                                        month: '2-digit',
                                        year: 'numeric'
                                    });
                                }
                                
                                // Count items excluding delivery fee
                                const itemCount = order.items 
                                    ? order.items
                                        .filter(item => !isDeliveryFeeItem(item))
                                        .reduce((acc, item) => acc + item.quantite, 0) 
                                    : 0;
                                
                                return (
                                    <div key={order.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 hover:border-yellow-500 transition-all">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">Pedido del {orderDate}</p>
                                            <p className="text-xs text-gray-600">
                                                {itemCount} article{itemCount > 1 ? 's' : ''} • {formatCurrencyCOP(order.total)}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleReorder(order)} 
                                            className="ml-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded text-xs whitespace-nowrap transition-all"
                                        >
                                            Pedir de nuevo
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <ShoppingCart size={48} className="mb-3" />
                        <p>Tu carrito está vacío.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        {cart.map((item) => (
                            <div key={item.id} className="flex items-start justify-between py-4 border-b border-gray-200 last:border-b-0 bg-white rounded-lg px-3 mb-2 shadow-sm">
                                <div className="flex-1">
                                    <p className="font-bold text-lg text-gray-900 mb-1">{item?.nom_produit || 'Article inconnu'}</p>
                                    {item.commentaire && (
                                        <p className="text-sm text-gray-600 italic mb-1 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                                            💬 {item.commentaire}
                                        </p>
                                    )}
                                    {item.excluded_ingredients && item.excluded_ingredients.length > 0 && (
                                        <p className="text-sm text-red-600 mb-1 bg-red-50 p-2 rounded border-l-2 border-red-400">
                                            🚫 Sin: {item.excluded_ingredients.join(', ')}
                                        </p>
                                    )}
                                    <p className="text-base font-semibold text-brand-primary mt-2">{formatCurrencyCOP(item.prix_unitaire)}</p>
                                </div>
                                <div className="flex flex-col items-center ml-4">
                                    <div className="flex items-center bg-gray-100 rounded-full p-1">
                                        <button
                                            onClick={() => handleQuantityChange(item.id, -1)}
                                            className="text-brand-primary hover:text-brand-primary-dark p-2 hover:bg-gray-200 rounded-full transition"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <span className="mx-3 text-gray-900 font-bold text-lg min-w-[24px] text-center">{item.quantite}</span>
                                        <button
                                            onClick={() => handleQuantityChange(item.id, 1)}
                                            className="text-brand-primary hover:text-brand-primary-dark p-2 hover:bg-gray-200 rounded-full transition"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 mt-2">
                                        {formatCurrencyCOP(item.prix_unitaire * item.quantite)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {cart.length > 0 && orderType === 'pedir_en_linea' && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                        <p className="font-medium text-gray-800">{DOMICILIO_ITEM_NAME}</p>
                        {isFreeShipping ? (
                            <div className="flex items-center space-x-2">
                                <p className="text-sm text-gray-400 line-through">{formatCurrencyCOP(DOMICILIO_FEE)}</p>
                                <p className="text-sm font-bold text-green-600">GRATIS</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">{formatCurrencyCOP(DOMICILIO_FEE)}</p>
                        )}
                    </div>
                )}
                <div className="mt-auto pt-4 border-t border-gray-200">
                    {/* Promo Code Input */}
                    <div className="mb-4">
                        <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-2">
                            Código de Promoción:
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                id="promoCode"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                placeholder="Ingresa tu código"
                                className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 uppercase" 
                            />
    
                            <button
                                type="button"
                                onClick={handleApplyPromoCode}
                                disabled={!promoCode.trim() || appliedPromoCode === promoCode}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-md hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Aplicar
                            </button>
                        </div>
                        {promoCodeError && (
                            <p className="mt-2 text-sm text-red-600">{promoCodeError}</p>
                        )}
                        {appliedPromoCode && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                                <span className="text-sm text-green-700 font-medium">
                                    ✓ Código "{appliedPromoCode}" aplicado
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemovePromoCode}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Affichage détaillé des promotions appliquées */}
                    {orderTotals.appliedPromotions && orderTotals.appliedPromotions.length > 0 && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-bold text-green-800 mb-2">🎉 Promociones aplicadas:</p>
                            {orderTotals.appliedPromotions.map((promo, index) => (
                                <div key={index} className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-green-700">{promo.name}</span>
                                    <span className="font-semibold text-green-700">- {formatCurrencyCOP(promo.discount_amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {promoCodeDiscount > 0 && (
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-green-600">Descuento por código promocional:</p>
                            <p className="text-sm font-bold text-green-600">- {formatCurrencyCOP(promoCodeDiscount)}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-lg font-bold text-gray-800">Total:</p>
                        <p className="text-xl font-bold text-brand-primary">{formatCurrencyCOP(total)}</p>
                    </div>

                    <form onSubmit={handleSubmitOrder} className="space-y-4">
                        {/* Sélecteur de type de commande */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pedido:</label>
                            <div className="space-y-2">
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${orderType === 'pedir_en_linea' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="pedir_en_linea"
                                        checked={orderType === 'pedir_en_linea'}
                                        onChange={() => setOrderType('pedir_en_linea')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">🚚 Domicilio (con entrega)</span>
                                </label>
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${orderType === 'a_emporter' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="orderType"
                                        value="a_emporter"
                                        checked={orderType === 'a_emporter'}
                                        onChange={() => setOrderType('a_emporter')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">🏪 Para llevar (recoger en tienda)</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                                Nombre: <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="clientName"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">
                                Teléfono: <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                id="clientPhone"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>

                        {orderType === 'pedir_en_linea' && (
                            <div>
                                <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">
                                    Dirección: <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="clientAddress"
                                    value={clientAddress}
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows={3}
                                    required
                                ></textarea>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago:</label>
                            <div className="space-y-2">
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${paymentMethod === 'transferencia' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="transferencia"
                                        checked={paymentMethod === 'transferencia'}
                                        onChange={() => setPaymentMethod('transferencia')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">💰 Transferencia Bancaria</span>
                                </label>
                                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${paymentMethod === 'efectivo' ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:border-brand-primary/50'}`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="efectivo"
                                        checked={paymentMethod === 'efectivo'}
                                        onChange={() => setPaymentMethod('efectivo')}
                                        className="form-radio text-brand-primary" 
                                    />
                                    <span className="ml-3 font-medium">💵 Efectivo</span>
                                </label>
                            </div>
                        </div>

                        {paymentMethod === 'transferencia' && (
                            <div>
                                <label htmlFor="paymentProof" className="block text-sm font-medium text-gray-700">
                                    Comprobante de pago:
                                </label>
                                <input
                                    type="file"
                                    id="paymentProof"
                                    onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept="image/*,application/pdf"
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || cart.length === 0 || (paymentMethod === 'transferencia' && !paymentProof)}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Enviando pedido...' : 'Confirmar Pedido'}
                        </button>
                    </form>
                </div>
            </div>

            {selectedProduct && (
                <ProductModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    selectedProduct={selectedProduct}
                    onAddToCart={handleAddToCart}
                />
            )}

            {submittedOrder && (
                <OrderConfirmationModal
                    isOpen={confirmOpen}
                    order={submittedOrder}
                    onClose={() => {
                        setConfirmOpen(false);
                        setCart([]);
                        setClientName('');
                        setClientPhone('');
                        setClientAddress('');
                        setPaymentMethod('transferencia');
                        setPaymentProof(null);
                        setAppliedPromoCode('');
                        setPromoCodeDiscount(0);
                    }}
                />
            )}
        </div>
    );
};

export default OrderMenuView;
