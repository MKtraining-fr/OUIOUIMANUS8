import { describe, it, expect } from 'vitest';
import { areOrderItemArraysEqual } from '../utils/orderSync';
import type { OrderItem } from '../types';

const createItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
    id: 'item-1',
    produitRef: 'product-1',
    nom_produit: 'Produit 1',
    prix_unitaire: 500,
    quantite: 1,
    excluded_ingredients: [],
    commentaire: '',
    estado: 'en_attente',
    ...overrides,
});

describe('areOrderItemArraysEqual', () => {
    it('returns false when an item is added', () => {
        const baseItems = [createItem()];
        const withExtraItem = [...baseItems, createItem({ id: 'item-2' })];

        expect(areOrderItemArraysEqual(baseItems, withExtraItem)).toBe(false);
    });

    it('returns false when a quantity differs', () => {
        const baseItems = [createItem()];
        const updatedItems = [createItem({ quantite: 2 })];

        expect(areOrderItemArraysEqual(baseItems, updatedItems)).toBe(false);
    });

    it('returns false when a comment differs', () => {
        const baseItems = [createItem()];
        const updatedItems = [createItem({ commentaire: 'Sans oignons' })];

        expect(areOrderItemArraysEqual(baseItems, updatedItems)).toBe(false);
    });

    it('ignores excluded ingredient order', () => {
        const baseItems = [createItem({ excluded_ingredients: ['a', 'b'] })];
        const shuffled = [createItem({ excluded_ingredients: ['b', 'a'] })];

        expect(areOrderItemArraysEqual(baseItems, shuffled)).toBe(true);
    });
});
