import React, { useState, useEffect, useRef } from 'react';
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
            <div className="space-y-6">
                <div className="flex items-center justify-center">
                    <img
                        src={product.image}
                        alt={product.nom_produit}
                        className="w-40 h-40 object-cover rounded-lg"
                    />
                </div>

                <div>
                    <p className="text-gray-600 mb-2">{product.description}</p>
                    <p className="font-bold text-xl">{formatCurrencyCOP(product.prix_vente)}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                            <Minus size={16} />
                        </button>
                        <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                        <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios especiales</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Instrucciones especiales, alergias, etc."
                        rows={3}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            handleSave();
                            onClose();
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                        Añadir al carrito
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ==================================================================================
// 3. Order Menu View
// ==================================================================================

interface OrderMenuViewProps {
    onOrderSubmitted: (order: Order) => void;
}

const OrderMenuView: React.FC<OrderMenuViewProps> = ({ onOrderSubmitted }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load products and categories
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoriesData, productsData] = await Promise.all([
                    api.getCategories(),
                    api.getProducts(),
                ]);
                setCategories(categoriesData);
                setProducts(productsData.filter(product => product.estado === 'disponible'));
                
                // Set first category as selected
                if (categoriesData.length > 0) {
                    setSelectedCategory(categoriesData[0].id);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);

    // Load cart from local storage
    useEffect(() => {
        const savedCart = getActiveCustomerOrder();
        if (savedCart && Array.isArray(savedCart)) {
            setCart(savedCart);
        }
    }, []);

    // Save cart to local storage whenever it changes
    useEffect(() => {
        storeActiveCustomerOrder(cart);
    }, [cart]);

    const handleAddToCart = (product: Product) => {
        setSelectedProduct(product);
        setIsCustomizationModalOpen(true);
    };

    const handleAddCustomizedItemToCart = (item: OrderItem) => {
        setCart(prevCart => {
            // Check if the item already exists in the cart
            const existingItemIndex = prevCart.findIndex(cartItem => 
                cartItem.id === item.id
            );
            
            if (existingItemIndex >= 0) {
                // Update existing item
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex] = item;
                return updatedCart;
            } else {
                // Add new item
                return [...prevCart, item];
            }
        });
        
        setIsCartOpen(true);
    };

    const handleRemoveFromCart = (itemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    };

    const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            handleRemoveFromCart(itemId);
            return;
        }
        
        setCart(prevCart => 
            prevCart.map(item => 
                item.id === itemId 
                    ? { ...item, quantite: newQuantity } 
                    : item
            )
        );
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.prix_unitaire * item.quantite), 0);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPaymentReceipt(e.target.files[0]);
        }
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        
        setIsSubmitting(true);
        
        try {
            let receiptUrl = '';
            
            if (paymentMethod === 'transfer' && paymentReceipt) {
                receiptUrl = await uploadPaymentReceipt(paymentReceipt);
            }
            
            const timestamp = Date.now();
            const updatedItems = cart.map((item, index) => ({
                ...item,
                id: `oi${timestamp}-${index}`,
            }));
            
            const orderData: Order = {
                id: `order-${timestamp}`,
                items: updatedItems,
                clientInfo: {
                    nom: clientName,
                    telephone: clientPhone,
                    adresse: clientAddress,
                },
                payment_method: paymentMethod,
                payment_receipt_url: receiptUrl,
                total: calculateTotal(),
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            
            const createdOrder = await api.createOrder(orderData);
            setOrderId(createdOrder.id);
            setOrderSuccess(true);
            clearActiveCustomerOrder();
            setCart([]);
            onOrderSubmitted(createdOrder);
        } catch (err) {
            console.error('Error submitting order:', err);
            alert('Error al enviar el pedido. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCartItem = (item: OrderItem) => {
        const product = products.find(p => p.id === item.produitRef);
        if (product) {
            setSelectedProduct(product);
            setIsCustomizationModalOpen(true);
        }
    };

    const handleRestoreCart = async () => {
        const savedItems = getActiveCustomerOrder();
        if (!savedItems || !Array.isArray(savedItems) || savedItems.length === 0) {
            alert('No hay artículos guardados en el carrito');
            return;
        }

        const productIds = savedItems.map(item => item.produitRef);
        const availableProducts = products.filter(product => 
            productIds.includes(product.id) && product.estado === 'disponible'
        );

        const missingProducts = savedItems
            .filter(item => !availableProducts.some(product => product.id === item.produitRef))
            .map(item => item.nom_produit);

        const timestamp = Date.now();
        const updatedItems = savedItems.reduce((acc: OrderItem[], item, index) => {
            const product = availableProducts.find(p => p.id === item.produitRef);
            if (!product) return acc;

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
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Main content */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Notre Menu</h2>
                    </div>
                    
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                                    selectedCategory === category.id
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                    
                    {/* Products */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products
                            .filter(product => selectedCategory ? product.category_id === selectedCategory : true)
                            .map(product => (
                                <div 
                                    key={product.id}
                                    onClick={() => handleAddToCart(product)}
                                    className="border rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-shadow hover:shadow-xl bg-white/90"
                                >
                                    <img 
                                        src={product.image} 
                                        alt={product.nom_produit} 
                                        className="w-36 h-36 md:w-40 md:h-40 object-cover rounded-xl mb-4" 
                                    />
                                    <p className="font-semibold text-lg flex-grow">{product.nom_produit}</p>
                                    <p className="text-base text-gray-600 mt-2 px-1 max-h-20 overflow-hidden">
                                        {product.description}
                                    </p>
                                    <p className="font-bold text-2xl mt-3">
                                        {formatCurrencyCOP(product.prix_vente)}
                                    </p>
                                </div>
                            ))
                        }
                    </div>
                </div>
                
                {/* Cart sidebar for desktop */}
                <div id="cart-section" className="hidden md:block w-96 bg-white rounded-xl p-6 shadow-lg h-fit sticky top-8">
                    <h3 className="text-xl font-bold mb-4">Votre Commande</h3>
                    
                    {cart.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Tu carrito está vacío</p>
                    ) : (
                        <>
                            <div className="space-y-4 mb-6">
                                {cart.map(item => (
                                    <div key={item.id} className="flex gap-3">
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <p className="font-medium">{item.nom_produit}</p>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveFromCart(item.id);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <p className="text-gray-500">{formatCurrencyCOP(item.prix_unitaire)}</p>
                                            {item.commentaire && (
                                                <p className="text-xs text-gray-500 italic">{item.commentaire}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateQuantity(item.id, item.quantite - 1);
                                                    }}
                                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span>{item.quantite}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateQuantity(item.id, item.quantite + 1);
                                                    }}
                                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="border-t pt-4">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>{formatCurrencyCOP(calculateTotal())}</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsOrderModalOpen(true)}
                                className="w-full py-3 mt-6 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition"
                            >
                                Finalizar Pedido
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {/* Mobile cart button */}
            <div className="md:hidden fixed bottom-6 right-6">
                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition relative"
                >
                    <ShoppingCart size={24} />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                            {cart.reduce((total, item) => total + item.quantite, 0)}
                        </span>
                    )}
                </button>
            </div>
            
            {/* Mobile cart modal */}
            <Modal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} title="Tu Carrito">
                {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Tu carrito está vacío</p>
                ) : (
                    <>
                        <div className="space-y-4 mb-6">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <p className="font-medium">{item.nom_produit}</p>
                                            <button 
                                                onClick={() => handleRemoveFromCart(item.id)}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <p className="text-gray-500">{formatCurrencyCOP(item.prix_unitaire)}</p>
                                        {item.commentaire && (
                                            <p className="text-xs text-gray-500 italic">{item.commentaire}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <button 
                                                onClick={() => handleUpdateQuantity(item.id, item.quantite - 1)}
                                                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span>{item.quantite}</span>
                                            <button 
                                                onClick={() => handleUpdateQuantity(item.id, item.quantite + 1)}
                                                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="border-t pt-4">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>{formatCurrencyCOP(calculateTotal())}</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setIsCartOpen(false);
                                setIsOrderModalOpen(true);
                            }}
                            className="w-full py-3 mt-6 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition"
                        >
                            Finalizar Pedido
                        </button>
                    </>
                )}
            </Modal>
            
            {/* Item customization modal */}
            {selectedProduct && (
                <ItemCustomizationModal
                    isOpen={isCustomizationModalOpen}
                    onClose={() => setIsCustomizationModalOpen(false)}
                    onAddToCart={handleAddCustomizedItemToCart}
                    product={selectedProduct}
                />
            )}
            
            {/* Order form modal */}
            <Modal 
                isOpen={isOrderModalOpen} 
                onClose={() => !isSubmitting && setIsOrderModalOpen(false)} 
                title={orderSuccess ? "¡Pedido Confirmado!" : "Finalizar Pedido"}
            >
                {orderSuccess ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">¡Gracias por tu pedido!</h3>
                        <p className="mb-4">Tu número de pedido es: <span className="font-bold">{orderId?.slice(-6)}</span></p>
                        <p className="text-gray-600 mb-6">Te enviaremos actualizaciones sobre tu pedido por mensaje de texto.</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setIsOrderModalOpen(false);
                                    setOrderSuccess(false);
                                }}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega</label>
                            <input
                                type="text"
                                value={clientAddress}
                                onChange={(e) => setClientAddress(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={paymentMethod === 'cash'}
                                        onChange={() => setPaymentMethod('cash')}
                                    />
                                    <span>Efectivo</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={paymentMethod === 'transfer'}
                                        onChange={() => setPaymentMethod('transfer')}
                                    />
                                    <span>Transferencia</span>
                                </label>
                            </div>
                        </div>
                        
                        {paymentMethod === 'transfer' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante de pago</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                                    >
                                        <Upload size={16} />
                                        <span>{paymentReceipt ? paymentReceipt.name : 'Subir comprobante'}</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>{formatCurrencyCOP(calculateTotal())}</span>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => setIsOrderModalOpen(false)}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitOrder}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                                disabled={isSubmitting || !clientName || !clientPhone || !clientAddress || (paymentMethod === 'transfer' && !paymentReceipt)}
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// ==================================================================================
// 1. Main Component
// ==================================================================================

const CommandeClient: React.FC = () => {
    const navigate = useNavigate();
    const [activeOrder, setActiveOrder] = useState<{ orderId: string } | null>(null);
    const { content, loading } = useSiteContent();
    const activeOrderId = activeOrder?.orderId;
    
    // Load active order from local storage
    useEffect(() => {
        const orderId = getActiveCustomerOrder();
        if (orderId && typeof orderId === 'string') {
            setActiveOrder({ orderId });
        }
    }, []);

    // Load custom fonts
    useCustomFonts(content);

    if (!content) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }

    const navigation = content.navigation;
    const brandLogo = navigation.logo || '/logo-brand.svg';
    
    // Use default styles if content sections are not defined
    const defaultHeroStyle = {
        background: {
            type: 'color' as const,
            color: '#0f172a',
            image: null
        },
        textColor: '#ffffff',
        fontFamily: 'Inter',
        fontSize: '16px'
    };
    
    const heroStyle = content.hero || defaultHeroStyle;
    const heroBackgroundStyle = createHeroBackgroundStyle(heroStyle, null);
    
    const navigationBackgroundStyle = content.navigation && content.navigation.style ? 
        createBackgroundStyle(content.navigation.style) : 
        { backgroundColor: '#0f172a' };
        
    const navigationTextStyle = content.navigation && content.navigation.style ? 
        createTextStyle(content.navigation.style) : 
        { color: '#ffffff' };

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
