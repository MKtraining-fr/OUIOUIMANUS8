import React from 'react';
import { Check, DollarSign, MessageSquare, MinusCircle, PlusCircle, Send } from 'lucide-react';
import type { Order, OrderItem } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';

export type CategorizedOrderItems = {
    pending: { item: OrderItem; index: number }[];
    sent: { item: OrderItem; index: number }[];
};

export interface OrderSummaryProps {
    categorizedItems: CategorizedOrderItems;
    order: Order; // Ajout de l'objet Order complet
    total: number;
    onQuantityChange: (itemIndex: number, change: number) => void;
    onCommentChange: (itemIndex: number, newComment: string) => void;
    onPersistComment: (itemIndex: number) => void;
    onStartEditingComment: (itemId: string) => void;
    onSendToKitchen: () => void | Promise<void>;
    onServeOrder: () => void | Promise<void>;
    onOpenPayment: () => void;
    isSending: boolean;
    hasPending: boolean;
    orderStatus: Order["estado_cocina"];
    editingCommentId: string | null;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
    categorizedItems,
    total,
    onQuantityChange,
    onCommentChange,
    onPersistComment,
    onStartEditingComment,
    onSendToKitchen,
    onServeOrder,
    onOpenPayment,
    isSending,
    hasPending,
    orderStatus,
    editingCommentId,
}) => {
    const totalItemsCount = categorizedItems.pending.length + categorizedItems.sent.length;

    return (
        <div className="ui-card flex flex-col">
            <div className="p-4 border-b">
                <h2 className="text-2xl font-semibold text-brand-secondary">Commande</h2>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {totalItemsCount === 0 ? (
                    <p className="text-gray-500">La commande est vide.</p>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-brand-secondary">Articles à envoyer</h3>
                                <span className="text-sm text-gray-500">{categorizedItems.pending.length}</span>
                            </div>
                            {categorizedItems.pending.length === 0 ? (
                                <p className="text-sm text-gray-500">Aucun article en attente.</p>
                            ) : (
                                categorizedItems.pending.map(({ item, index }) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-yellow-100">
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-base font-bold text-white shadow-md">
                                                    {item.quantite}
                                                </span>
                                                <p className="font-bold text-gray-900">
                                                    {item.nom_produit}
                                                </p>
                                            </div>
                                            <p className="font-bold text-gray-900 whitespace-nowrap">
                                                {formatCurrencyCOP(item.quantite * item.prix_unitaire)}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-sm text-gray-700">
                                                {formatCurrencyCOP(item.prix_unitaire)} /u
                                            </p>
                                            <div className="flex items-center space-x-2 text-gray-800">
                                                <button onClick={() => onQuantityChange(index, -1)} className="p-1">
                                                    <MinusCircle size={20} />
                                                </button>
                                                <span className="font-bold w-6 text-center">{item.quantite}</span>
                                                <button onClick={() => onQuantityChange(index, 1)} className="p-1">
                                                    <PlusCircle size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        {editingCommentId === item.id || item.commentaire ? (
                                            <input
                                                type="text"
                                                placeholder="Ajouter un commentaire..."
                                                value={item.commentaire ?? ''}
                                                onChange={(event) => onCommentChange(index, event.target.value)}
                                                onBlur={() => onPersistComment(index)}
                                                autoFocus={editingCommentId === item.id}
                                                className="mt-2 ui-input text-sm"
                                            />
                                        ) : (
                                            <button
                                                onClick={() => onStartEditingComment(item.id)}
                                                className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <MessageSquare size={12} /> Ajouter un commentaire
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {categorizedItems.sent.length > 0 && (
                            <div className="space-y-3 pt-6 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-brand-secondary">Envoyés en cuisine</h3>
                                    <span className="text-sm text-gray-500">{categorizedItems.sent.length}</span>
                                </div>
                                {categorizedItems.sent.map(({ item }) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-green-100">
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-base font-bold text-white shadow-md">
                                                    {item.quantite}
                                                </span>
                                                <p className="font-bold text-gray-900">
                                                    {item.nom_produit}
                                                </p>
                                            </div>
                                            <p className="font-bold text-gray-900 whitespace-nowrap">
                                                {formatCurrencyCOP(item.quantite * item.prix_unitaire)}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2">
                                            {formatCurrencyCOP(item.prix_unitaire)} /u
                                        </p>
                                        {item.commentaire && (
                                            <p className="mt-2 text-sm italic text-gray-600 pl-2">"{item.commentaire}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="p-4 border-t space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-gray-700">
                        <span>Sous-total</span>
                        <span>{formatCurrencyCOP(order.subtotal ?? 0)}</span>
                    </div>
                    {order.total_discount && order.total_discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Réduction totale</span>
                            <span>- {formatCurrencyCOP(order.total_discount)}</span>
                        </div>
                    )}
                    {order.shipping_cost !== undefined && order.shipping_cost > 0 && (
                        <div className="flex justify-between text-gray-700">
                            <span>Frais de livraison</span>
                            <span>{formatCurrencyCOP(order.shipping_cost)}</span>
                        </div>
                    )}
                    {order.shipping_cost === 0 && order.applied_promotions?.some(p => p.type === 'FREE_SHIPPING') && (
                        <div className="flex justify-between text-green-600">
                            <span>Livraison gratuite</span>
                            <span>{formatCurrencyCOP(0)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-2xl font-semibold text-brand-secondary border-t pt-2 mt-2">
                        <span>Total</span>
                        <span>{formatCurrencyCOP(total)}</span>
                    </div>
                </div>

                {orderStatus === 'listo' && (
                    <button onClick={onServeOrder} className="w-full ui-btn-info justify-center py-3">
                        <Check size={20} />
                        <span>Entregada</span>
                    </button>
                )}

                <div className="flex space-x-2">
                    <button
                        onClick={onSendToKitchen}
                        disabled={isSending || !hasPending}
                        className="flex-1 ui-btn-accent justify-center py-3 disabled:opacity-60"
                    >
                        <Send size={20} />
                        <span>{isSending ? 'Synchronisation…' : 'Envoyer en Cuisine'}</span>
                    </button>
                    <button
                        onClick={onOpenPayment}
                        disabled={orderStatus !== 'servido'}
                        className="flex-1 ui-btn-success justify-center py-3 disabled:opacity-60"
                    >
                        <DollarSign size={20} />
                        <span>Finaliser</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;
