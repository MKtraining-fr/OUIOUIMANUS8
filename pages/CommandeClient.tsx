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
                    api.fetchProducts(),
                    api.fetchCategories()
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
                
                // Fetch order history
                const activeOrderId = getActiveCustomerOrder();
                if (activeOrderId) {
                    try {
                        const order = await api.fetchOrderById(activeOrderId);
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

            acc.push({
                ...item,
                id: `oi${timestamp}-${index}`,
                produitRef: product.id,
                nom_produit: product.nom_produit,
                prix_unitaire: product.prix_vente,
            });

            return acc;
        }, []);

        setCart(updatedItems);

        if (missingProducts.length > 0) {
            alert(`Algunos artículos ya no están disponibles y no se agregaron:\n- ${missingProducts.join('\n- ')}`);
        }

        const cartElement = document.getElementById('cart-section');
        if(cartElement) {
             cartElement.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    const generateWhatsAppMessage = (order: Order) => {
        const header = `*Nuevo pedido OUIOUITACOS #${order.id.slice(-6)}*`;
        const itemLines = (order.items ?? []).map(item => {
            const baseLine = `- ${item.quantite}x ${item.nom_produit} (${formatCurrencyCOP(item.prix_unitaire)}) → ${formatCurrencyCOP(item.prix_unitaire * item.quantite)}`;
            const details: string[] = [];
            if (item.commentaire) {
                details.push(`Comentario: ${item.commentaire}`);
            }
            if (item.excluded_ingredients && item.excluded_ingredients.length > 0) {
                details.push(`Sin: ${item.excluded_ingredients.join(', ')}`);
            }
            return details.length > 0 ? `${baseLine}\n  ${details.join('\n  ')}` : baseLine;
        });
        const items = itemLines.length > 0 ? itemLines.join('\n') : 'Sin artículos';
        const totalValue = order.total ?? order.items.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0);
        const totalMsg = `*Total: ${formatCurrencyCOP(totalValue)}*`;
        const paymentMethod = order.payment_method ? `Pago: ${order.payment_method}` : undefined;
        const client = `Cliente: ${order.clientInfo?.nom} (${order.clientInfo?.telephone})\nDirección: ${order.clientInfo?.adresse}`;
        const footer = 'Comprobante de pago adjunto.';
        const messageParts = [header, items, totalMsg, paymentMethod, client, footer].filter(Boolean);
        return encodeURIComponent(messageParts.join('\n\n'));
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Cargando el menú...</div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-500">{error}</div>;

    return (
        <>
            <main className="container mx-auto p-4 lg:grid lg:grid-cols-3 lg:gap-8">
                {/* Menu Section */}
                <div className="lg:col-span-2">
                    {orderHistory.length > 0 && cart.length === 0 && (
                        <div className="bg-white/95 p-4 rounded-xl shadow-xl mb-8">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-3 text-gray-700"><History /> ¿Repetir un pedido?</h2>
                            <div className="space-y-2">
                                {orderHistory.slice(0, 3).map(order => (
                                    <div
                                        key={order.id}
                                        className="flex justify-between items-center rounded-lg border border-white/20 bg-slate-900/80 p-3 text-slate-100 backdrop-blur-sm"
                                    >
                                        <div>
                                            <p className="font-semibold text-white">Pedido del {new Date(order.date_creation).toLocaleDateString('es-CO')}</p>
                                            <p className="text-sm text-slate-300">{order.items.length} artículo(s) - {formatCurrencyCOP(order.total)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleReorder(order)}
                                            className="bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg text-base transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                                        >
                                            Pedir de nuevo
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="bg-white/95 p-4 rounded-xl shadow-xl">
                        <div className="flex space-x-2 overflow-x-auto pb-2 mb-4">
                            <button
                                onClick={() => setActiveCategoryId('all')}
                                className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition border ${activeCategoryId === 'all' ? 'bg-brand-primary text-slate-900 border-brand-primary shadow-lg' : 'bg-slate-900/80 text-white border-white/20'}`}
                            >
                                Todos
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategoryId(cat.id)}
                                    className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition border ${activeCategoryId === cat.id ? 'bg-brand-primary text-slate-900 border-brand-primary shadow-lg' : 'bg-slate-900/80 text-white border-white/20'}`}
                                >
                                    {cat.nom}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map(product => (
                                <ProductCardWithPromotion 
                                    key={product.id} 
                                    product={product} 
                                    onClick={() => handleProductClick(product)} 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cart Section */}
                <div id="cart-section" className="lg:col-span-1 mt-8 lg:mt-0 lg:sticky top-24 self-start">
                    <div className="bg-white/95 p-4 rounded-xl shadow-xl">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-gray-700"><ShoppingCart/> Mi carrito</h2>
                        {cart.length === 0 ? <p className="text-gray-500">Tu carrito está vacío.</p> :
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-700">{item.nom_produit}</p>
                                            {item.commentaire && <p className="text-xs text-gray-500 italic">"{item.commentaire}"</p>}
                                            <p className="text-sm text-gray-600 font-semibold">{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleQuantityChange(item.id, -1)} className="p-1 rounded-full bg-gray-200"><Minus size={14}/></button>
                                            <span className="font-bold w-5 text-center text-gray-700">{item.quantite}</span>
                                            <button onClick={() => handleQuantityChange(item.id, 1)} className="p-1 rounded-full bg-gray-200"><Plus size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                                <div key="delivery-fee" className="flex justify-between items-start border-t pt-3">
                                    <div>
                                        <p className="font-semibold text-gray-700">{DOMICILIO_ITEM_NAME}</p>
                                        <p className="text-sm text-gray-600 font-semibold">{formatCurrencyCOP(DOMICILIO_FEE)}</p>
                                    </div>
                                </div>
                            </div>
                        }
                        <div className="border-t my-4"></div>
                        <div className="flex justify-between text-xl font-bold text-gray-700">
                            <span>Total</span>
                            <span>{formatCurrencyCOP(total)}</span>
                        </div>

                        {cart.length > 0 && (
                            <form onSubmit={handleSubmitOrder} className="mt-6 space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Nombre completo</label>
                                    <input type="text" required value={clientInfo.nom} onChange={e => setClientInfo({...clientInfo, nom: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Teléfono</label>
                                    <input type="tel" required value={clientInfo.telephone} onChange={e => setClientInfo({...clientInfo, telephone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Dirección de entrega</label>
                                    <input type="text" required value={clientInfo.adresse} onChange={e => setClientInfo({...clientInfo, adresse: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Método de pago</label>
                                    <div className="mt-1 flex space-x-4">
                                        <label className="inline-flex items-center">
                                            <input type="radio" checked={paymentMethod === 'transferencia'} onChange={() => setPaymentMethod('transferencia')} className="form-radio text-brand-primary"/>
                                            <span className="ml-2 text-gray-700">Transferencia</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input type="radio" checked={paymentMethod === 'efectivo'} onChange={() => setPaymentMethod('efectivo')} className="form-radio text-brand-primary"/>
                                            <span className="ml-2 text-gray-700">Efectivo</span>
                                        </label>
                                    </div>
                                </div>
                                {paymentMethod === 'transferencia' && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Comprobante de pago</label>
                                        <input type="file" required accept="image/*" onChange={e => setPaymentProof(e.target.files?.[0] || null)} className="mt-1 block w-full text-gray-700"/>
                                        <p className="mt-1 text-xs text-gray-500">Sube una captura de pantalla o foto del comprobante de transferencia.</p>
                                    </div>
                                )}
                                <button type="submit" disabled={submitting} className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary-dark transition disabled:opacity-50">
                                    {submitting ? 'Enviando...' : 'Realizar pedido'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
            
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
        </>
    );
};

export default OrderMenuView;
