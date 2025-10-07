import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchPromotions, 
  fetchPromotionById, 
  fetchActivePromotions,
  fetchPromotionByCode,
  isPromotionApplicableToOrder,
  calculatePromotionDiscount,
  applyPromotionsToOrder
} from '../services/promotionsApi';
import { Promotion, Order, PromotionType, PromotionStatus } from '../types';

// Mock de supabase
vi.mock('../services/supabaseClient', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockFilter = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        filter: mockFilter,
        order: mockOrder,
        maybeSingle: mockMaybeSingle,
        single: mockSingle
      })
    }
  };
});

// Données de test
const mockPromotion: Promotion = {
  id: '123',
  name: 'Test Promotion',
  type: 'percentage' as PromotionType,
  status: 'active' as PromotionStatus,
  priority: 10,
  conditions: {
    min_order_amount: 30000
  },
  discount: {
    type: 'percentage',
    value: 10,
    applies_to: 'total'
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  usage_count: 0
};

const mockOrder: Order = {
  id: '456',
  type: 'sur_place',
  couverts: 2,
  statut: 'en_cours',
  estado_cocina: 'no_enviado',
  date_creation: Date.now(),
  payment_status: 'unpaid',
  items: [
    {
      id: 'item1',
      produitRef: 'prod1',
      nom_produit: 'Taco Test',
      prix_unitaire: 15000,
      quantite: 2,
      excluded_ingredients: [],
      commentaire: '',
      estado: 'en_attente'
    }
  ],
  total: 30000
};

describe('promotionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPromotionApplicableToOrder', () => {
    it('should return true when order meets minimum amount condition', () => {
      const result = isPromotionApplicableToOrder(mockPromotion, mockOrder);
      expect(result).toBe(true);
    });

    it('should return false when order does not meet minimum amount condition', () => {
      const smallOrder = { ...mockOrder, total: 20000 };
      const result = isPromotionApplicableToOrder(mockPromotion, smallOrder);
      expect(result).toBe(false);
    });

    it('should check product conditions when specified', () => {
      const promotionWithProductCondition = {
        ...mockPromotion,
        conditions: {
          ...mockPromotion.conditions,
          product_ids: ['prod1']
        }
      };
      const result = isPromotionApplicableToOrder(promotionWithProductCondition, mockOrder);
      expect(result).toBe(true);

      const promotionWithWrongProductCondition = {
        ...mockPromotion,
        conditions: {
          ...mockPromotion.conditions,
          product_ids: ['prod2']
        }
      };
      const result2 = isPromotionApplicableToOrder(promotionWithWrongProductCondition, mockOrder);
      expect(result2).toBe(false);
    });

    it('should check time conditions when specified', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Test date range
      const promotionWithValidDateRange = {
        ...mockPromotion,
        conditions: {
          ...mockPromotion.conditions,
          start_date: yesterday.toISOString(),
          end_date: tomorrow.toISOString()
        }
      };
      const result = isPromotionApplicableToOrder(promotionWithValidDateRange, mockOrder);
      expect(result).toBe(true);

      const promotionWithExpiredDateRange = {
        ...mockPromotion,
        conditions: {
          ...mockPromotion.conditions,
          start_date: new Date('2020-01-01').toISOString(),
          end_date: new Date('2020-01-02').toISOString()
        }
      };
      const result2 = isPromotionApplicableToOrder(promotionWithExpiredDateRange, mockOrder);
      expect(result2).toBe(false);

      // Test days of week
      const currentDay = now.getDay();
      const promotionWithValidDayOfWeek = {
        ...mockPromotion,
        conditions: {
          ...mockPromotion.conditions,
          days_of_week: [currentDay]
        }
      };
      const result3 = isPromotionApplicableToOrder(promotionWithValidDayOfWeek, mockOrder);
      expect(result3).toBe(true);

      const promotionWithInvalidDayOfWeek = {
        ...mockPromotion,
        conditions: {
          ...mockPromotion.conditions,
          days_of_week: [(currentDay + 1) % 7]
        }
      };
      const result4 = isPromotionApplicableToOrder(promotionWithInvalidDayOfWeek, mockOrder);
      expect(result4).toBe(false);
    });
  });

  describe('calculatePromotionDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const result = calculatePromotionDiscount(mockPromotion, mockOrder);
      expect(result).toBe(3000); // 10% of 30000
    });

    it('should respect maximum discount amount', () => {
      const promotionWithMaxDiscount = {
        ...mockPromotion,
        discount: {
          ...mockPromotion.discount,
          max_discount_amount: 2000
        }
      };
      const result = calculatePromotionDiscount(promotionWithMaxDiscount, mockOrder);
      expect(result).toBe(2000);
    });

    it('should calculate fixed amount discount correctly', () => {
      const fixedAmountPromotion = {
        ...mockPromotion,
        discount: {
          type: 'fixed_amount',
          value: 5000,
          applies_to: 'total'
        }
      };
      const result = calculatePromotionDiscount(fixedAmountPromotion, mockOrder);
      expect(result).toBe(5000);
    });

    it('should calculate product-specific discount correctly', () => {
      const productSpecificPromotion = {
        ...mockPromotion,
        conditions: {
          product_ids: ['prod1']
        },
        discount: {
          type: 'percentage',
          value: 20,
          applies_to: 'products'
        }
      };
      const result = calculatePromotionDiscount(productSpecificPromotion, mockOrder);
      expect(result).toBe(6000); // 20% of (15000 * 2)
    });
  });

  // Note: Les tests pour les fonctions qui interagissent avec Supabase
  // nécessiteraient des mocks plus complexes et sont omis pour simplifier
});
