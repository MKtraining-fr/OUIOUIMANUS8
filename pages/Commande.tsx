import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { uploadPaymentReceipt } from '../services/cloudinary';
import { Order, Product, Category, OrderItem, Ingredient } from '../types';
import { ArrowLeft } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import Modal from '../components/Modal';
import { createOrderItemsSnapshot, areOrderItemSnapshotsEqual, type OrderItemsSnapshot } from '../utils/orderSync';
import ProductGrid from '../components/commande/ProductGrid';
import OrderSummary from '../components/commande/OrderSummary';
import ItemCustomizationModal, { type ItemCustomizationResult } from '../components/commande/ItemCustomizationModal';

const isPersistedItemId = (value?: string) =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const cloneOrder = (order: Order): Order => JSON.parse(JSON.stringify(order));

const generateTempId = (() => {
    let counter = 0;
    return () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `tmp-${crypto.randomUUID()}`;
        }

        counter += 1;
        return `tmp-${Date.now()}-${counter}`;
    };
})();

const normalizeComment = (value?: string | null) => (value ?? '').trim();

const haveSameExcludedIngredients = (a: string[] = [], b: string[] = []) => {
    if (a.length !== b.length) {
        return false;
    }

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    return sortedA.every((value, index) => value === sortedB[index]);
};

export const mergeProductIntoPendingItems = (
    items: OrderItem[],
    product: Product,
    result: ItemCustomizationResult,
    generateId: () => string,
    defaultExcludedIngredients: string[] = [],
): OrderItem[] => {
    const trimmedComment = normalizeComment(result.comment);
    const sanitizedQuantity = Number.isFinite(result.quantity)
        ? Math.max(1, Math.floor(result.quantity))
        : 1;

    // Chercher un item existant compatible, même avec un ID temporaire
    const existingIndex = items.findIndex(
        item => item.produitRef === product.id
            && item.estado === 'en_attente'
            && normalizeComment(item.commentaire) === trimmedComment
            && haveSameExcludedIngredients(item.excluded_ingredients ?? [], defaultExcludedIngredients),
    );

    if (existingIndex > -1) {
        return items.map((item, index) => (
            index === existingIndex
                ? { ...item, quantite: item.quantite + sanitizedQuantity }
                : item
        ));
    }

    const newItem: OrderItem = {
        id: generateId(),
        produitRef: product.id,
        nom_produit: product.nom_produit,
        prix_unitaire: product.prix_vente,
        quantite: sanitizedQuantity,
        excluded_ingredients: [...defaultExcludedIngredients],
        commentaire: trimmedComment,
        estado: 'en_attente',
    };

    return [...items, newItem];
};

type OrderItemsSnapshotCache = {
    source: OrderItem[];
    snapshot: OrderItemsSnapshot;
};

const EMPTY_ORDER_ITEMS_SNAPSHOT = createOrderItemsSnapshot([]);

