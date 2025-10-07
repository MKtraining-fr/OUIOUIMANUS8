import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { Order, OrderItem } from '../types';
import { Eye, User, MapPin, Phone } from 'lucide-react';
import Modal from '../components/Modal';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles } from '../utils/orderUrgency';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';


const TakeawayCard: React.FC<{ order: Order, onValidate?: (orderId: string) => void, onDeliver?: (orderId: string) => void, isProcessing?: boolean }> = ({ order, onValidate, onDeliver, isProcessing }) => {
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const displayName = order.table_nom || `Pedido #${order.id.slice(-6)}`;
    const timerStart = order.date_envoi_cuisine || order.date_creation;
    const urgencyStyles = getOrderUrgencyStyles(timerStart);
    const urgencyLabelMap: Record<typeof urgencyStyles.level, string> = {
        normal: 'Normal',
        warning: 'En seguimiento',
        critical: 'Crítico',
    };

    return (
        <>
            <div className={`relative flex h-full flex-col overflow-hidden rounded-xl border text-gray-900 shadow-md transition-shadow duration-300 hover:shadow-lg ${urgencyStyles.border} ${urgencyStyles.background}`}>
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${urgencyStyles.accent}`} />
                <header className="border-b border-gray-200 px-5 pt-5 pb-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <h4 className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight text-gray-900">{displayName}</h4>
                                <p className="text-xs text-gray-500">
                                    Pedido enviado {new Date(timerStart).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${urgencyStyles.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${urgencyStyles.accent}`} />
                                <span>{urgencyLabelMap[urgencyStyles.level]}</span>
                            </span>
                        </div>
                        <OrderTimer startTime={timerStart} className="text-sm sm:text-base" />
                    </div>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {order.clientInfo && (
                        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
                            {order.clientInfo.nom && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-900">
                                        <User size={16} className={urgencyStyles.icon} />
                                        <span className="font-medium">{order.clientInfo.nom}</span>
                                    </div>
                                    {order.clientInfo.telephone && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                                            <Phone size={14} className="text-gray-500" />
                                            <span>{order.clientInfo.telephone}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {order.clientInfo.adresse && (
                                <div className="flex items-start gap-2 text-sm text-gray-700">
                                    <MapPin size={16} className={`mt-0.5 text-gray-500 ${urgencyStyles.icon}`} />
                                    <span className="text-gray-700">{order.clientInfo.adresse}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Artículos</h5>
                        {order.items.length > 0 ? (
                            <ul className="space-y-2">
                                {order.items.map((item: OrderItem) => {
                                    const note = item.commentaire?.trim();
                                    return (
                                        <li key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md ${urgencyStyles.accent}`}>
                                                        {item.quantite}
                                                    </span>
                                                    <span className="font-semibold text-gray-900">{item.nom_produit}</span>
                                                </div>
                                                <span className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
                                            </div>
                                            {note && (
                                                <p className="mt-2 rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium italic text-blue-800">
                                                    {note}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 shadow-sm">
                                Este pedido aún no tiene artículos registrados.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900 shadow-sm">
                        <span>Total</span>
                        <span className="text-lg sm:text-xl text-gray-900">{formatCurrencyCOP(order.total)}</span>
                    </div>
                </div>

                <footer className="border-t border-gray-200 px-5 pb-5 pt-4">
                    {order.statut === 'pendiente_validacion' && onValidate && (
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsReceiptModalOpen(true)}
                                className="w-full ui-btn ui-btn-secondary"
                                type="button"
                            >
                                <Eye size={16} className={urgencyStyles.icon} /> {order.receipt_url ? 'Ver comprobante' : 'Comprobante no disponible'}
                            </button>
                            <button
                                onClick={() => onValidate(order.id)}
                                disabled={isProcessing}
                                className="w-full ui-btn ui-btn-info uppercase"
                                type="button"
                            >
                                {isProcessing ? 'Validando...' : 'Validar'}
                            </button>
                        </div>
                    )}
                    {order.estado_cocina === 'listo' && onDeliver && (
                        <button
                            onClick={() => onDeliver(order.id)}
                            disabled={isProcessing}
                            className="w-full ui-btn ui-btn-success uppercase"
                            type="button"
                        >
                            {isProcessing ? 'Procesando...' : 'Entregar'}
                        </button>
                    )}
                </footer>
            </div>
            <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Comprobante de pago">
                {order.receipt_url ? (
                    <img src={order.receipt_url} alt="Comprobante" className="w-full h-auto rounded-md" />
                ) : (
                    <p>No se proporcionó comprobante.</p>
                )}
            </Modal>
        </>
    );
};


const ParaLlevar: React.FC = () => {
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [readyOrders, setReadyOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        // Don't set loading to true on refetches for a smoother experience
        try {
            const { pending, ready } = await api.getTakeawayOrders();
            setPendingOrders(pending.sort((a,b) => a.date_creation - b.date_creation));
            setReadyOrders(ready.sort((a,b) => (a.date_listo_cuisine || 0) - (b.date_listo_cuisine || 0)));
        } catch (error) {
            console.error("Failed to fetch takeaway orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // Poll for new orders
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);
    
    const handleValidate = async (orderId: string) => {
        if (processingOrderId) return; // Prevent multiple actions at once
        setProcessingOrderId(orderId);
        try {
            await api.validateTakeawayOrder(orderId);
            await fetchOrders(); // Refresh immediately after action
        } catch (error: any) {
            console.error("Failed to validate order:", error);
            alert(`No se pudo validar el pedido: ${error.message}`);
        } finally {
            setProcessingOrderId(null);
        }
    };
    
    const handleDeliver = async (orderId: string) => {
        if (processingOrderId) return; // Prevent multiple actions at once
        setProcessingOrderId(orderId);
        try {
            await api.markTakeawayAsDelivered(orderId);
            await fetchOrders(); // Refresh immediately after action
        } catch (error) {
            console.error("Failed to mark order as delivered:", error);
            alert('Ocurrió un error al finalizar el pedido.');
        } finally {
            setProcessingOrderId(null);
        }
    };

    if (loading) return <div className="text-gray-700">Cargando pedidos para llevar...</div>;

    return (
        <div className="space-y-6">
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Column for validation */}
                <div className="bg-gray-100 p-4 rounded-xl">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-blue-700">Pendientes de validación ({pendingOrders.length})</h2>
                    <div className="space-y-4">
                        {pendingOrders.length > 0 ? pendingOrders.map(order => (
                            <TakeawayCard key={order.id} order={order} onValidate={handleValidate} isProcessing={processingOrderId === order.id} />
                        )) : <p className="text-center text-gray-500 py-8">No hay pedidos para validar.</p>}
                    </div>
                </div>

                {/* Column for ready orders */}
                <div className="bg-gray-100 p-4 rounded-xl">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-green-700">Pedidos listos ({readyOrders.length})</h2>
                    <div className="space-y-4">
                        {readyOrders.length > 0 ? readyOrders.map(order => (
                            <TakeawayCard key={order.id} order={order} onDeliver={handleDeliver} isProcessing={processingOrderId === order.id} />
                        )) : <p className="text-center text-gray-500 py-8">No hay pedidos listos.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParaLlevar;