import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { CheckCircle, ChefHat, FileText, PackageCheck, User, MapPin, Receipt, Phone } from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import {
    clearActiveCustomerOrder,
    getActiveCustomerOrder,
    ONE_DAY_IN_MS,
    storeActiveCustomerOrder,
} from '../services/customerOrderStorage';
import Modal from './Modal';

const saveOrderToHistory = (order: Order) => {
    try {
        const historyJSON = localStorage.getItem('customer-order-history');
        const history: Order[] = historyJSON ? JSON.parse(historyJSON) : [];
        const existingIndex = history.findIndex(h => h.id === order.id);

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(order); // Add to the beginning so most recent stays first

        const trimmedHistory = history.slice(0, 10); // Keep last 10 orders
        localStorage.setItem('customer-order-history', JSON.stringify(trimmedHistory));
    } catch (e) {
        console.error("Failed to save order to history:", e);
    }
};

interface CustomerOrderTrackerProps {
  orderId: string;
  onNewOrderClick: () => void;
  variant?: 'page' | 'hero';
}

const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({ orderId, onNewOrderClick, variant = 'page' }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);

    const steps = [
        { name: 'Enviado', icon: FileText },
        { name: 'Validado', icon: CheckCircle },
        { name: 'En preparacion', icon: ChefHat },
        { name: 'Listo', icon: PackageCheck }
    ];

    const getCurrentStepIndex = useCallback((order: Order | null): number => {
        if (!order) return -1;

        if (
            order.statut === 'finalisee' ||
            order.estado_cocina === 'servido' ||
            order.estado_cocina === 'entregada' ||
            order.estado_cocina === 'listo'
        ) {
            return 3;
        }

        if (order.estado_cocina === 'recibido') {
            return 2;
        }

        if (order.statut === 'en_cours') {
            return 1;
        }

        if (order.statut === 'pendiente_validacion' || order.estado_cocina === 'no_enviado') {
            return 0;
        }

        return -1;
    }, []);

    const currentStep = useMemo(() => getCurrentStepIndex(order), [order, getCurrentStepIndex]);

    useEffect(() => {
        let isMounted = true;
        let interval: ReturnType<typeof setInterval>;

        const fetchStatus = async () => {
            try {
                const orderStatus = await api.getCustomerOrderStatus(orderId);
                if (isMounted) {
                    setOrder(orderStatus);
                    if (
                        orderStatus?.statut === 'finalisee' ||
                        orderStatus?.estado_cocina === 'servido' ||
                        orderStatus?.estado_cocina === 'entregada'
                    ) {
                        if (interval) clearInterval(interval);
                        saveOrderToHistory(orderStatus);
                        const servedAt = orderStatus.date_servido ?? Date.now();
                        storeActiveCustomerOrder(orderStatus.id, servedAt + ONE_DAY_IN_MS);
                    }
                    if (!orderStatus) {
                        const active = getActiveCustomerOrder();
                        if (active?.orderId === orderId) {
                            clearActiveCustomerOrder();
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch order status", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchStatus();
        interval = setInterval(fetchStatus, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [orderId]);

    const isOrderCompleted =
        order?.statut === 'finalisee' ||
        order?.estado_cocina === 'servido' ||
        order?.estado_cocina === 'entregada' ||
        order?.estado_cocina === 'listo';

    const containerClasses = variant === 'page'
      ? "container mx-auto p-4 lg:p-8"
      : "flex-1 flex flex-col justify-center items-center text-center text-white p-4 bg-black bg-opacity-60 w-full";
      
    const contentClasses = variant === 'page'
      ? "bg-white/95 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto"
      : "max-w-4xl mx-auto";

    if (loading) {
        return <div className={containerClasses}>Chargement du suivi de commande...</div>;
    }

    if (!order) {
        // If order is not found and variant is hero (on home page), display nothing or a subtle message
        if (variant === 'hero') {
            return null; // Or a subtle message like 'No active order found.'
        }
        // For 'page' variant (on /commande-client), display the original message
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    <h2 className={`text-2xl font-bold mb-4 text-red-600`}>Commande non trouvée</h2>
                    <p className={`text-gray-600 mb-6`}>Nous n'avons pas pu retrouver votre commande.</p>
                    <button onClick={onNewOrderClick} className="bg-brand-primary text-brand-secondary font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition">
                        Passer une nouvelle commande
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <>
        <div className={containerClasses}>
            <div className={contentClasses}>
                <h2 className={`text-3xl font-bold text-center mb-2 ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Suivi de votre commande</h2>
                <p className={`text-center font-semibold mb-8 ${variant === 'hero' ? 'text-gray-300' : 'text-gray-500'}`}>Commande #{order.id.slice(-6)}</p>

                <div className="flex items-center mb-10 px-2">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isFinalStep = index === steps.length - 1;
                        const isCompleted = index < currentStep || (isFinalStep && isOrderCompleted);
                        
                        return (
                            <React.Fragment key={step.name}>
                                <div className="flex flex-col items-center">
                                    <div className={`flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 transition-all duration-500 ${
                                        isCompleted ? 'bg-green-500 border-green-300' :
                                        isActive ? 'bg-blue-600 border-blue-400 animate-pulse' :
                                        'bg-gray-400 border-gray-300'
                                    }`}>
                                        <step.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${variant === 'hero' ? 'text-white' : 'text-white'}`} />
                                    </div>
                                    <p className={`mt-2 text-xs sm:text-sm font-semibold text-center ${
                                        isCompleted || isActive ? `${variant === 'hero' ? 'text-white' : 'text-gray-800'}` : `${variant === 'hero' ? 'text-gray-400' : 'text-gray-400'}`
                                    }`}>{step.name}</p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-1.5 ${variant === 'hero' ? 'bg-gray-600' : 'bg-gray-300'} rounded-full mx-2 sm:mx-4 relative overflow-hidden`}>
                                        <div
                                            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-1000"
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        ></div>
                                        {isActive && (
                                            <div
                                                className="absolute top-0 left-0 h-full bg-blue-500"
                                                style={{ 
                                                    width: '50%',
                                                    animation: 'progress-bar-pulse 2s ease-in-out infinite'
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                <style>{`
                    @keyframes progress-bar-pulse {
                        0% { transform: translateX(-100%); opacity: 0.8; }
                        50% { opacity: 1; }
                        100% { transform: translateX(200%); opacity: 0.8; }
                    }
                    
                    .stamp-container {
                        position: relative;
                        width: 180px;
                        height: 180px;
                        animation: stamp-appear 0.5s ease-out;
                    }
                    
                    @keyframes stamp-appear {
                        0% {
                            transform: scale(0) rotate(-45deg);
                            opacity: 0;
                        }
                        60% {
                            transform: scale(1.1) rotate(0deg);
                        }
                        100% {
                            transform: scale(1) rotate(0deg);
                            opacity: 1;
                        }
                    }
                    
                    .stamp-border {
                        width: 100%;
                        height: 100%;
                        border: 4px solid #dc2626;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(220, 38, 38, 0.05);
                        position: relative;
                        box-shadow: 0 0 0 2px #dc2626;
                    }
                    
                    .stamp-border::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        border-radius: 50%;
                        background: repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 2px,
                            rgba(220, 38, 38, 0.03) 2px,
                            rgba(220, 38, 38, 0.03) 4px
                        );
                    }
                    
                    .stamp-inner {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        z-index: 1;
                    }
                    
                    .stamp-text {
                        font-family: 'Arial Black', 'Arial Bold', sans-serif;
                        font-weight: 900;
                        color: #dc2626;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        line-height: 1;
                        text-shadow: 
                            1px 1px 0 rgba(220, 38, 38, 0.3),
                            -1px -1px 0 rgba(220, 38, 38, 0.3);
                    }
                    
                    .stamp-text:first-child {
                        font-size: 20px;
                        margin-bottom: 6px;
                    }
                    
                    .stamp-text-large {
                        font-size: 42px;
                        font-weight: 900;
                    }
                    
                    /* Effet de texture grunge */
                    .stamp-border::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        border-radius: 50%;
                        background-image: 
                            radial-gradient(circle at 20% 30%, transparent 0%, transparent 2%, rgba(220, 38, 38, 0.1) 2%, transparent 3%),
                            radial-gradient(circle at 80% 70%, transparent 0%, transparent 2%, rgba(220, 38, 38, 0.1) 2%, transparent 3%),
                            radial-gradient(circle at 40% 80%, transparent 0%, transparent 1%, rgba(220, 38, 38, 0.1) 1%, transparent 2%),
                            radial-gradient(circle at 60% 20%, transparent 0%, transparent 1%, rgba(220, 38, 38, 0.1) 1%, transparent 2%);
                        opacity: 0.8;
                    }
                `}</style>
                
                <div className={`${variant === 'hero' ? 'bg-black/20 p-4 rounded-lg' : 'border-t pt-6 mt-6'} space-y-4 relative`}>
                    {/* Tampon PEDIDO LISTO */}
                    {isOrderCompleted && (
                        <div className="absolute top-4 right-4 z-10 pointer-events-none">
                            <div className="relative" style={{ transform: 'rotate(15deg)' }}>
                                <div className="stamp-container">
                                    <div className="stamp-border">
                                        <div className="stamp-inner">
                                            <span className="stamp-text">PEDIDO</span>
                                            <span className="stamp-text stamp-text-large">LISTO</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Résumé de la commande</h3>
                    <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                            order.items.map(item => {
                                const isDomicilio = item.nom_produit === 'Domicilio';
                                const isFreeShipping = isDomicilio && item.prix_unitaire === 0;
                                
                                return (
                                    <div key={item.id} className={`flex justify-between items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-600'}`}>
                                        <span>{item.quantite}x {item.nom_produit}</span>
                                        {isFreeShipping ? (
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-sm ${variant === 'hero' ? 'text-gray-400' : 'text-gray-400'} line-through`}>{formatCurrencyCOP(8000)}</span>
                                                <span className="text-sm font-bold text-green-600">GRATIS</span>
                                            </div>
                                        ) : (
                                            <span>{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className={`${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>Aucun article enregistré pour cette commande.</p>
                        )}
                    </div>
                    
                    {/* Affichage du subtotal, des promotions et des codes promo */}
                    {(order.subtotal !== undefined && order.subtotal !== null && order.subtotal !== order.total) && (
                        <div className={`flex justify-between ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>Subtotal</span>
                            <span>{formatCurrencyCOP(order.subtotal)}</span>
                        </div>
                    )}

                    {order.promo_code && order.total_discount && order.total_discount > 0 && (
                        <div className={`flex justify-between items-center ${variant === 'hero' ? 'text-green-400' : 'text-green-600'}`}>
                            <span className="text-sm">🎟️ Code promo: {order.promo_code}</span>
                            <span className="text-sm font-semibold">-{formatCurrencyCOP(order.total_discount)}</span>
                        </div>
                    )}
                    

                    
                    <div className={`flex justify-between font-bold text-lg border-t pt-2 ${variant === 'hero' ? 'text-white border-gray-500' : 'text-gray-800'}`}>
                        <span>Total</span>
                        <span>{formatCurrencyCOP(order.total)}</span>
                    </div>

                    <div className={`border-t pt-4 space-y-2 ${variant === 'hero' ? 'border-gray-500' : ''}`}>
                        <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'} mb-2`}>Informations Client</h3>
                        <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><User size={16} className="mr-2"/>{order.clientInfo?.nom}</div>
                        <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><Phone size={16} className="mr-2"/>{order.clientInfo?.telephone}</div>
                        {order.clientInfo?.adresse && (
                            <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><MapPin size={16} className="mr-2"/>{order.clientInfo?.adresse}</div>
                        )}
                        {order.receipt_url && (
                            <button onClick={() => setReceiptModalOpen(true)} className="flex items-center text-blue-400 hover:underline"><Receipt size={16} className="mr-2"/>Voir le justificatif</button>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center space-y-4">
                    {isOrderCompleted && (
                        <div className="flex justify-center">
                            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                                <CheckCircle size={16} /> Pedido listo
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col space-y-4">
                        <p className={`text-sm ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                            Le statut de votre commande est mis à jour automatiquement.
                        </p>
                        <button 
                            onClick={isOrderCompleted ? onNewOrderClick : undefined} 
                            disabled={!isOrderCompleted}
                            className={`font-bold py-3 px-6 rounded-lg transition ${
                                isOrderCompleted 
                                    ? `${variant === 'hero' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-brand-primary text-brand-secondary hover:bg-brand-primary-dark'} cursor-pointer` 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <Modal isOpen={isReceiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="Justificatif de Paiement">
            {order.receipt_url ? 
                <img src={order.receipt_url} alt="Justificatif" className="w-full h-auto rounded-md" /> :
                <p>Aucun justificatif fourni.</p>
            }
        </Modal>
        </>
    );
};

export default CustomerOrderTracker;