const Commande: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [originalOrder, setOriginalOrder] = useState<Order | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isExitConfirmOpen, setExitConfirmOpen] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
    const [selectedProductForCustomization, setSelectedProductForCustomization] = useState<Product | null>(null);

    const orderRef = useRef<Order | null>(order);
    const originalOrderRef = useRef<Order | null>(originalOrder);
    const serverOrderRef = useRef<Order | null>(null);
    const pendingServerOrderRef = useRef<Order | null>(null);
    const itemsSyncTimeoutRef = useRef<number | null>(null);
    const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
    const currentItemsSnapshotCacheRef = useRef<OrderItemsSnapshotCache | null>(null);
    const originalItemsSnapshotCacheRef = useRef<OrderItemsSnapshotCache | null>(null);

    const updateSnapshotCache = useCallback((
        cacheRef: MutableRefObject<OrderItemsSnapshotCache | null>,
        items: OrderItem[] | undefined,
        snapshot?: OrderItemsSnapshot,
    ): OrderItemsSnapshot => {
        if (!items || items.length === 0) {
            cacheRef.current = null;
            return EMPTY_ORDER_ITEMS_SNAPSHOT;
        }

        const computedSnapshot = snapshot ?? createOrderItemsSnapshot(items);
        cacheRef.current = { source: items, snapshot: computedSnapshot };
        return computedSnapshot;
    }, []);

    const getCachedSnapshot = useCallback((
        items: OrderItem[] | undefined,
        cacheRef: MutableRefObject<OrderItemsSnapshotCache | null>,
    ): OrderItemsSnapshot => {
        if (!items || items.length === 0) {
            cacheRef.current = null;
            return EMPTY_ORDER_ITEMS_SNAPSHOT;
        }

        const cachedSnapshot = cacheRef.current;
        if (cachedSnapshot && cachedSnapshot.source === items) {
            return cachedSnapshot.snapshot;
        }

        return updateSnapshotCache(cacheRef, items);
    }, [updateSnapshotCache]);

    useEffect(() => {
        orderRef.current = order;
    }, [order]);

    useEffect(() => {
        originalOrderRef.current = originalOrder;
    }, [originalOrder]);

    const isOrderSynced = useCallback((comparisonOrder?: Order | null) => {
        const currentOrder = orderRef.current;
        if (!currentOrder) {
            return true;
        }

        const referenceOrder = comparisonOrder ?? originalOrderRef.current;
        if (!referenceOrder) {
            return true;
        }

        const currentSnapshot = getCachedSnapshot(currentOrder.items, currentItemsSnapshotCacheRef);
        const referenceSnapshot = comparisonOrder
            ? createOrderItemsSnapshot(referenceOrder.items)
            : getCachedSnapshot(referenceOrder.items, originalItemsSnapshotCacheRef);

        return areOrderItemSnapshotsEqual(referenceSnapshot, currentSnapshot);
    }, [getCachedSnapshot]);

    const applyPendingServerSnapshot = useCallback(() => {
        const pendingOrder = pendingServerOrderRef.current;
        if (!pendingOrder) {
            return;
        }

        const pendingItemsSnapshot = createOrderItemsSnapshot(pendingOrder.items);
        serverOrderRef.current = cloneOrder(pendingOrder);

        const currentOrder = orderRef.current;
        if (currentOrder) {
            const currentSnapshot = getCachedSnapshot(currentOrder.items, currentItemsSnapshotCacheRef);
            if (areOrderItemSnapshotsEqual(currentSnapshot, pendingItemsSnapshot)) {
                pendingServerOrderRef.current = null;
                return;
            }
        }

        pendingServerOrderRef.current = null;
        orderRef.current = pendingOrder;
        setOrder(pendingOrder);
        updateSnapshotCache(currentItemsSnapshotCacheRef, pendingOrder.items, pendingItemsSnapshot);

        const originalSnapshot = cloneOrder(pendingOrder);
        originalOrderRef.current = originalSnapshot;
        setOriginalOrder(originalSnapshot);
        updateSnapshotCache(originalItemsSnapshotCacheRef, originalSnapshot.items);
    }, [getCachedSnapshot, updateSnapshotCache]);

    const fetchOrderData = useCallback(async (isRefresh = false) => {
        if (!tableId) return;
        
        try {
            if (!isRefresh) setLoading(true);

            if (isRefresh) {
                const orderData = await api.createOrGetOrderByTableId(tableId);
                const serverSnapshot = cloneOrder(orderData);
                serverOrderRef.current = serverSnapshot;
                const shouldSyncState = isOrderSynced();

                if (shouldSyncState) {
                    pendingServerOrderRef.current = null;
                    setOrder(orderData);
                    orderRef.current = orderData;
                    updateSnapshotCache(currentItemsSnapshotCacheRef, orderData.items);

                    const originalSnapshot = cloneOrder(orderData);
                    originalOrderRef.current = originalSnapshot;
                    setOriginalOrder(originalSnapshot);
                    updateSnapshotCache(originalItemsSnapshotCacheRef, originalSnapshot.items);
                } else {
                    const confirmedOrder = originalOrderRef.current;
                    if (confirmedOrder && JSON.stringify(confirmedOrder) === JSON.stringify(orderData)) {
                        pendingServerOrderRef.current = null;
                    } else {
                        pendingServerOrderRef.current = serverSnapshot;
                    }
                }
                return;
            }

            const [orderData, productsData, categoriesData, ingredientsData] = await Promise.all([
                api.createOrGetOrderByTableId(tableId),
                api.getProducts(),
                api.getCategories(),
                api.getIngredients(),
            ]);
            serverOrderRef.current = cloneOrder(orderData);
            setOrder(orderData);
            orderRef.current = orderData;
            updateSnapshotCache(currentItemsSnapshotCacheRef, orderData.items);
            const originalSnapshot = cloneOrder(orderData);
            setOriginalOrder(originalSnapshot);
            originalOrderRef.current = originalSnapshot;
            updateSnapshotCache(originalItemsSnapshotCacheRef, originalSnapshot.items);
            setProducts(productsData);
            setCategories(categoriesData);
            setIngredients(ingredientsData);
            pendingServerOrderRef.current = null;
        } catch (error) {
            console.error("Failed to load order data", error);
            navigate('/ventes');
        } finally {
            if (!isRefresh) setLoading(false);
        }
    }, [isOrderSynced, navigate, tableId, updateSnapshotCache]);

    useEffect(() => {
        // Charger les données initiales uniquement
        // Le refresh automatique est désactivé pour éviter les conflits lors des modifications
        fetchOrderData();
    }, [fetchOrderData]);

    useEffect(() => {
        if (isOrderSynced()) {
            applyPendingServerSnapshot();
        }
    }, [applyPendingServerSnapshot, isOrderSynced, order, originalOrder]);

    useEffect(() => {
        const unsubscribe = api.notifications.subscribe('orders_updated', () => fetchOrderData(true));
        return () => unsubscribe();
    }, [fetchOrderData]);
    
    const hasUnsentChanges = useMemo(() => !isOrderSynced(), [isOrderSynced, order, originalOrder]);

    const productQuantitiesInCart = useMemo(() => {
        if (!order) return {};
        return order.items.reduce((acc, item) => {
            if (item.estado !== 'en_attente') {
                return acc;
            }

            acc[item.produitRef] = (acc[item.produitRef] || 0) + item.quantite;
            return acc;
        }, {} as { [key: string]: number });
    }, [order]);

    const filteredProducts = useMemo(() => {
        if (activeCategoryId === 'all') {
            return products;
        }

        return products.filter(product => product.categoria_id === activeCategoryId);
    }, [activeCategoryId, products]);


    const isProductAvailable = useCallback((product: Product): boolean => {
        if (!product.recipe || product.recipe.length === 0) return true;

        for (const recipeItem of product.recipe) {
            const ingredient = ingredients.find(i => i.id === recipeItem.ingredient_id);
            if (!ingredient) return false;

            if (ingredient.stock_actuel <= ingredient.stock_minimum) {
                return false;
            }
        }
        return true;
    }, [ingredients]);
    
    type OrderItemsUpdater = OrderItem[] | ((items: OrderItem[]) => OrderItem[]);

    useEffect(() => () => {
        if (itemsSyncTimeoutRef.current !== null) {
            window.clearTimeout(itemsSyncTimeoutRef.current);
            itemsSyncTimeoutRef.current = null;
        }
    }, []);

    const updateOrderItems = useCallback(async (
        updater: OrderItemsUpdater,
        options?: { isLocalUpdate?: boolean; removalSourceItems?: OrderItem[] }
    ) => {
        const currentOrder = orderRef.current;
        if (!currentOrder) return;

        const computeItems = (items: OrderItem[]) => typeof updater === 'function'
            ? (updater as (prevItems: OrderItem[]) => OrderItem[])(items)
            : updater;

        const optimisticSourceItemsBase = options?.isLocalUpdate
            ? currentOrder.items
            : options?.removalSourceItems ?? currentOrder.items;
        const optimisticSourceItems = optimisticSourceItemsBase.map(item => ({ ...item }));
        const optimisticItems = computeItems(optimisticSourceItems);
        const optimisticOrder: Order = {
            ...currentOrder,
            items: optimisticItems,
            total: optimisticItems.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0),
        };

        setOrder(optimisticOrder);
        orderRef.current = optimisticOrder;
        updateSnapshotCache(currentItemsSnapshotCacheRef, optimisticOrder.items);

        if (options?.isLocalUpdate) return;

        const runServerSync = async () => {
            try {
                let baseOrder = pendingServerOrderRef.current ?? serverOrderRef.current ?? null;

                if (!baseOrder) {
                    const latestOrder = await api.getOrderById(currentOrder.id);
                    if (latestOrder) {
                        baseOrder = latestOrder;
                        serverOrderRef.current = cloneOrder(latestOrder);
                    } else {
                        baseOrder = currentOrder;
                    }
                }

                if (!baseOrder) {
                    return;
                }

                // Utiliser directement l'état local actuel qui contient tous les changements accumulés
                // au lieu de recalculer en appliquant l'updater sur une base obsolète
                const finalItems = orderRef.current.items.map(item => ({ ...item }));
                const removalSourceItems = options?.removalSourceItems ?? currentOrder.items;
                const removedItemIds = removalSourceItems
                    .filter(item => isPersistedItemId(item.id) && !finalItems.some(finalItem => finalItem.id === item.id))
                    .map(item => item.id);

                const updatedOrder = await api.updateOrder(
                    currentOrder.id,
                    {
                        items: finalItems,
                        removedItemIds,
                    },
                    { includeNotifications: false },
                );
                setOrder(updatedOrder);
                orderRef.current = updatedOrder;
                updateSnapshotCache(currentItemsSnapshotCacheRef, updatedOrder.items);
                const updatedOriginalSnapshot = cloneOrder(updatedOrder);
                setOriginalOrder(updatedOriginalSnapshot);
                originalOrderRef.current = updatedOriginalSnapshot;
                updateSnapshotCache(originalItemsSnapshotCacheRef, updatedOriginalSnapshot.items);
                serverOrderRef.current = cloneOrder(updatedOrder);

                void api.getIngredients()
                    .then(setIngredients)
                    .catch(error => {
                        console.error("Failed to refresh ingredients", error);
                    });
                applyPendingServerSnapshot();
            } catch (error) {
                console.error("Failed to update order:", error);
                alert("Une erreur est survenue lors de la mise à jour de la commande.");
                fetchOrderData(true);
            }
        };

        syncQueueRef.current = syncQueueRef.current.then(runServerSync, runServerSync);
        await syncQueueRef.current;
    }, [applyPendingServerSnapshot, fetchOrderData, updateSnapshotCache]);

    const scheduleItemsSync = useCallback((delay = 300) => {
        if (itemsSyncTimeoutRef.current !== null) {
            window.clearTimeout(itemsSyncTimeoutRef.current);
        }

        const effectiveDelay = delay > 0 ? delay : 1;

        itemsSyncTimeoutRef.current = window.setTimeout(async () => {
            itemsSyncTimeoutRef.current = null;
            if (!orderRef.current) return;

            const snapshotItems = orderRef.current.items.map(item => ({ ...item }));
            const removalSourceItems = serverOrderRef.current
                ? serverOrderRef.current.items.map(item => ({ ...item }))
                : snapshotItems.map(item => ({ ...item }));

            await updateOrderItems(snapshotItems, { removalSourceItems });
        }, effectiveDelay);
    }, [updateOrderItems]);

    const applyLocalItemsUpdate = useCallback((updater: OrderItemsUpdater) => {
        const currentOrder = orderRef.current;
        if (!currentOrder) return;

        updateOrderItems(updater, { isLocalUpdate: true });
        scheduleItemsSync();
    }, [scheduleItemsSync, updateOrderItems]);

    const handleProductSelection = useCallback((product: Product) => {
        setSelectedProductForCustomization(product);
    }, []);

    const closeCustomizationModal = useCallback(() => {
        setSelectedProductForCustomization(null);
    }, []);

    const handleSaveCustomizedProduct = useCallback((result: ItemCustomizationResult) => {
        if (!selectedProductForCustomization) {
            return;
        }

        applyLocalItemsUpdate(items =>
            mergeProductIntoPendingItems(items, selectedProductForCustomization, result, generateTempId),
        );
        setSelectedProductForCustomization(null);
    }, [applyLocalItemsUpdate, selectedProductForCustomization]);

    const handleQuantityChange = useCallback((itemIndex: number, change: number) => {
        const currentOrder = orderRef.current;
        if (!currentOrder || !currentOrder.items[itemIndex]) return;
        
        const targetItemId = currentOrder.items[itemIndex].id;
        
        applyLocalItemsUpdate(items => {
            const actualIndex = items.findIndex(item => item.id === targetItemId);
            if (actualIndex === -1) return items;
            
            const newQuantity = items[actualIndex].quantite + change;

            if (newQuantity <= 0) {
                return items.filter(item => item.id !== targetItemId);
            }
            
            return items.map(item => 
                item.id === targetItemId 
                    ? { ...item, quantite: newQuantity }
                    : item
            );
        });
    }, [applyLocalItemsUpdate]);

    const handleCommentChange = useCallback((itemIndex: number, newComment: string) => {
        const currentOrder = orderRef.current;
        if (!currentOrder || !currentOrder.items[itemIndex]) return;
        
        const targetItemId = currentOrder.items[itemIndex].id;
        
        updateOrderItems(items => {
            const actualIndex = items.findIndex(item => item.id === targetItemId);
            if (actualIndex === -1) return items;
            
            const updatedItems = items.map(item => ({ ...item }));
            const itemToUpdate = updatedItems[actualIndex];

            if (itemToUpdate.quantite > 1 && !itemToUpdate.commentaire && newComment) {
                itemToUpdate.quantite -= 1;
                const newItemWithComment = {
                    ...itemToUpdate,
                    id: generateTempId(),
                    quantite: 1,
                    commentaire: newComment,
                };
                updatedItems.push(newItemWithComment);
                setEditingCommentId(newItemWithComment.id);
            } else {
                itemToUpdate.commentaire = newComment;
            }

            return updatedItems;
        }, { isLocalUpdate: true });
    }, [updateOrderItems]);

    const persistCommentChange = useCallback((itemIndex: number) => {
        if (!orderRef.current) return;
        updateOrderItems(orderRef.current.items.map(item => ({ ...item })));
        setEditingCommentId(null);
    }, [updateOrderItems]);

    const handleSendToKitchen = useCallback(async () => {
        if (!orderRef.current) return;

        setIsSendingToKitchen(true);

        try {
            let latestOrder = orderRef.current;

            while (latestOrder && latestOrder.items.some(item => item.estado === 'en_attente' && !isPersistedItemId(item.id))) {
                await updateOrderItems(latestOrder.items.map(item => ({ ...item })));
                latestOrder = orderRef.current;
            }

            latestOrder = orderRef.current;
            if (!latestOrder) return;

            const pendingItems = latestOrder.items.filter(item => item.estado === 'en_attente');
            if (pendingItems.length === 0) return;

            const nonPersistedItems = pendingItems.filter(item => !isPersistedItemId(item.id));
            if (nonPersistedItems.length > 0) {
                console.warn('Des articles non persistés subsistent après synchronisation, envoi annulé.');
                return;
            }

            const itemsToSend = pendingItems.map(item => item.id);

            const updatedOrder = await api.sendOrderToKitchen(latestOrder.id, itemsToSend);
            setOrder(updatedOrder);
            orderRef.current = updatedOrder;
            updateSnapshotCache(currentItemsSnapshotCacheRef, updatedOrder.items);
            const syncedOriginal = cloneOrder(updatedOrder);
            setOriginalOrder(syncedOriginal);
            originalOrderRef.current = syncedOriginal;
            updateSnapshotCache(originalItemsSnapshotCacheRef, syncedOriginal.items);
            navigate('/ventes');
        } catch (error) {
            console.error("Failed to send order to kitchen", error);
            alert("Erreur lors de l'envoi en cuisine.");
        } finally {
            setIsSendingToKitchen(false);
        }
    }, [navigate, updateOrderItems, updateSnapshotCache]);

    const handleServeOrder = useCallback(async () => {
        if (!order) return;
        try {
            const updatedOrder = await api.markOrderAsServed(order.id);
            setOrder(updatedOrder);
            orderRef.current = updatedOrder;
            updateSnapshotCache(currentItemsSnapshotCacheRef, updatedOrder.items);
        } catch (error) {
            console.error("Failed to mark order as served", error);
        }
    }, [order, updateSnapshotCache]);
    
    const handleFinalizeOrder = async (paymentMethod: Order['payment_method'], receiptFile?: File | null) => {
        if (!order) return;
        try {
            let receiptUrl = order.payment_receipt_url ?? undefined;
            
            // Only upload receipt if a file is provided
            if (receiptFile && receiptFile instanceof File) {
                try {
                    receiptUrl = await uploadPaymentReceipt(receiptFile, { orderId: order.id });
                } catch (uploadError) {
                    console.error("Failed to upload receipt", uploadError);
                    // Continue with finalization even if upload fails
                    // The receipt can be added later if needed
                }
            }
            
            await api.finalizeOrder(order.id, paymentMethod, receiptUrl);
            navigate('/ventes');
        } catch (error) {
            console.error("Failed to finalize order", error);
            alert("Erreur lors de la finalisation de la commande. Veuillez réessayer.");
        }
    };
    
    const handleExitAttempt = () => {
        if (order && order.estado_cocina === 'no_enviado' && order.items.length > 0) {
            setExitConfirmOpen(true);
            return;
        }

        if (hasUnsentChanges) {
            setExitConfirmOpen(true);
        } else {
            navigate('/ventes');
        }
    };

    const handleConfirmExit = async () => {
        try {
            if (order && order.estado_cocina === 'no_enviado') {
                await api.cancelUnsentTableOrder(order.id);
            } else if (originalOrder && !isOrderSynced(originalOrder)) {
                await updateOrderItems(originalOrder.items);
            }
        } catch (error) {
            console.error('Failed to cancel unsent order before exiting', error);
        } finally {
            setExitConfirmOpen(false);
            navigate('/ventes');
        }
    };

    const orderItems = order?.items ?? [];

    const categorizedItems = useMemo(() => {
        return orderItems.reduce<{ pending: { item: OrderItem; index: number }[]; sent: { item: OrderItem; index: number }[] }>((acc, item, index) => {
            if (item.estado === 'en_attente') {
                acc.pending.push({ item, index });
            } else {
                acc.sent.push({ item, index });
            }
            return acc;
        }, { pending: [], sent: [] });
    }, [orderItems]);

    const handleProductPointerDown = useCallback(
        (_product: Product) => (event: React.PointerEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.currentTarget.focus();
        },
        [],
    );

    const handleProductKeyDown = useCallback((product: Product) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleProductSelection(product);
        }
    }, [handleProductSelection]);

    const handleOpenPaymentModal = useCallback(() => {
        setIsPaymentModalOpen(true);
    }, []);

    const startEditingComment = useCallback((itemId: string) => {
        setEditingCommentId(itemId);
    }, []);

    const hasPendingItems = useMemo(() => categorizedItems.pending.length > 0, [categorizedItems]);

    if (loading) return <div className="text-center p-10 text-gray-800">Chargement de la commande...</div>;
    if (!order) return <div className="text-center p-10 text-red-500">Commande non trouvée.</div>;

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
            {/* Menu Section */}
            <div className="lg:col-span-2 ui-card flex flex-col">
                <div className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <button onClick={handleExitAttempt} className="ui-btn-dark" title="Retour au plan de salle">
                            <ArrowLeft size={20} />
                            <span>Retour plan de salle</span>
                        </button>
                        <h2 className="text-2xl font-semibold text-gray-900">Table {order.table_nom}</h2>
                    </div>
                </div>
                <ProductGrid
                    filteredProducts={filteredProducts}
                    quantities={productQuantitiesInCart}
                    onAdd={handleProductSelection}
                    activeCategoryId={activeCategoryId}
                    categories={categories}
                    onSelectCategory={setActiveCategoryId}
                    isProductAvailable={isProductAvailable}
                    handleProductPointerDown={handleProductPointerDown}
                    handleProductKeyDown={handleProductKeyDown}
                />
            </div>

            {/* Order Summary Section */}
            <OrderSummary
                categorizedItems={categorizedItems}
                order={order}
                total={order.total}
                onQuantityChange={handleQuantityChange}
                onCommentChange={handleCommentChange}
                onPersistComment={persistCommentChange}
                onStartEditingComment={startEditingComment}
                onSendToKitchen={handleSendToKitchen}
                onServeOrder={handleServeOrder}
                onOpenPayment={handleOpenPaymentModal}
                isSending={isSendingToKitchen}
                hasPending={hasPendingItems}
                orderStatus={order.estado_cocina}
                editingCommentId={editingCommentId}
            />
        </div>
        <ItemCustomizationModal
            isOpen={selectedProductForCustomization !== null}
            product={selectedProductForCustomization}
            onClose={closeCustomizationModal}
            onSave={handleSaveCustomizedProduct}
        />
        <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            order={order}
            onFinalize={handleFinalizeOrder}
        />
        <Modal
            isOpen={isExitConfirmOpen}
            onClose={() => setExitConfirmOpen(false)}
            title="Quitter sans envoyer ?"
        >
            <p className="text-gray-700">Vous avez des articles non envoyés en cuisine. Si vous quittez, ils seront annulés. Voulez-vous continuer ?</p>
            <div className="flex justify-end gap-4 mt-6">
                <button onClick={() => setExitConfirmOpen(false)} className="ui-btn-secondary">
                    Non, rester
                </button>
                <button onClick={handleConfirmExit} className="ui-btn-danger">
                    Oui, quitter
                </button>
            </div>
        </Modal>
        </>
    );
};

export default Commande;