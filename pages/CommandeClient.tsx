import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { uploadPaymentReceipt } from '../services/cloudinary';
import { Product, Category, OrderItem, Order, SiteContent } from '../types';
import Modal from '../components/Modal';
import { ArrowLeft, ShoppingCart, Plus, Minus, X, Upload, MessageCircle, CheckCircle, History } from 'lucide-react';
import CustomerOrderTracker from '../components/CustomerOrderTracker';
import { clearActiveCustomerOrder, getActiveCustomerOrder, storeActiveCustomerOrder } from '../services/customerOrderStorage';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import useSiteContent from '../hooks/useSiteContent';
import useCustomFonts from '../hooks/useCustomFonts';
import { createBackgroundStyle, createHeroBackgroundStyle, createTextStyle } from '../utils/siteStyleHelpers';

// ==================================================================================
// 2. Item Customization Modal
// ==================================================================================

interface ItemCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: OrderItem) => void;
  product: Product;
  item?: OrderItem;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({ isOpen, onClose, onAddToCart, product, item }) => {
    const [quantity, setQuantity] = useState(1);
    const [comment, setComment] = useState('');

    useEffect(() => {
        // Reset modal state when it opens for a new product
        setQuantity(1);
        setComment('');
    }, [isOpen, product]);

    const handleSave = () => {
        const newItem: OrderItem = {
            id: item?.id || `oi${Date.now()}`,
            produitRef: product.id,
            nom_produit: product.nom_produit,
            prix_unitaire: product.prix_vente,
            quantite: quantity,
            excluded_ingredients: [],
            commentaire: comment.trim(),
            estado: 'en_attente',
        };
        onAddToCart(newItem);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.nom_produit}>
            <div className="space-y-4">
                <img src={product.image} alt={product.nom_produit} className="w-full h-48 object-cover rounded-lg" />
                <p className="text-gray-600">{product.description}</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Comentario (alergias, etc.)</label>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white" />
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full bg-gray-200 text-gray-800"><Minus size={18}/></button>
                        <span className="font-bold text-lg w-8 text-center text-gray-800">{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full bg-gray-200 text-gray-800"><Plus size={18}/></button>
                    </div>
                    <button onClick={handleSave} className="bg-orange-500 text-white font-bold py-2 px-6 rounded-lg transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300">
                        Añadir ({formatCurrencyCOP(product.prix_vente * quantity)})
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ==================================================================================
// Confirmation Modal after submitting order
// ==================================================================================

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    whatsAppMessage: string;
}
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, order, whatsAppMessage }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="¡Pedido enviado!">
            <div className="text-center space-y-4">
                <CheckCircle className="mx-auto text-green-500" size={64}/>
                <h3 className="text-xl font-bold text-gray-800">¡Gracias por tu pedido!</h3>
                <p className="text-gray-600">
                    Tu pedido #{order.id.slice(-6)} se ha recibido correctamente.
                    Está en espera de validación. Puedes seguir su estado en esta página.
                </p>
                <p className="text-gray-600">
                    Para finalizar, envíanos este resumen por WhatsApp junto con tu comprobante.
                </p>
                <a
                    href={`https://wa.me/?text=${whatsAppMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition"
                >
                    <MessageCircle /> Enviar por WhatsApp
                </a>
            </div>
        </Modal>
    );
};


// ==================================================================================
// 1. Order Menu View
// ==================================================================================

const DOMICILIO_FEE = 8000;
const DOMICILIO_ITEM_NAME = 'DOMICILIO';
const DOMICILIO_PRODUCT_REF = 'domicilio_fee';

const createDeliveryFeeItem = (): OrderItem => ({
    id: `domicilio-${Date.now()}`,
    produitRef: DOMICILIO_PRODUCT_REF,
    nom_produit: DOMICILIO_ITEM_NAME,
    prix_unitaire: DOMICILIO_FEE,
    quantite: 1,
    excluded_ingredients: [],
    commentaire: '',
    estado: 'en_attente',
});

const isDeliveryFeeItem = (item: OrderItem) =>
    item.produitRef === DOMICILIO_PRODUCT_REF || item.nom_produit?.toUpperCase() === DOMICILIO_ITEM_NAME;

const OrderMenuView: React.FC<{ onOrderSubmitted: (order: Order) => void }> = ({ onOrderSubmitted }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{product: Product, item?: OrderItem} | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clientInfo, setClientInfo] = useState({ nom: '', adresse: '', telephone: '' });
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<Order['payment_method']>('transferencia');
    const [submitting, setSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [hasProcessedQueuedReorder, setHasProcessedQueuedReorder] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    useEffect(() => {
        try {
            const historyJSON = localStorage.getItem('customer-order-history');
            if (historyJSON) {
                setOrderHistory(JSON.parse(historyJSON));
            }
        } catch (e) { console.error("Could not load order history", e); }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData] = await Promise.all([
                api.getProducts(),
                api.getCategories(),
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (err) {
            setError('No fue posible cargar el menú. Intenta nuevamente más tarde.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (loading || products.length === 0) return;
        if (orderHistory.length === 0 || hasProcessedQueuedReorder) return;
        const queuedReorderId = localStorage.getItem('customer-order-reorder-id');
        if (!queuedReorderId) return;
        const pastOrder = orderHistory.find(order => order.id === queuedReorderId);
        if (pastOrder) {
            handleReorder(pastOrder);
        }
        localStorage.removeItem('customer-order-reorder-id');
        setHasProcessedQueuedReorder(true);
    }, [orderHistory, hasProcessedQueuedReorder, loading, products]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                                <div key={product.id} onClick={() => product.estado === 'disponible' && handleProductClick(product)}
                                    className={`border rounded-2xl p-6 flex flex-col items-center text-center transition-shadow bg-white/90 shadow-md ${product.estado === 'disponible' ? 'cursor-pointer hover:shadow-xl' : 'opacity-50'}`}>
                                    <img src={product.image} alt={product.nom_produit} className="w-36 h-36 md:w-40 md:h-40 object-cover rounded-xl mb-4" />
                                    <p className="font-semibold text-lg flex-grow text-gray-800">{product.nom_produit}</p>
                                    <p className="text-base text-gray-600 mt-2 px-1 max-h-20 overflow-hidden">{product.description}</p>
                                    <p className="font-bold text-2xl text-gray-800 mt-3">{formatCurrencyCOP(product.prix_vente)}</p>
                                    {product.estado !== 'disponible' && <span className="text-xs text-red-500 font-bold mt-1">Agotado</span>}
                                </div>
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
                                    <label className="text-sm font-medium text-gray-700">Dirección de entrega</label>
                                    <input type="text" required value={clientInfo.adresse} onChange={e => setClientInfo({...clientInfo, adresse: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Número de teléfono</label>
                                    <input type="tel" required value={clientInfo.telephone} onChange={e => setClientInfo({...clientInfo, telephone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Método de pago</label>
                                    <select
                                        required
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value as Order['payment_method'])}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-white text-gray-700"
                                    >
                                        <option value="transferencia">Transferencia</option>
                                        <option value="efectivo" disabled>Efectivo - no disponible</option>
                                    </select>
                                </div>
                                <div className="text-sm font-semibold text-gray-700">Numero Nequi/BRE-B : 3238090562</div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Comprobante de transferencia</label>
                                    <label htmlFor="payment-proof-upload" className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm flex items-center gap-2 cursor-pointer bg-white text-gray-500">
                                        <Upload size={18} />
                                        <span>{paymentProof ? paymentProof.name : 'Selecciona un archivo...'}</span>
                                    </label>
                                    <input id="payment-proof-upload" type="file" required accept="image/*,.pdf" onChange={e => setPaymentProof(e.target.files ? e.target.files[0] : null)} className="hidden" />
                                </div>
                                <button type="submit" disabled={!clientInfo.nom || !clientInfo.telephone || !clientInfo.adresse || !paymentProof || !paymentMethod || submitting} className="w-full bg-brand-accent text-white font-bold py-3 rounded-lg text-lg hover:bg-red-700 transition disabled:bg-gray-400">
                                    {submitting ? 'Enviando...' : `Enviar el pedido (${formatCurrencyCOP(total)})`}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            {selectedProduct && (
                <ItemCustomizationModal 
                    isOpen={isModalOpen}
                    onClose={() => setModalOpen(false)}
                    onAddToCart={handleAddToCart}
                    product={selectedProduct.product}
                    item={selectedProduct.item}
                />
            )}
            
            {submittedOrder && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => {
                        onOrderSubmitted(submittedOrder);
                        setConfirmOpen(false);
                    }}
                    order={submittedOrder}
                    whatsAppMessage={generateWhatsAppMessage(submittedOrder)}
                />
            )}
        </>
    );
};


// ==================================================================================
// 3. Main Component
// ==================================================================================

const CommandeClient: React.FC = () => {
    const navigate = useNavigate();
    const [activeOrder, setActiveOrder] = useState(() => getActiveCustomerOrder());
    const activeOrderId = activeOrder?.orderId ?? null;
    const { content: siteContent, loading: siteContentLoading } = useSiteContent();
    const [content, setContent] = useState<SiteContent | null>(() => siteContent);

    useEffect(() => {
        if (siteContent) {
            setContent(siteContent);
        }
    }, [siteContent]);

    const assetsLibrary = content?.assets.library ?? [];
    useCustomFonts(assetsLibrary);

    if (!content) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-sm text-slate-500">
                    {siteContentLoading ? 'Chargement du contenu du site…' : 'Initialisation du contenu du site…'}
                </p>
            </div>
        );
    }

    const { hero, navigation, assets } = content;
    const brandLogo = navigation.brandLogo ?? '/logo-brand.svg';


    const heroBackgroundStyle = createHeroBackgroundStyle(hero.style, hero.backgroundImage);
    const navigationBackgroundStyle = createBackgroundStyle(navigation.style);
    const navigationTextStyle = createTextStyle(navigation.style);

    const handleOrderSubmitted = (order: Order) => {
        storeActiveCustomerOrder(order.id);
        setActiveOrder({ orderId: order.id });
    };

    const handleNewOrder = () => {
        clearActiveCustomerOrder();
        setActiveOrder(null);
    };

    return (
        <div style={heroBackgroundStyle} className="min-h-screen text-slate-100">
            <header
                className="shadow-md backdrop-blur p-4 sticky top-0 z-40 border-b border-white/40"
                style={navigationBackgroundStyle}
            >
                <div className="container mx-auto flex justify-between items-center" style={navigationTextStyle}>
                    <div className="flex items-center gap-3">
                        <img
                            src={brandLogo}
                            alt={`Logo ${navigation.brand}`}
                            className="h-10 w-10 rounded-full object-cover border border-white/30 bg-white/10"
                        />
                        <span className="text-2xl font-bold">{navigation.brand}</span>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
                        style={navigationTextStyle}
                    >
                        <ArrowLeft size={16}/> Volver al inicio
                    </button>
                </div>
            </header>

            {activeOrderId ? (
                <CustomerOrderTracker orderId={activeOrderId} onNewOrderClick={handleNewOrder} variant="page" />
            ) : (
                <OrderMenuView onOrderSubmitted={handleOrderSubmitted} />
            )}
        </div>
    );
};

export default CommandeClient;