import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChefHat } from 'lucide-react';
import { api } from '../services/api';
import { KitchenTicket as KitchenTicketOrder } from '../types';
import { useAuth } from '../contexts/AuthContext';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles } from '../utils/orderUrgency';

const KitchenTicketCard: React.FC<{ order: KitchenTicketOrder; onReady: (orderId: string, ticketTimestamp?: number) => void; canMarkReady: boolean }> = ({ order, onReady, canMarkReady }) => {

    const urgencyStyles = getOrderUrgencyStyles(order.date_envoi_cuisine || Date.now());
    const groupedItems = useMemo(() => {
        type GroupedItem = {
            key: string;
            nom_produit: string;
            quantite: number;
            commentaire?: string;
        };

        const items: GroupedItem[] = [];
        const groupIndex = new Map<string, number>();

        order.items.forEach((item) => {
            const trimmedComment = item.commentaire?.trim();
            const commentKey = trimmedComment || 'no_comment';
            const baseKey = `${item.produitRef}::${commentKey}`;

            if (trimmedComment) {
                items.push({
                    key: `${baseKey}::${item.id}`,
                    nom_produit: item.nom_produit,
                    quantite: item.quantite,
                    commentaire: trimmedComment,
                });
                return;
            }

            const existingIndex = groupIndex.get(baseKey);

            if (existingIndex !== undefined) {
                items[existingIndex].quantite += item.quantite;
                return;
            }

            groupIndex.set(baseKey, items.length);
            items.push({
                key: baseKey,
                nom_produit: item.nom_produit,
                quantite: item.quantite,
            });
        });

        return items;
    }, [order.items]);

    const sentAt = new Date(order.date_envoi_cuisine || Date.now());
    const sentAtFormatted = sentAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex h-full flex-col overflow-hidden rounded-xl text-gray-900 shadow-lg transition-shadow duration-300 hover:shadow-xl ${urgencyStyles.border} ${urgencyStyles.background}`}>
            <header className="border-b border-gray-200 px-5 pt-5 pb-4">
                <div className="flex w-full flex-col gap-4">
                    <h3 className="w-full text-center text-xl font-semibold text-gray-900 sm:text-left sm:text-2xl truncate">
                        {order.table_nom || `Para llevar #${order.id.slice(-4)}`}
                    </h3>
                    <OrderTimer
                        startTime={order.date_envoi_cuisine || Date.now()}
                        className="w-full justify-center rounded-xl px-0 text-xl sm:justify-start sm:rounded-full sm:px-4 sm:text-2xl"
                    />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">
                <ul className="space-y-3">
                    {groupedItems.map((item) => (
                        <li key={item.key} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md ${urgencyStyles.accent}`}>
                                    {item.quantite}
                                </span>
                                <p className="text-2xl font-bold text-gray-900 truncate">{item.nom_produit}</p>
                            </div>
                            {item.commentaire && (
                                <p className="mt-2 rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium italic text-blue-800">
                                    {item.commentaire}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            <footer className="border-t border-gray-200 px-5 pb-5 pt-4">
                <div className="flex w-full flex-col gap-3">
                    <p className="text-xs text-gray-500">
                        Enviado {sentAtFormatted}
                    </p>
                    {canMarkReady && (
                        <button
                            onClick={() => onReady(order.id, order.date_envoi_cuisine)}
                            className="group inline-flex w-full items-center justify-center gap-3 rounded-lg border-2 border-transparent bg-black px-4 py-3 text-lg font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-2 hover:bg-neutral-900"
                        >
                            <ChefHat size={22} className="shrink-0" />
                            <span>LISTO</span>
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};


const Cuisine: React.FC = () => {
    // FIX: Define state for orders and loading within the component.
    // The errors "Cannot find name 'loading'" and "Cannot find name 'setLoading'"
    // suggest these state definitions were missing or out of scope.
    const [orders, setOrders] = useState<KitchenTicketOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { role } = useAuth();
    
    const canMarkReady = role?.permissions['/cocina'] === 'editor';
    
    // FIX: Define fetchOrders using useCallback within the component scope.
    // The error "Cannot find name 'fetchOrders'" suggests this function
    // was missing or defined outside the component's scope.
    const fetchOrders = useCallback(async () => {
        try {
            const data = await api.getKitchenOrders();
            setOrders(data);
        // FIX: The caught exception variable in a catch block defines its scope.
        // The error "Cannot find name 'error'" suggests a mismatch, for example,
        // `catch (e)` but then using `error`. Using `catch (error)` makes the `error`
        // variable available within the block.
        } catch (error) {
            console.error("Failed to fetch kitchen orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);

    const handleMarkAsReady = async (orderId: string, ticketTimestamp?: number) => {
        try {
            await api.markOrderAsReady(orderId, ticketTimestamp);
            fetchOrders(); // Refresh immediately
        } catch (error) {
            console.error("Failed to mark order as ready", error);
        }
    };

    // FIX: Use the 'loading' state variable that is defined within the component.
    if (loading) return <div className="text-gray-700">Cargando pedidos de cocina...</div>;

    return (
        <div className="flex h-full flex-col">
            {orders.length === 0 ? (
                <div className="mt-6 flex flex-1 items-center justify-center text-2xl text-gray-500">No hay pedidos en preparación.</div>
            ) : (
                <div className="mt-6 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {orders.map(order => (
                        <KitchenTicketCard key={order.ticketKey} order={order} onReady={handleMarkAsReady} canMarkReady={canMarkReady} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Cuisine;