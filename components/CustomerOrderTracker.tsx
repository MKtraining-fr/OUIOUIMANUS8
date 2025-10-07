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
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    <h2 className={`text-2xl font-bold mb-4 ${variant === 'hero' ? 'text-red-400' : 'text-red-600'}`}>Commande non trouvée</h2>
                    <p className={`${variant === 'hero' ? 'text-gray-200' : 'text-gray-600'} mb-6`}>Nous n'avons pas pu retrouver votre commande.</p>
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

                <div className="flex justify-between items-start mb-10 px-2">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isFinalStep = index === steps.length - 1;
                        const isCompleted = index < currentStep || (isFinalStep && isOrderCompleted);
                        const baseCircleClasses = "w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300";
                        const circleClasses = [
                            baseCircleClasses,
                            isCompleted ? 'bg-green-500 border-green-500 text-white' : '',
                            !isCompleted && isActive && index === 0 ? 'waiting-status-indicator' : '',
                            !isCompleted && isActive && index !== 0 ? 'bg-brand-primary border-brand-primary text-brand-secondary animate-pulse' : '',
                            !isCompleted && !isActive ? 'bg-gray-200 border-gray-300 text-gray-500' : '',
                        ].filter(Boolean).join(' ');
                        return (
                            <React.Fragment key={step.name}>
                                <div className="flex flex-col items-center text-center w-24">
                                    <div className={circleClasses}>
                                        <step.icon size={32} />
                                    </div>
                                    <p className={`mt-2 text-sm md:text-base font-semibold break-words ${isActive ? `font-bold ${variant === 'hero' ? 'text-brand-primary' : 'text-brand-primary'}` : `${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}`}>{step.name}</p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-2 mt-8 transition-colors duration-500 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                
                <div className={`${variant === 'hero' ? 'bg-black/20 p-4 rounded-lg' : 'border-t pt-6 mt-6'} space-y-4`}>
                    <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Résumé de la commande</h3>
                    <div className="space-y-2">
                        {order.items.map(item => (
                            <div key={item.id} className={`flex justify-between ${variant === 'hero' ? 'text-gray-200' : 'text-gray-600'}`}>
                                <span>{item.quantite}x {item.nom_produit}</span>
                                <span>{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
                            </div>
                        ))}
                    </div>
                    <div className={`flex justify-between font-bold text-lg border-t pt-2 ${variant === 'hero' ? 'text-white border-gray-500' : 'text-gray-800'}`}>
                        <span>Total</span>
                        <span>{formatCurrencyCOP(order.total)}</span>
                    </div>

                    <div className={`border-t pt-4 space-y-2 ${variant === 'hero' ? 'border-gray-500' : ''}`}>
                        <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><User size={16} className="mr-2"/>{order.clientInfo?.nom}</div>
                        <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><Phone size={16} className="mr-2"/>{order.clientInfo?.telephone}</div>
                        <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><MapPin size={16} className="mr-2"/>{order.clientInfo?.adresse}</div>
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
                    {order.statut === 'finalisee' ? (
                        <button onClick={onNewOrderClick} className={`${variant === 'hero' ? 'bg-gray-200 text-gray-800' : 'bg-brand-primary text-brand-secondary'} font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition`}>
                            Passer une nouvelle commande
                        </button>
                    ) : (
                        <p className={`text-sm ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                            Le statut de votre commande est mis à jour automatiquement.
                        </p>
                    )}
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
