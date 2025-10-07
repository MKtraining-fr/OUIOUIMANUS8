import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Category, OrderItem, Order, ClientInfo } from '../types';
import { api } from '../services/api';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import { uploadPaymentReceipt } from '../services/cloudinary';
import { ShoppingCart, Plus, Minus, History } from 'lucide-react';
import { getActiveCustomerOrder, storeActiveCustomerOrder } from '../utils/storage';
import ProductCardWithPromotion from '../components/ProductCardWithPromotion';

const DOMICILIO_FEE = 5000;
const DOMICILIO_ITEM_NAME = 'Domicilio';

const isDeliveryFeeItem = (item: OrderItem) => item.nom_produit === DOMICILIO_ITEM_NAME;

const createDeliveryFeeItem = (): OrderItem => ({
    id: `delivery-${Date.now()}`,
    produitRef: 'delivery-fee',
    nom_produit: DOMICILIO_ITEM_NAME,
    prix_unitaire: DOMICILIO_FEE,
    quantite: 1,
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
                        className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-primary-dark transition"
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

const OrderMenuView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState('all');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<SelectedProductState | null>(null);
    const [clientInfo, setClientInfo] = useState<ClientInfo>({nom: '', adresse: '', telephone: ''});
    const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsData, categoriesData] = await Promise.all([
                    api.getProducts(),
                    api.getCategories()
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
                
                // Fetch order history
                const activeOrderId = getActiveCustomerOrder();
                if (activeOrderId) {
                    try {
                        const order = await api.getOrderById(activeOrderId);
                        if (order) {
                            setOrderHistory([order]);
                        }
                    } catch (err) {
                        console.error('Error fetching active order:', err);
                    }
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

    const total = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);
        if (cart.length === 0) {
            return subtotal;
        }
        return subtotal + DOMICILIO_FEE;
    }, [cart]);

    const handleProductClick = (product: Product) => {
        setSelectedProduct({product});
        setModalOpen(true);
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
    
    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientInfo.nom || !clientInfo.telephone || !clientInfo.adresse || !paymentProof || !paymentMethod) return;
        setSubmitting(true);
        try {
            let receiptUrl: string | undefined;
            if (paymentProof) {
                receiptUrl = await uploadPaymentReceipt(paymentProof, {
                    customerReference: clientInfo.telephone || clientInfo.nom,
                });
            }

            const itemsToSubmit = cart.length > 0 ? [...cart, createDeliveryFeeItem()] : cart;

            const orderData = {
                items: itemsToSubmit,
                clientInfo,
                receipt_url: receiptUrl,
                payment_method: paymentMethod,
            };
            const newOrder = await api.submitCustomerOrder(orderData);
            setSubmittedOrder(newOrder);
            setConfirmOpen(true);
            setCart([]);
            setClientInfo({nom: '', adresse: '', telephone: ''});
            setPaymentProof(null);
            setPaymentMethod('transferencia');
            storeActiveCustomerOrder(newOrder.id);
        } catch (err) {
            alert('Ocurrió un error al enviar el pedido o subir el comprobante.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReorder = (pastOrder: Order) => {
        const timestamp = Date.now();
        const missingProducts: string[] = [];

        const updatedItems = pastOrder.items.reduce<OrderItem[]>((acc, item, index) => {
            if (isDeliveryFeeItem(item)) {
                return acc;
            }

            const product = products.find(p => p.id === item.produitRef);

            if (!product) {
                missingProducts.push(item.nom_produit || item.produitRef);
                return acc;
            }

            const newItem: OrderItem = {
                ...item,
                id: `oi-${timestamp}-${index}`,
                prix_unitaire: product.prix_vente, // Use current product price
            };
            return [...acc, newItem];
        }, []);

        if (missingProducts.length > 0) {
            alert(`Algunos productos no están disponibles: ${missingProducts.join(", ")}. Se han omitido del pedido.`);
        }

        setCart(updatedItems);
        setOrderHistory([]); // Clear history after reordering
    };

    const generateWhatsAppMessage = (order: Order): string => {
        const itemsText = order.items.map(item => `- ${item.quantite}x ${item.nom_produit} (${formatCurrencyCOP(item.prix_unitaire)})`).join("\n");
        const totalText = `Total: ${formatCurrencyCOP(order.total)}`;
        const clientText = `Cliente: ${order.clientInfo?.nom} (${order.clientInfo?.telephone})\nDirección: ${order.clientInfo?.adresse}`;
        const paymentText = `Método de pago: ${order.payment_method === "transferencia" ? "Transferencia" : "Efectivo"}`;
        const receiptText = order.receipt_url ? `Comprobante: ${order.receipt_url}` : "";

        return encodeURIComponent(
            `¡Hola! Aquí está mi pedido:\n\n${itemsText}\n\n${totalText}\n\n${clientText}\n${paymentText}\n${receiptText}`
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 p-4 lg:p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Realizar Pedido</h1>

                {/* Category Filters */}
                <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveCategoryId("all")}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeCategoryId === "all" ? "bg-brand-primary text-white" : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"}`}
                    >
                        Todos
                    </button>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategoryId(category.id)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeCategoryId === category.id ? "bg-brand-primary text-white" : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"}`}
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
                
                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <ShoppingCart size={48} className="mb-3" />
                        <p>Tu carrito está vacío.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                                <div>
                                    <p className="font-medium text-gray-800">{item.nom_produit}</p>
                                    {item.commentaire && <p className="text-sm text-gray-500 italic">{item.commentaire}</p>}
                                    {item.excluded_ingredients && item.excluded_ingredients.length > 0 && (
                                        <p className="text-xs text-gray-500">Sin: {item.excluded_ingredients.join(", ")}</p>
                                    )}
                                    <p className="text-sm text-gray-600">{formatCurrencyCOP(item.prix_unitaire)}</p>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => handleQuantityChange(item.id, -1)}
                                        className="text-brand-primary hover:text-brand-primary-dark p-1"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="mx-2 text-gray-700 font-medium">{item.quantite}</span>
                                    <button
                                        onClick={() => handleQuantityChange(item.id, 1)}
                                        className="text-brand-primary hover:text-brand-primary-dark p-1"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {cart.some(isDeliveryFeeItem) && (
                            <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                                <p className="font-medium text-gray-800">{DOMICILIO_ITEM_NAME}</p>
                                <p className="text-sm text-gray-600">{formatCurrencyCOP(DOMICILIO_FEE)}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-lg font-bold text-gray-800">Total:</p>
                        <p className="text-xl font-bold text-brand-primary">{formatCurrencyCOP(total)}</p>
                    </div>

                    {orderHistory.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="font-semibold text-blue-700 mb-2">Pedido anterior:</p>
                            {orderHistory.map(order => (
                                <div key={order.id} className="flex justify-between items-center text-sm text-blue-600 mb-1">
                                    <span>#{order.id.slice(-6)} - {formatCurrencyCOP(order.total)}</span>
                                    <button onClick={() => handleReorder(order)} className="text-blue-500 hover:underline flex items-center">
                                        <History size={16} className="mr-1" /> Reordenar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmitOrder} className="space-y-4">
                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">Nombre:</label>
                            <input
                                type="text"
                                id="clientName"
                                value={clientInfo.nom}
                                onChange={(e) => setClientInfo({...clientInfo, nom: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">Teléfono:</label>
                            <input
                                type="tel"
                                id="clientPhone"
                                value={clientInfo.telephone}
                                onChange={(e) => setClientInfo({...clientInfo, telephone: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">Dirección:</label>
                            <input
                                type="text"
                                id="clientAddress"
                                value={clientInfo.adresse}
                                onChange={(e) => setClientInfo({...clientInfo, adresse: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Método de Pago:</label>
                            <div className="mt-1 flex space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="transferencia"
                                        checked={paymentMethod === "transferencia"}
                                        onChange={() => setPaymentMethod("transferencia")}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Transferencia</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="efectivo"
                                        checked={paymentMethod === "efectivo"}
                                        onChange={() => setPaymentMethod("efectivo")}
                                        className="form-radio"
                                    />
                                    <span className="ml-2">Efectivo</span>
                                </label>
                            </div>
                        </div>
                        {paymentMethod === "transferencia" && (
                            <div>
                                <label htmlFor="paymentProof" className="block text-sm font-medium text-gray-700">Comprobante de Pago:</label>
                                <input
                                    type="file"
                                    id="paymentProof"
                                    accept="image/*"
                                    onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-primary-dark"
                                    required
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={submitting || cart.length === 0}
                        >
                            {submitting ? "Enviando..." : "Confirmar Pedido"}
                        </button>
                    </form>
                </div>
            </div>

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                selectedProduct={selectedProduct}
                onAddToCart={handleAddToCart}
            />

            <ConfirmationModal
                isOpen={confirmOpen}
                order={submittedOrder}
                onClose={() => setConfirmOpen(false)}
            />
        </div>
    );
};

export default OrderMenuView;

