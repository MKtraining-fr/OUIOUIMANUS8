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
import { createBackgroundStyle, createHeroBackgroundStyle, createTextStyle } from '../utils/siteStyleHelpers';
import useSiteContent from '../hooks/useSiteContent';

const CommandeClient: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { content, loading: contentLoading } = useSiteContent();

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
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Load cart from local storage
  useEffect(() => {
    const savedCart = getActiveCustomerOrder();
    if (savedCart) {
      setCart(savedCart);
    }
  }, []);

  // Save cart to local storage whenever it changes
  useEffect(() => {
    storeActiveCustomerOrder(cart);
  }, [cart]);

  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id);
      
      if (existingItem) {
        return prevCart.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...prevCart, { 
          product_id: product.id, 
          product_name: product.nom_produit,
          product_price: product.prix_vente,
          quantity: 1,
          notes: ''
        }];
      }
    });
    
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.product_id === productId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };

  const handleUpdateNotes = (productId: string, notes: string) => {
    setCart(prevCart => 
      prevCart.map(item => 
        item.product_id === productId 
          ? { ...item, notes } 
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product_price * item.quantity), 0);
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
      
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        payment_method: paymentMethod,
        payment_receipt_url: receiptUrl,
        items: cart,
        total: calculateTotal(),
        status: 'pending',
        order_type: 'delivery'
      };
      
      const order = await api.createOrder(orderData);
      setOrderNumber(order.order_number);
      setOrderSuccess(true);
      clearActiveCustomerOrder();
      setCart([]);
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenHistory = async () => {
    try {
      if (customerPhone) {
        const history = await api.getOrdersByPhone(customerPhone);
        setOrderHistory(history);
        setIsHistoryModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
    }
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedHistoryOrder(order);
    setIsDetailsModalOpen(true);
  };

  const filteredProducts = selectedCategory 
    ? products.filter(product => product.category_id === selectedCategory)
    : products;

  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  const renderHero = () => {
    if (contentLoading || !content) return null;
    
    const heroContent = content.hero_content;
    const heroStyle = createHeroBackgroundStyle(content);
    
    return (
      <div className="relative w-full h-64 md:h-80 mb-8 rounded-xl overflow-hidden" style={heroStyle}>
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center p-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={createTextStyle(content)}>
            {heroContent?.title || "Commandez en ligne"}
          </h1>
          <p className="text-xl text-white max-w-2xl">
            {heroContent?.subtitle || "Découvrez nos délicieux tacos et commandez directement en ligne"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={createBackgroundStyle(content)}>
      <div className="container mx-auto px-4 py-8">
        {renderHero()}
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Notre Menu</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                >
                  <ArrowLeft size={16} />
                  <span>Retour</span>
                </button>
                
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition relative"
                >
                  <ShoppingCart size={16} />
                  <span>Panier</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                      {cart.reduce((total, item) => total + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
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
              {filteredProducts.map(product => (
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
              ))}
            </div>
          </div>
          
          {/* Cart sidebar for desktop */}
          <div className="hidden md:block w-96 bg-white rounded-xl p-6 shadow-lg h-fit sticky top-8">
            <h3 className="text-xl font-bold mb-4">Votre Commande</h3>
            
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Tu carrito está vacío</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map(item => {
                    const product = getProductById(item.product_id);
                    return (
                      <div key={item.product_id} className="flex gap-3">
                        {product && (
                          <img 
                            src={product.image} 
                            alt={item.product_name} 
                            className="w-16 h-16 object-cover rounded-lg" 
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="font-medium">{item.product_name}</p>
                            <button 
                              onClick={() => handleRemoveFromCart(item.product_id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <p className="text-gray-500">{formatCurrencyCOP(item.product_price)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button 
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
      </div>
      
      {/* Mobile cart modal */}
      <Modal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} title="Tu Carrito">
        {cart.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Tu carrito está vacío</p>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {cart.map(item => {
                const product = getProductById(item.product_id);
                return (
                  <div key={item.product_id} className="flex gap-3">
                    {product && (
                      <img 
                        src={product.image} 
                        alt={item.product_name} 
                        className="w-16 h-16 object-cover rounded-lg" 
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium">{item.product_name}</p>
                        <button 
                          onClick={() => handleRemoveFromCart(item.product_id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="text-gray-500">{formatCurrencyCOP(item.product_price)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Notas especiales"
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateNotes(item.product_id, e.target.value)}
                        className="mt-2 w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  </div>
                );
              })}
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
            <p className="mb-4">Tu número de pedido es: <span className="font-bold">{orderNumber}</span></p>
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
              <button
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setOrderSuccess(false);
                  setIsTrackerOpen(true);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Seguir mi pedido
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
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
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
            
            <div className="flex justify-between pt-4">
              {customerPhone && (
                <button
                  onClick={handleOpenHistory}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <History size={16} />
                  <span>Mis pedidos</span>
                </button>
              )}
              
              <div className="flex gap-2 ml-auto">
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
                  disabled={isSubmitting || !customerName || !customerPhone || !customerAddress || (paymentMethod === 'transfer' && !paymentReceipt)}
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Order tracker modal */}
      <Modal isOpen={isTrackerOpen} onClose={() => setIsTrackerOpen(false)} title="Seguimiento de Pedido">
        <CustomerOrderTracker orderNumber={orderNumber} />
      </Modal>
      
      {/* Order history modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Mis Pedidos">
        {orderHistory.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No tienes pedidos anteriores</p>
        ) : (
          <div className="space-y-4">
            {orderHistory.map(order => (
              <div 
                key={order.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleViewOrderDetails(order)}
              >
                <div className="flex justify-between">
                  <p className="font-medium">Pedido #{order.order_number}</p>
                  <p className={`text-sm ${
                    order.status === 'completed' ? 'text-green-500' : 
                    order.status === 'cancelled' ? 'text-red-500' : 'text-orange-500'
                  }`}>
                    {order.status === 'pending' ? 'Pendiente' : 
                     order.status === 'preparing' ? 'En preparación' :
                     order.status === 'ready' ? 'Listo' :
                     order.status === 'delivering' ? 'En camino' :
                     order.status === 'completed' ? 'Entregado' : 'Cancelado'}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString()} - {formatCurrencyCOP(order.total)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {order.items.reduce((total, item) => total + item.quantity, 0)} productos
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
      
      {/* Order details modal */}
      <Modal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        title={`Detalles del Pedido #${selectedHistoryOrder?.order_number}`}
      >
        {selectedHistoryOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p>{new Date(selectedHistoryOrder.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <p className={`${
                  selectedHistoryOrder.status === 'completed' ? 'text-green-500' : 
                  selectedHistoryOrder.status === 'cancelled' ? 'text-red-500' : 'text-orange-500'
                }`}>
                  {selectedHistoryOrder.status === 'pending' ? 'Pendiente' : 
                   selectedHistoryOrder.status === 'preparing' ? 'En preparación' :
                   selectedHistoryOrder.status === 'ready' ? 'Listo' :
                   selectedHistoryOrder.status === 'delivering' ? 'En camino' :
                   selectedHistoryOrder.status === 'completed' ? 'Entregado' : 'Cancelado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p>{selectedHistoryOrder.customer_address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Método de pago</p>
                <p>{selectedHistoryOrder.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="font-medium mb-2">Productos</p>
              <div className="space-y-2">
                {selectedHistoryOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <p>
                      {item.quantity}x {item.product_name}
                      {item.notes && <span className="text-sm text-gray-500 block">{item.notes}</span>}
                    </p>
                    <p>{formatCurrencyCOP(item.product_price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatCurrencyCOP(selectedHistoryOrder.total)}</span>
              </div>
            </div>
            
            {selectedHistoryOrder.status === 'pending' && (
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setIsTrackerOpen(true);
                    setOrderNumber(selectedHistoryOrder.order_number);
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  <MessageCircle size={16} />
                  <span>Seguir pedido</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Floating cart button for mobile */}
      <div className="md:hidden fixed bottom-6 right-6">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition relative"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {cart.reduce((total, item) => total + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CommandeClient;
