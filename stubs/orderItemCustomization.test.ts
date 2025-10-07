import { describe, expect, it } from 'vitest';
import { mergeProductIntoPendingItems } from '../pages/Commande';
import type { OrderItem, Product } from '../types';
import type { ItemCustomizationResult } from '../components/commande/ItemCustomizationModal';

const createProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'product-1',
    nom_produit: 'Produit 1',
    description: 'Délicieux',
    prix_vente: 500,
    categoria_id: 'cat-1',
    estado: 'disponible',
    image: 'image.jpg',
    recipe: [],
    is_best_seller: false,
    best_seller_rank: null,
    ...overrides,
});

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

const createResult = (overrides: Partial<ItemCustomizationResult> = {}): ItemCustomizationResult => ({
    quantity: 1,
    comment: '',
    ...overrides,
});

describe('mergeProductIntoPendingItems', () => {
    it('increments quantity when the comment is blank', () => {
        const product = createProduct();
        const items = [createItem()];
        const result = mergeProductIntoPendingItems(items, product, createResult({ quantity: 2 }), () => 'generated-1');

        expect(result).toHaveLength(1);
        expect(result[0].quantite).toBe(3);
    });

    it('adds a separate line when a comment is provided', () => {
        const product = createProduct();
        const items = [createItem()];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 2, comment: 'Sans oignons' }),
            () => 'generated-2',
        );

        expect(updated).toHaveLength(2);
        expect(updated[1].id).toBe('generated-2');
        expect(updated[1].quantite).toBe(2);
        expect(updated[1].commentaire).toBe('Sans oignons');
        expect(updated[0].quantite).toBe(1);
    });

    it('trims comments before saving them', () => {
        const product = createProduct();
        const items: OrderItem[] = [];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 1, comment: '  Extra sauce  ' }),
            () => 'generated-3',
        );

        expect(updated).toHaveLength(1);
        expect(updated[0].commentaire).toBe('Extra sauce');
    });

    it('does not merge items that already have a comment even if the same comment is provided', () => {
        const product = createProduct();
        const items = [createItem({ id: 'item-2', commentaire: 'Sans oignons' })];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 1, comment: 'Sans oignons' }),
            () => 'generated-4',
        );

        expect(updated).toHaveLength(2);
        expect(updated[0].id).toBe('item-2');
        expect(updated[1].id).toBe('generated-4');
    });

    it('defaults to a minimum quantity of 1 when an invalid value is provided', () => {
        const product = createProduct();
        const items: OrderItem[] = [];
        const updated = mergeProductIntoPendingItems(
            items,
            product,
            createResult({ quantity: 0 }),
            () => 'generated-5',
        );

        expect(updated).toHaveLength(1);
        expect(updated[0].quantite).toBe(1);
    });
});
