import type { OrderItem } from '../types';

export interface OrderItemsSnapshotEntry {
    quantite: number;
    commentaire: string;
    excludedIngredients: string[];
}

export interface OrderItemsSnapshot {
    size: number;
    itemsById: Map<string, OrderItemsSnapshotEntry>;
}

const normalizeComment = (value?: string | null) => value ?? '';

const normalizeExcludedIngredients = (values?: string[] | null) => {
    if (!values || values.length === 0) {
        return [] as string[];
    }

    const normalized = values.slice().sort();
    return normalized;
};

export const createOrderItemsSnapshot = (items: OrderItem[] = []): OrderItemsSnapshot => {
    const itemsById = new Map<string, OrderItemsSnapshotEntry>();

    for (const item of items) {
        itemsById.set(item.id, {
            quantite: item.quantite,
            commentaire: normalizeComment(item.commentaire),
            excludedIngredients: normalizeExcludedIngredients(item.excluded_ingredients),
        });
    }

    return { size: items.length, itemsById };
};

export const areOrderItemSnapshotsEqual = (a: OrderItemsSnapshot, b: OrderItemsSnapshot): boolean => {
    if (a === b) {
        return true;
    }

    if (a.size !== b.size) {
        return false;
    }

    for (const [id, leftItem] of a.itemsById) {
        const rightItem = b.itemsById.get(id);
        if (!rightItem) {
            return false;
        }

        if (leftItem.quantite !== rightItem.quantite) {
            return false;
        }

        if (leftItem.commentaire !== rightItem.commentaire) {
            return false;
        }

        if (leftItem.excludedIngredients.length !== rightItem.excludedIngredients.length) {
            return false;
        }

        for (let index = 0; index < leftItem.excludedIngredients.length; index += 1) {
            if (leftItem.excludedIngredients[index] !== rightItem.excludedIngredients[index]) {
                return false;
            }
        }
    }

    return true;
};

export const areOrderItemArraysEqual = (left: OrderItem[] = [], right: OrderItem[] = []): boolean => {
    if (left === right) {
        return true;
    }

    const leftSnapshot = createOrderItemsSnapshot(left);
    const rightSnapshot = createOrderItemsSnapshot(right);

    return areOrderItemSnapshotsEqual(leftSnapshot, rightSnapshot);
};
