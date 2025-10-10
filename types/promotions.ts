/**
 * Types pour le système de promotions
 * Ces types correspondent au schéma de la base de données (promotions_v1.sql)
 */

// Types de promotions supportés (champ `type` dans la table `promotions`)
export type PromotionType =
  | 'percentage'
  | 'fixed_amount'
  | 'promo_code'
  | 'buy_x_get_y'
  | 'free_product'
  | 'free_shipping'
  | 'combo'
  | 'threshold'
  | 'happy_hour';

// Statuts de promotion (champ `status` dans la table `promotions`)
export type PromotionStatus = 'active' | 'inactive' | 'scheduled' | 'expired';

// Configuration pour les promotions "acheter X obtenir Y"
export interface BuyXGetYConfig {
  buy_quantity: number;
  get_quantity: number;
  product_ids?: string[];
  category_ids?: string[];
}

// Configuration de la réduction (champ `discount` JSONB dans la base de données)
export interface PromotionDiscount {
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  discount_value: number; // Pourcentage (0-100) ou montant fixe
  applies_to: 'total' | 'products' | 'categories' | 'shipping';
  product_ids?: string[];
  category_ids?: string[];
  buy_x_get_y_config?: BuyXGetYConfig;
  promo_code?: string; // Code promo pour les promotions de type 'promo_code'
  max_discount_amount?: number; // Plafond de réduction pour les pourcentages
}

// Conditions d'applicabilité (champ `conditions` JSONB dans la base de données)
export interface PromotionConditions {
  min_order_amount?: number; // Montant minimum de commande
  max_order_amount?: number; // Montant maximum de commande
  min_items_count?: number; // Nombre minimum d'articles
  max_items_count?: number; // Nombre maximum d'articles
  specific_products?: string[]; // IDs de produits spécifiques
  specific_categories?: string[]; // IDs de catégories spécifiques
  customer_groups?: string[]; // Groupes de clients (ex: 'new', 'vip')
  order_types?: string[]; // Types de commande (ex: 'pedir_en_linea', 'delivery')
  time_range?: {
    start_time: string; // Format HH:MM
    end_time: string; // Format HH:MM
  };
  days_of_week?: number[]; // Jours de la semaine (0 = dimanche, 6 = samedi)
  start_date?: string; // Date de début (ISO 8601)
  end_date?: string; // Date de fin (ISO 8601)
  usage_limit?: number; // Limite d'utilisation globale
  usage_limit_per_customer?: number; // Limite d'utilisation par client
  first_order_only?: boolean; // Réservé aux premières commandes
}

// Informations visuelles (champ `visuals` JSONB dans la base de données)
export interface PromotionVisuals {
  banner_url?: string;
  banner_text?: string;
  banner_cta?: string;
  icon_url?: string;
  badge_text?: string;
  badge_color?: string;
  badge_bg_color?: string;
  badge_bg_image?: string;
  badge_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color?: string;
  display_text?: string;
  description?: string;
}

// Structure complète d'une promotion (correspond à la table `promotions`)
export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  conditions: PromotionConditions;
  discount: PromotionDiscount;
  visuals?: PromotionVisuals;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

// Structure pour une promotion appliquée à une commande (champ `applied_promotions` JSONB dans `orders`)
export interface AppliedPromotion {
  id: string;
  name: string;
  discount_amount: number;
  discount: PromotionDiscount;
}

// Helper pour vérifier si une promotion est actuellement valide
export const isPromotionCurrentlyValid = (promotion: Promotion): boolean => {
  if (promotion.status !== 'active') return false;

  const now = new Date();
  const conditions = promotion.conditions;

  // Vérifier les dates de début et de fin
  if (conditions.start_date) {
    const startDate = new Date(conditions.start_date);
    if (now < startDate) return false;
  }

  if (conditions.end_date) {
    const endDate = new Date(conditions.end_date);
    if (now > endDate) return false;
  }

  // Vérifier la limite d'utilisation
  if (conditions.usage_limit && promotion.usage_count >= conditions.usage_limit) {
    return false;
  }

  return true;
};

// Helper pour vérifier les conditions temporelles (heures et jours)
export const isPromotionValidAtTime = (promotion: Promotion): boolean => {
  const now = new Date();
  const conditions = promotion.conditions;

  // Vérifier le jour de la semaine
  if (conditions.days_of_week && conditions.days_of_week.length > 0) {
    const currentDay = now.getDay();
    if (!conditions.days_of_week.includes(currentDay)) {
      return false;
    }
  }

  // Vérifier l'heure de la journée
  if (conditions.time_range) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = conditions.time_range.start_time.split(':').map(Number);
    const [endHour, endMinute] = conditions.time_range.end_time.split(':').map(Number);

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
      return false;
    }
  }

  return true;
};

// Type de compatibilité pour l'ancien code (si nécessaire)
export interface PromotionConfig extends PromotionDiscount {
  // Alias pour la compatibilité avec l'ancien code
}

export interface PromotionCondition {
  // Alias pour la compatibilité avec l'ancien code
  type: string;
  value?: any;
}

