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
import ProductCardWithPromotion from '../components/ProductCardWithPromotion';
import PromotionBannerCarousel from '../components/promotions/PromotionBannerCarousel';
import PromoCodeInput from '../components/promotions/PromoCodeInput';
import usePromoCode from '../hooks/usePromoCode';
import DiscountDetails from '../components/promotions/DiscountDetails';

// ==================================================================================
// 2. Item Customization Modal
// ==================================================================================

interface ItemCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onAddToCart: (item: OrderItem) => void;
  existingItem?: OrderItem;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({ isOpen, onClose, product, onAddToCart, existingItem }) => {
  const [quantity, setQuantity] = useState(existingItem?.quantite || 1);
  const [comment, setComment] = useState(existingItem?.commentaire || '');
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>(existingItem?.excluded_ingredients || []);

  useEffect(() => {
    if (isOpen) {
      setQuantity(existingItem?.quantite || 1);
      setComment(existingItem?.commentaire || '');
      setExcludedIngredients(existingItem?.excluded_ingredients || []);
    }
  }, [isOpen, existingItem]);

  const handleAddToCart = () => {
    onAddToCart({
      id: existingItem?.id || `oi${Date.now()}`,
      produitRef: product.id,
      nom_produit: product.nom_produit,
      prix_unitaire: product.prix_vente,
      quantite: quantity,
      excluded_ingredients: excludedIngredients,
      commentaire: comment,
      estado: 'en_attente',
    });
  };

  const toggleIngredient = (ingredient: string) => {
    setExcludedIngredients(prev => 
      prev.includes(ingredient) 
        ? prev.filter(i => i !== ingredient) 
        : [...prev, ingredient]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.nom_produit}>
      <div className="space-y-4">
        <div className="flex justify-center">
          <img src={product.image} alt={product.nom_produit} className="w-40 h-40 object-cover rounded-lg" />
        </div>
        
        <p className="text-gray-600">{product.description}</p>
        
        <div className="border-t border-b py-3">
          <p className="font-bold text-xl text-gray-800">{formatCurrencyCOP(product.prix_vente)}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
          <div className="flex items-center">
            <button 
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
            >
              <Minus size={16}/>
            </button>
            <span className="mx-4 font-bold text-lg w-6 text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(prev => prev + 1)}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
            >
              <Plus size={16}/>
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
          <textarea 
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            rows={2}
            placeholder="Instrucciones especiales..."
          />
        </div>
        
        <button 
          onClick={handleAddToCart}
          className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary-dark transition"
        >
          Agregar al carrito - {formatCurrencyCOP(product.prix_vente * quantity)}
        </button>
      </div>
    </Modal>
  );
};

// ==================================================================================
// 3. Order Confirmation Modal
// ==================================================================================

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ isOpen, onClose, order }) => {
  const navigate = useNavigate();
  
  const handleGoToTracking = () => {
    navigate('/');
    onClose();
  };
  
  const whatsappMessage = generateWhatsAppMessage(order);
  const whatsappUrl = `https://wa.me/+573000000000?text=${whatsappMessage}`;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="¡Pedido enviado!">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle className="text-green-500" size={48} />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-800">Tu pedido ha sido recibido</h3>
        <p className="text-gray-600">Hemos recibido tu pedido y lo estamos procesando. Te notificaremos cuando esté listo.</p>
        
        <div className="border-t pt-4 mt-4">
          <p className="font-semibold text-gray-700">Número de pedido: #{order.id.slice(-6)}</p>
          <p className="text-gray-600">Total: {formatCurrencyCOP(order.total)}</p>
        </div>
        
        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={handleGoToTracking}
            className="bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary-dark transition"
          >
            Seguir mi pedido
          </button>
          
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition"
          >
            <MessageCircle /> Enviar por WhatsApp
          </a>
        </div>
      </div>
    </Modal>
  );
};


// ==================================================================================
// 1. Order Menu View
// ==================================================================================

const DOMICILIO_FEE = 8000;
const DOMICILIO_ITEM_NAME = 'DOMICILIO';
// Use empty string instead of 'domicilio_fee' since produit_id will be null for special items
const DOMICILIO_PRODUCT_REF = '';

