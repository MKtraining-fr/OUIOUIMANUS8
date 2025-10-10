import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Promotion, Order, OrderItem } from '../types/index';
import { PromotionConfig } from '../types/promotions';


// Mock the entire supabaseClient module
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          lte: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock data
const mockOrder: Order = {
  id: 'order-123',
  items: [
    {
      id: 'item-1',
      produitRef: 'quillero-1',
      nom_produit: 'Quillero',
      prix_unitaire: 30000,
      quantite: 2,
      excluded_ingredients: [],
      commentaire: '',
      estado: 'en_attente',
    },
  ],
  subtotal: 60000,
  total: 60000,
  clientInfo: {
    nom: 'Test Client',
    telephone: '1234567890',
  },
  order_type: 'pedir_en_linea',
  payment_method: 'efectivo',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPromotion2x1: Promotion = {
  id: 'promo-2x1',
  name: '2x1 en Quilleros',
  description: 'Compra uno y lleva otro gratis',
  active: true,
  start_date: new Date('2025-01-01').toISOString(),
  end_date: null,
  conditions: {},
  config: {
    discount_type: 'buy_x_get_y',
    discount_value: 0,
    applies_to: 'products',
    product_ids: ['quillero-1'],
    buy_x_get_y_config: {
      buy_quantity: 1,
      get_quantity: 1,
      product_ids: ['quillero-1'],
      category_ids: [],
    },
  } as PromotionConfig,
  priority: 1,
  stackable: true,
  usage_limit: null,
  usage_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('New Promotion Logic Tests', () => {
  describe('calculatePromotionDiscount', () => {
    it('should correctly calculate a 2x1 promotion for a specific product', () => {
      const discount = promotionsApi.calculatePromotionDiscount(mockPromotion2x1, mockOrder);
      expect(discount).toBe(30000);
    });

    it('should return 0 if the 2x1 promotion conditions are not met', () => {
      const orderWithOneItem: Order = {
        ...mockOrder,
        items: [
          {
            id: 'item-1',
            produitRef: 'quillero-1',
            nom_produit: 'Quillero',
            prix_unitaire: 30000,
            quantite: 1,
            excluded_ingredients: [],
            commentaire: '',
            estado: 'en_attente',
          },
        ],
        subtotal: 30000,
        total: 30000,
      };
      const discount = promotionsApi.calculatePromotionDiscount(mockPromotion2x1, orderWithOneItem);
      expect(discount).toBe(0);
    });
  });
});

// Mocks for new tests
const mockOrderPercentage: Order = {
  id: 'order-percentage',
  items: [
    {
      id: 'item-1',
      produitRef: 'prod-a',
      nom_produit: 'Product A',
      prix_unitaire: 10000,
      quantite: 2,
      excluded_ingredients: [],
      commentaire: '',
      estado: 'en_attente',
    },
    {
      id: 'item-2',
      produitRef: 'prod-b',
      nom_produit: 'Product B',
      prix_unitaire: 25000,
      quantite: 1,
      excluded_ingredients: [],
      commentaire: '',
      estado: 'en_attente',
    },
  ],
  subtotal: 45000,
  total: 45000,
  clientInfo: { nom: 'Test', telephone: '123' },
  order_type: 'pedir_en_linea',
  payment_method: 'efectivo',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPromotionPercentage: Promotion = {
  id: 'promo-percentage',
  name: '10% off total',
  active: true,
  config: {
    discount_type: 'percentage',
    discount_value: 10,
    applies_to: 'total',
    promo_code: 'STACKED10',
  } as PromotionConfig,
  priority: 2,
  stackable: true,
} as Promotion;

const mockPromotionFixed: Promotion = {
  id: 'promo-fixed',
  name: '5000 off',
  active: true,
  config: {
    discount_type: 'fixed_amount',
    discount_value: 5000,
    applies_to: 'total',
  } as PromotionConfig,
  priority: 1,
  stackable: true,
} as Promotion;

describe("Comprehensive Promotion Logic Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Percentage Promotions', () => {
    it('should apply a 10% discount to the total order', () => {
      const discount = promotionsApi.calculatePromotionDiscount(mockPromotionPercentage, mockOrderPercentage, mockOrderPercentage.subtotal);
      expect(discount).toBe(4500); // 10% of 45000
    });
  });

  describe('Fixed Amount Promotions', () => {
    it('should apply a fixed discount of 5000', () => {
      const discount = promotionsApi.calculatePromotionDiscount(mockPromotionFixed, mockOrderPercentage);
      expect(discount).toBe(5000);
    });
  });

  describe('Stackable Promotions', () => {
    it('should stack a percentage and a fixed promotion', async () => {
      const tempOrder: Order = {
        ...mockOrderPercentage,
        promo_code: 'STACKED10',
      };

      // Mock fetchActivePromotions to return the percentage promotion
      vi.spyOn(promotionsApi, 'fetchActivePromotions').mockResolvedValue([mockPromotionPercentage]);
      // Mock fetchPromotionByCode to return the fixed promotion
      vi.spyOn(promotionsApi, 'fetchPromotionByCode').mockResolvedValue(mockPromotionFixed);

      const updatedOrder = await promotionsApi.applyPromotionsToOrder(tempOrder);

      // The percentage discount (4500) is applied to the initial subtotal (45000).
      // The fixed discount (5000) is then applied to the subtotal after the percentage discount (45000 - 4500 = 40500).
      // So, the total discount should be 4500 + 5000 = 9500.
      // The final total should be 45000 - 9500 = 35500.
      expect(updatedOrder.total_discount).toBe(9500);
      expect(updatedOrder.total).toBe(35500);
    });
  });
});




