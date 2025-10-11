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

interface ConfirmationModalProps {
    isOpen: boolean;
    order: Order | null;
    onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, order, onClose }) => {
    const navigate = useNavigate();
    
    if (!isOpen || !order) return null;
    
    const handleViewOrder = () => {
        navigate(`/order/${order.id}`);
    };
    
    const handleWhatsApp = () => {
        const message = generateWhatsAppMessage(order);
        const receiptUrl = order.receipt_url ? `&text=${message}` : '';
        window.open(`https://wa.me/573000000000?${receiptUrl}`, '_blank');
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-green-600">¡Pedido enviado con éxito!</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                        Tu pedido ha sido enviado correctamente. Recibirás una confirmación pronto.
                    </p>
                    
                    <div className="bg-gray-100 p-3 rounded-lg mb-4">
                        <p className="font-bold text-gray-800">Número de pedido: #{order.id.slice(-6)}</p>
                        <p className="text-gray-600">Total: {formatCurrencyCOP(order.total)}</p>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={handleViewOrder}
                            className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition"
                        >
                            Ver detalles del pedido
                        </button>
                        <button
                            onClick={handleWhatsApp}
                            className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition"
                        >
                            Enviar por WhatsApp
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                        >
                            Cerrar
                        </button>
                    </div>
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
            const currentAutomaticPromotionsDiscount = totalDiscount - currentPromoCodeDiscount;

            let deliveryFee = 0;
            let isDeliveryFree = false;

            // Apply DOMICILIO GRATIS logic after all other promotions
            if (orderType === 'pedir_en_linea') {
                // Check for 'DOMICILIO GRATIS' promotion
                const freeDeliveryPromo = updatedOrder.applied_promotions.find(p => p.name === 'DOMICILIO GRATIS');
                if (freeDeliveryPromo) {
                    isDeliveryFree = true;
                    deliveryFee = 0;
                } else {
                    deliveryFee = DOMICILIO_FEE;
                }
            }

            const finalTotal = updatedOrder.subtotal + deliveryFee;

            setOrderTotals({
                subtotal: updatedOrder.subtotal,
                total: finalTotal,
                automaticPromotionsDiscount: currentAutomaticPromotionsDiscount,
                promoCodeDiscount: currentPromoCodeDiscount,
                deliveryFee: deliveryFee,
                appliedPromotions: updatedOrder.applied_promotions
            });
            setIsFreeShipping(isDeliveryFree);
        };

        calculateOrderTotals();
    }, [cart, appliedPromoCode, freeShippingMinAmount, orderType, clientInfo, paymentMethod]);

    const { subtotal, total, automaticPromotionsDiscount, promoCodeDiscount: currentPromoCodeDiscount, deliveryFee, appliedPromotions } = orderTotals;

    useEffect(() => {
        setPromoCodeDiscount(currentPromoCodeDiscount);
    }, [currentPromoCodeDiscount]);

    const handleProductClick = (product: Product) => {
        setSelectedProduct({product});
        setModalOpen(true);
    };

    const handleReorder = (order: Order) => {
        // Filter out delivery fee items and map to new cart items
        const itemsToAddToCart = order.items
            .filter(item => !isDeliveryFeeItem(item)) // Exclude delivery fee
            .map(item => ({
                ...item,
                id: `oi${Date.now()}-${Math.random()}` // New ID for each item
            }));
        setCart(itemsToAddToCart);
    };

    const handleAddToCart = (item: OrderItem) => {
        let newCart = [...cart];
        if (item.commentaire) {
            newCart.push({ ...item, id: `oi${Date.now()}` });
        } else {
            const existingIndex = newCart.findIndex(cartItem => cartItem.produitRef === item.produitRef && !cartItem.commentaire);
            if (existingIndex > -1) {
                newCart[existingIndex].quantite += item.quantite;
            } else {
                newCart.push(item);
            }
        }
        setCart(newCart);
        setModalOpen(false);
    };
    
    const handleQuantityChange = (itemId: string, change: number) => {
        const itemIndex = cart.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;
        
        let newCart = [...cart];
        const newQuantity = newCart[itemIndex].quantite + change;
        if (newQuantity <= 0) {
            newCart.splice(itemIndex, 1);
        } else {
            newCart[itemIndex].quantite = newQuantity;
        }
        setCart(newCart);
    };
    
    const handleApplyPromoCode = async () => {
        setPromoCodeError('');
        try {
            const tempOrder = {
                id: "temp-order",
                items: cart.filter(item => !isDeliveryFeeItem(item)),
                client_name: clientName,
                client_phone: clientPhone,
                client_address: clientAddress,
                shipping_cost: DOMICILIO_FEE, // Assurez-vous que DOMICILIO_FEE est défini ou récupéré ailleurs
                total: cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0),
                promo_code: promoCode,
                applied_promotions: [],
                subtotal: 0,
                total_discount: 0,
            };

            const updatedOrder = await applyPromotionsToOrder(tempOrder);
            
            if (updatedOrder.total_discount > 0) {
                setAppliedPromoCode(promoCode);
                setPromoCodeDiscount(updatedOrder.total_discount);
                setPromoCodeError("");
            } else {
                setPromoCodeError("Código de promoción inválido o no aplicable.");
            }
        } catch (error) {
            console.error('Error applying promo code:', error);
            setPromoCodeError('Error al aplicar el código de promoción');
        }
    };

    const handleRemovePromoCode = () => {
        setPromoCode('');
        setAppliedPromoCode('');
        setPromoCodeDiscount(0);
        setPromoCodeError('');
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        // Pour les commandes à emporter, l'adresse n'est pas obligatoire
        const isAddressRequired = orderType === 'pedir_en_linea';
        if (!clientName || !clientPhone || (isAddressRequired && !clientAddress) || !paymentProof || !paymentMethod) return;
        setSubmitting(true);
        try {
            let receiptUrl: string | undefined;
            if (paymentProof) {
                receiptUrl = await uploadPaymentReceipt(paymentProof, {
                    customerReference: clientPhone || clientName,
                });
            }

            // Pour les commandes à emporter, on n'ajoute pas les frais de domicilio
            // Pour les commandes avec livraison, on ajoute les frais de domicilio (gratuit si isFreeShipping)
            const itemsToSubmit = orderType === 'pedir_en_linea' && cart.length > 0 
                ? [...cart, createDeliveryFeeItem(isFreeShipping)] 
                : cart;

            // Calculer le subtotal (total avant réductions et frais de livraison)
            const subtotal = cart.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0);
            
            // Calculer le total avec frais de livraison et réductions
            const deliveryFee = orderType === 'pedir_en_linea' && !isFreeShipping ? DOMICILIO_FEE : 0;
            const totalWithDelivery = subtotal + deliveryFee;
            const finalTotal = Math.max(0, totalWithDelivery - promoCodeDiscount);

            const orderData = {
                type: orderType,
                items: itemsToSubmit,
                clientInfo,
                receipt_url: receiptUrl,
                payment_method: paymentMethod,
                promo_code: appliedPromoCode || undefined,
                subtotal: subtotal,
                total_discount: promoCodeDiscount,
                total: finalTotal,
                applied_promotions: appliedPromoCode ? [{ 
                    promotion_id: appliedPromoCode, 
                    name: appliedPromoCode, 
                    discount_amount: promoCodeDiscount 
                }] : []
            };

            // Soumettre la commande
            const newOrder = await api.createOrder(orderData);
            setSubmittedOrder(newOrder);
            setConfirmOpen(true);

            // Réinitialiser le panier et tous les états après soumission réussie
            setCart([]);
            setPromoCode("");
            setAppliedPromoCode("");
            setPromoCodeError("");
            setPromoCodeDiscount(0);
            setIsFreeShipping(false);
            setOrderTotals({
                subtotal: 0,
                total: 0,
                automaticPromotionsDiscount: 0,
                promoCodeDiscount: 0,
                deliveryFee: 0,
                appliedPromotions: []
            });
            setClientInfo({nom: '', adresse: '', telephone: ''});
            setPaymentProof(null);
            setPaymentMethod('transferencia');
            storeActiveCustomerOrder(newOrder.id);
            
            // Notify parent component that order was submitted
            if (onOrderSubmitted) {
                onOrderSubmitted(newOrder);
            }
        } catch (err) {
            alert('Ocurrió un error al enviar el pedido o subir el comprobante.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const generateWhatsAppMessage = (order: Order): string => {
        const itemsText = order.items.map(item => `- ${item.quantite}x ${item.nom_produit} (${formatCurrencyCOP(item.prix_unitaire)})`).join("\n");
        const totalText = `Total: ${formatCurrencyCOP(order.total)}`;
        const clientText = `Cliente: ${order.client_name} (${order.client_phone})\nDirección: ${order.client_address}`;
        const paymentText = `Método de pago: ${order.payment_method === "transferencia" ? "Transferencia" : "Efectivo"}`;
        const receiptText = order.receipt_url ? `Comprobante: ${order.receipt_url}` : "";

        return encodeURIComponent(
            `¡Hola! Aquí está mi pedido:\n\n${itemsText}\n\n${totalText}\n\n${clientText}\n${paymentText}\n${receiptText}`
        );
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
                        onClick={() => setActiveCategoryId("all")}
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryId === "all" ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600" : "bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300"}`}
                    >
                        Todos
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategoryId(category.id)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryId === category.id ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105 border-2 border-orange-600" : "bg-white text-gray-800 shadow-md hover:bg-gray-100 border-2 border-gray-300"}`}
                        >
                            {category.nom}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map(product => (
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
                                    <p className="font-bold text-lg text-gray-900 mb-1">{item.nom_produit}</p>
                                    {item.commentaire && (
                                        <p className="text-sm text-gray-600 italic mb-1 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                                            💬 {item.commentaire}
                                        </p>
                                    )}
                                    {item.excluded_ingredients && item.excluded_ingredients.length > 0 && (
                                        <p className="text-sm text-red-600 mb-1 bg-red-50 p-2 rounded border-l-2 border-red-400">
                                            🚫 Sin: {item.excluded_ingredients.join(", ")}
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
                        {cart.length > 0 && (
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
                        {promoCodeError && (
                            <p className="mt-2 text-sm text-red-600">{promoCodeError}</p>
                        )}
                    </div>

                    {promoCodeDiscount > 0 && (
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-green-600">Descuento por promoción:</p>
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
                                onChange={(e) => setClientInfo({...clientInfo, nom: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                placeholder="Ingresa tu nombre completo"
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
                                onChange={(e) => setClientInfo({...clientInfo, telephone: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                placeholder="Ej: 3001234567"
                            />
                        </div>
                        {orderType === 'pedir_en_linea' && (
                            <div>
                                <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">
                                    Dirección: <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="clientAddress"
                                    value={clientAddress}
                                    onChange={(e) => setClientInfo({...clientInfo, adresse: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                    placeholder="Calle, número, barrio, ciudad"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago:</label>
                            <div className="space-y-2">
                                <label className="flex items-center p-3 border-2 border-brand-primary rounded-lg cursor-pointer hover:bg-brand-primary/5 transition">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="transferencia"
                                        checked={paymentMethod === "transferencia"}
                                        onChange={() => setPaymentMethod("transferencia")}
                                        className="form-radio text-brand-primary"
                                    />
                                    <span className="ml-3 font-medium">Transferencia</span>
                                </label>
                                <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg opacity-50 cursor-not-allowed bg-gray-100">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="efectivo"
                                        disabled
                                        className="form-radio"
                                    />
                                    <span className="ml-3 text-gray-500">Efectivo <span className="text-xs">(no disponible por el momento)</span></span>
                                </label>
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-800">
                                    <span className="font-bold">Nequi / BRE-B:</span> 3238090562
                                </p>
                            </div>
                        </div>
                        {paymentMethod === "transferencia" && (
                            <div>
                                <label htmlFor="paymentProof" className="block text-sm font-medium text-gray-700 mb-2">
                                    Comprobante de Pago: <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    id="paymentProof"
                                    accept="image/*"
                                    onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                                    className="mt-1 block w-full text-sm text-gray-800 font-medium
                                        file:mr-4 file:py-3 file:px-6 
                                        file:rounded-lg file:border-2 file:border-brand-primary
                                        file:text-sm file:font-bold 
                                        file:bg-brand-primary file:text-white 
                                        hover:file:bg-brand-primary-dark hover:file:shadow-lg
                                        file:transition-all file:cursor-pointer
                                        border-2 border-gray-300 rounded-lg p-2"
                                    required
                                />
                                {!paymentProof && (
                                    <p className="mt-2 text-xs text-red-600 font-medium">
                                        * El comprobante de pago es obligatorio para confirmar tu pedido
                                    </p>
                                )}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            disabled={submitting || cart.length === 0 || (paymentMethod === "transferencia" && !paymentProof)}
                        >
                            {submitting ? "Enviando..." : "Confirmar Pedido"}
                        </button>
                        {paymentMethod === "transferencia" && !paymentProof && cart.length > 0 && (
                            <p className="text-center text-sm text-red-600 font-medium mt-2">
                                Debes subir el comprobante de pago para confirmar tu pedido
                            </p>
                        )}
                    </form>
                </div>
            </div>

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                selectedProduct={selectedProduct}
                onAddToCart={handleAddToCart}
            />

            <OrderConfirmationModal
                isOpen={confirmOpen}
                order={submittedOrder}
                whatsappNumber={siteContent?.whatsappNumber || '573238090562'}
            />
        </div>
    );
};

// Main wrapper component that handles order tracking
const CommandeClient: React.FC = () => {
    const navigate = useNavigate();
    const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
        const order = getActiveCustomerOrder();
        return order ? order.orderId : null;
    });
    const { content: siteContent } = useSiteContent();

    const handleOrderSubmitted = (order: Order) => {
        setActiveOrderId(order.id);
    };

    const handleNewOrder = () => {
        clearActiveCustomerOrder();
        setActiveOrderId(null);
    };

    // Create Hero background style for the entire page
    const heroBackgroundStyle = siteContent 
        ? createHeroBackgroundStyle(siteContent.hero.style, siteContent.hero.backgroundImage)
        : {};

    return (
        <div className="min-h-screen" style={heroBackgroundStyle}>
            {/* Header with navigation - always visible */}
            <header className="bg-white/90 backdrop-blur shadow-md p-4 sticky top-0 z-40">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {siteContent?.navigation.brandLogo && (
                            <img
                                src={siteContent.navigation.brandLogo}
                                alt={`Logo ${siteContent.navigation.brand}`}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                        )}
                        <span className="text-2xl font-bold text-gray-800">
                            {siteContent?.navigation.brand || 'OUIOUITACOS'}
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                    >
                        <ArrowLeft size={16}/> Volver al inicio
                    </button>
                </div>
            </header>

            {/* Main content area */}
            {activeOrderId ? (
                <CustomerOrderTracker 
                    orderId={activeOrderId} 
                    onNewOrderClick={handleNewOrder} 
                    variant="page" 
                />
            ) : (
                <OrderMenuView onOrderSubmitted={handleOrderSubmitted} />
            )}
        </div>
    );
};

export default CommandeClient;