const createDeliveryFeeItem = (): OrderItem => ({
  id: `domicilio-${Date.now()}`,
  produitRef: DOMICILIO_PRODUCT_REF, // Empty string will be converted to null in API
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
  const { promoCode, promoCodePromotion, applyPromoCode, removePromoCode } = usePromoCode();

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

  // Calcul du sous-total (avant réduction)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);
  }, [cart]);
  
  // Calcul de la réduction si un code promo est appliqué
  const discount = useMemo(() => {
    if (!promoCodePromotion) return 0;
    
    // Calcul de la réduction en fonction du type de promotion
    if (promoCodePromotion.type === 'percentage') {
      const percentageValue = promoCodePromotion.discount.value || 0;
      return Math.round(subtotal * (percentageValue / 100));
    } else if (promoCodePromotion.type === 'fixed_amount') {
      return Math.min(subtotal, promoCodePromotion.discount.value || 0);
    }
    
    return 0;
  }, [subtotal, promoCodePromotion]);
  
  // Calcul du total avec frais de livraison et réduction
  const total = useMemo(() => {
    const subtotalWithDiscount = subtotal - discount;
    if (cart.length === 0) {
      return subtotalWithDiscount;
    }
    return subtotalWithDiscount + DOMICILIO_FEE;
  }, [subtotal, discount, cart.length]);

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
        // Ajouter les informations de promotion si un code promo est appliqué
        promo_code: promoCode || undefined,
        promo_id: promoCodePromotion?.id || undefined,
        discount_amount: discount || undefined,
        subtotal: subtotal,
        total_with_discount: total,
      };
      const newOrder = await api.submitCustomerOrder(orderData);
      setSubmittedOrder(newOrder);
      setConfirmOpen(true);
      setCart([]);
      setClientInfo({nom: '', adresse: '', telephone: ''});
      setPaymentProof(null);
      setPaymentMethod('transferencia');
      removePromoCode(); // Réinitialiser le code promo
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
          
          {/* Carrousel de bannières promotionnelles */}
          <PromotionBannerCarousel 
            onPromotionClick={(promotion) => {
              // Si c'est un code promo, l'ajouter au panier
              if (promotion.type === 'promo_code' && promotion.conditions.promo_code) {
                // Logique à implémenter dans la phase 4
              }
            }}
          />

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
            
            {/* Affichage des détails de la réduction si un code promo est appliqué */}
            {discount > 0 && (
              <DiscountDetails
                subtotal={subtotal}
                discount={discount}
                total={total}
                promotion={promoCodePromotion}
                className="mb-3"
              />
            )}
            
            {/* Total */}
            <div className="flex justify-between text-xl font-bold text-gray-700">
              <span>Total</span>
              <span>{formatCurrencyCOP(total)}</span>
            </div>
            
            {/* Champ de code promo */}
            {cart.length > 0 && (
              <PromoCodeInput
                onApply={applyPromoCode}
                onRemove={removePromoCode}
                appliedCode={promoCode || undefined}
                disabled={submitting}
              />
            )}

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
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value as Order['payment_method'])}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-gray-700 bg-white"
                  >
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Comprobante de pago</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-primary">
                          <span>Subir un archivo</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) setPaymentProof(file);
                            }}
                            required={paymentMethod === 'transferencia'}
                          />
                        </label>
                        <p className="pl-1">o arrastra y suelta</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF hasta 10MB
                      </p>
                      {paymentProof && (
                        <p className="text-xs text-green-500">
                          Archivo seleccionado: {paymentProof.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary-dark transition disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Enviando...' : 'Enviar pedido'}
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
          product={selectedProduct.product}
          onAddToCart={handleAddToCart}
          existingItem={selectedProduct.item}
        />
      )}

      {submittedOrder && (
        <OrderConfirmationModal 
          isOpen={isConfirmOpen} 
          onClose={() => setConfirmOpen(false)} 
          order={submittedOrder}
        />
      )}
    </>
  );
};

// ==================================================================================
// 0. Main Component
// ==================================================================================

const CommandeClient: React.FC = () => {
  const navigate = useNavigate();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const { content } = useSiteContent();
  const { navigationTextStyle } = useCustomFonts();
  
  useEffect(() => {
    const orderId = getActiveCustomerOrder();
    if (orderId) {
      setActiveOrderId(orderId);
    }
  }, []);
  
  const handleOrderSubmitted = (order: Order) => {
    // Store order in history
    try {
      const historyJSON = localStorage.getItem('customer-order-history');
      const history = historyJSON ? JSON.parse(historyJSON) : [];
      const updatedHistory = [order, ...history].slice(0, 10); // Keep only last 10 orders
      localStorage.setItem('customer-order-history', JSON.stringify(updatedHistory));
    } catch (e) { console.error("Could not save order history", e); }
  };
  
  const handleNewOrder = () => {
    clearActiveCustomerOrder();
    setActiveOrderId(null);
  };
  
  return (
    <div className="min-h-screen bg-cover bg-center" style={createBackgroundStyle(content?.background_image)}>
      <header className="bg-slate-900/80 backdrop-blur-sm shadow-lg">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={content?.logo_url || '/logo.png'} alt="OUIOUITACOS" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-bold text-white">OUIOUITACOS</h1>
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