// Nouveaux tests pour la logique de promotion révisée

import * as promotionsApi from '../services/promotionsApi';

const mockOrderNew: Order = {
  id: "order1",
  type: "pedir_en_linea",
  couverts: 1,
  statut: "en_cours",
  estado_cocina: "no_enviado",
  date_creation: Date.now(),
  payment_status: "unpaid",
  items: [
    { id: "item1", produitRef: "prod1", nom_produit: "Product 1", prix_unitaire: 100, quantite: 1, excluded_ingredients: [], commentaire: "", estado: 'en_attente' },
    { id: "item2", produitRef: "prod2", nom_produit: "Product 2", prix_unitaire: 50, quantite: 2, excluded_ingredients: [], commentaire: "", estado: 'en_attente' },
  ],
  total: 200, // 100*1 + 50*2
  subtotal: 200,
  total_discount: 0,
  applied_promotions: [],
  clientInfo: { nom: 'Test', telephone: '123' },
  payment_method: 'efectivo',
};

const mockPromotionNew: Promotion = {
  id: "promo1",
  name: "Test Promotion",
  type: "percentage",
  status: "active",
  priority: 10,
  conditions: {},
  discount: {
    discount_type: "percentage",
    discount_value: 10,
    applies_to: "total",
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  usage_count: 0,
};

describe("New Promotion API Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyPromotionsToOrder", () => {
    it("should apply active promotions and calculate total discount", async () => {
      const promo1: Promotion = { ...mockPromotionNew, id: "promo1", name: "10% Off", priority: 10, discount: { discount_type: "percentage", discount_value: 10, applies_to: "total" } };
      const promo2: Promotion = { ...mockPromotionNew, id: "promo2", name: "Fixed 20 Off", type: 'fixed_amount', priority: 5, discount: { discount_type: "fixed_amount", discount_value: 20, applies_to: "total" } };

      vi.spyOn(supabase.from('promotions'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [promo1, promo2], error: null
        })
      } as any);

      const resultOrder = await promotionsApi.applyPromotionsToOrder(mockOrderNew);

      // Initial subtotal is 200
      // Promo1 (10% off) -> 200 * 0.10 = 20. New subtotal = 180
      // Promo2 (Fixed 20 off) -> 20. New subtotal = 160
      // Total discount is 20 + 20 = 40
      expect(resultOrder.total).toBe(160);
      expect(resultOrder.total_discount).toBe(40);
      expect(resultOrder.applied_promotions).toHaveLength(2);
      expect(resultOrder.applied_promotions![0].promotion_id).toBe("promo1");
      expect(resultOrder.applied_promotions![1].promotion_id).toBe("promo2");
    });
  });
});

