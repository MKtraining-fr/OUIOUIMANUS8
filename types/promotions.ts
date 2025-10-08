// Types pour le système de promotions - Adaptés à la structure Supabase existante

// Types de promotions disponibles
export type PromotionType = 
  | 'percentage' // Réduction en pourcentage
  | 'fixed_amount' // Réduction d'un montant fixe
  | 'promo_code' // Code promotionnel
  | 'buy_x_get_y' // Achetez X, obtenez Y (ex: 2x1)
  | 'free_product' // Produit gratuit
  | 'free_shipping' // Livraison gratuite
  | 'combo' // Combo/Menu à prix spécial
  | 'threshold' // Réduction par palier (ex: -5% à partir de 30k, -10% à partir de 50k)
  | 'happy_hour'; // Promotion temporelle (ex: happy hour)

// Condition d'application d'une promotion (élément du tableau conditions)
export interface PromotionCondition {
  type: 'specific_product' | 'specific_category' | 'min_order_amount' | 'min_items_count' | 'promo_code' | 'buy_x_get_y' | 'threshold' | 'first_order_only';
  value?: any; // Valeur de la condition (peut être un nombre, une chaîne, un tableau, etc.)
  buy_quantity?: number; // Pour buy_x_get_y
  get_quantity?: number; // Pour buy_x_get_y
  threshold_values?: { // Pour threshold
    amount: number;
    discount: number;
  }[];
}

// Configuration de la promotion (stockée dans le champ config)
export interface PromotionConfig {
  // Type de réduction
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount?: number; // Plafond de réduction pour les pourcentages
  applies_to: 'total' | 'products' | 'shipping' | 'category';
  
  // Éléments visuels
  visuals?: {
    badge_text?: string; // Texte du badge (ex: "2x1", "-20%")
    badge_color?: string; // Couleur du texte du badge (hex)
    badge_bg_color?: string; // Couleur de fond du badge (hex)
    badge_bg_image?: string | null; // URL de l'image de fond du badge (Cloudinary)
    badge_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    banner_image?: string; // URL de l'image de la bannière
    banner_text?: string; // Texte de la bannière
    banner_cta?: string; // Texte du bouton d'appel à l'action
    description?: string; // Description de la promotion
    icon?: string; // Icône à afficher
  };
  
  // Conditions temporelles (heures de la journée, jours de la semaine)
  days_of_week?: number[]; // 0-6, 0 = dimanche
  hours_of_day?: {
    start: string; // Format "HH:MM"
    end: string; // Format "HH:MM"
  };
  
  // IDs de produits ou catégories concernés
  product_ids?: string[];
  category_ids?: string[];
  
  // Conditions spécifiques
  promo_code?: string;
  buy_quantity?: number;
  get_quantity?: number;
  min_order_amount?: number;
  min_items_count?: number;
  
  // Limites d'utilisation par client
  max_uses_per_customer?: number;
  first_order_only?: boolean;
}

// Promotion complète (correspondant à la structure Supabase)
export interface Promotion {
  id: string;
  name: string;
  description?: string;
  active: boolean; // Remplace status
  start_date: string; // Date de début (ISO string)
  end_date?: string; // Date de fin optionnelle (ISO string)
  conditions: PromotionCondition[]; // Tableau de conditions
  config: PromotionConfig; // Configuration complète
  priority: number; // Priorité d'application (plus élevé = plus prioritaire)
  stackable: boolean; // Peut être combinée avec d'autres promotions
  usage_limit?: number; // Limite d'utilisation totale
  usage_count: number; // Nombre d'utilisations actuelles
  created_at: string;
  updated_at: string;
}

// Utilisation d'une promotion
export interface PromotionUsage {
  id: string;
  promotion_id: string;
  order_id: string;
  customer_phone?: string; // Pour suivre l'utilisation par client
  discount_amount: number; // Montant de la réduction appliquée
  applied_at: string; // Date d'application
}

// Extension de l'interface Order pour inclure les promotions
export interface OrderWithPromotions {
  subtotal: number; // Montant avant réduction
  total_discount: number; // Montant total des réductions
  promo_code?: string; // Code promo utilisé
  applied_promotions: {
    promotion_id: string;
    name: string;
    discount_amount: number;
  }[];
}

// Helper pour vérifier si une promotion est actuellement valide
export const isPromotionCurrentlyValid = (promotion: Promotion): boolean => {
  if (!promotion.active) return false;
  
  const now = new Date();
  const startDate = new Date(promotion.start_date);
  const endDate = promotion.end_date ? new Date(promotion.end_date) : null;
  
  if (now < startDate) return false;
  if (endDate && now > endDate) return false;
  
  // Vérifier la limite d'utilisation
  if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
    return false;
  }
  
  return true;
};

// Helper pour vérifier les conditions temporelles (heures et jours)
export const isPromotionValidAtTime = (promotion: Promotion): boolean => {
  const now = new Date();
  const config = promotion.config;
  
  // Vérifier le jour de la semaine
  if (config.days_of_week && config.days_of_week.length > 0) {
    const currentDay = now.getDay();
    if (!config.days_of_week.includes(currentDay)) {
      return false;
    }
  }
  
  // Vérifier l'heure de la journée
  if (config.hours_of_day) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const [startHour, startMinute] = config.hours_of_day.start.split(':').map(Number);
    const [endHour, endMinute] = config.hours_of_day.end.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
      return false;
    }
  }
  
  return true;
};

// Type de compatibilité pour l'ancien code
export type PromotionStatus = 'active' | 'inactive' | 'scheduled' | 'expired';
