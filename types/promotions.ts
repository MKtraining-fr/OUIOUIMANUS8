// Types pour le système de promotions

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

// Statut d'une promotion
export type PromotionStatus = 
  | 'active' // Promotion active
  | 'inactive' // Promotion inactive
  | 'scheduled' // Promotion programmée pour une date future
  | 'expired'; // Promotion expirée

// Conditions d'application d'une promotion
export interface PromotionConditions {
  // Conditions temporelles
  start_date?: string; // Date de début (ISO string)
  end_date?: string; // Date de fin (ISO string)
  days_of_week?: number[]; // Jours de la semaine (0-6, 0 = dimanche)
  hours_of_day?: {
    start: string; // Heure de début (format "HH:MM")
    end: string; // Heure de fin (format "HH:MM")
  };
  
  // Conditions liées aux produits
  product_ids?: string[]; // Liste des IDs de produits concernés
  category_ids?: string[]; // Liste des IDs de catégories concernées
  
  // Conditions liées à la commande
  min_order_amount?: number; // Montant minimum de commande
  min_items_count?: number; // Nombre minimum d'articles
  
  // Conditions spécifiques
  promo_code?: string; // Code promo à saisir
  buy_quantity?: number; // Quantité à acheter pour "buy_x_get_y"
  get_quantity?: number; // Quantité offerte pour "buy_x_get_y"
  threshold_values?: { // Valeurs de seuil pour les réductions par palier
    amount: number; // Montant du seuil
    discount: number; // Valeur de la réduction (pourcentage ou montant fixe)
  }[];
  
  // Conditions d'utilisation
  max_uses_total?: number; // Nombre maximum d'utilisations au total
  max_uses_per_customer?: number; // Nombre maximum d'utilisations par client
  first_order_only?: boolean; // Uniquement pour la première commande
}

// Valeur de la réduction
export interface PromotionDiscount {
  type: 'percentage' | 'fixed_amount'; // Type de réduction
  value: number; // Valeur de la réduction (pourcentage ou montant fixe)
  max_discount_amount?: number; // Montant maximum de la réduction (pour les pourcentages)
  applies_to: 'total' | 'products' | 'shipping'; // Application de la réduction
}

// Éléments visuels de la promotion
export interface PromotionVisuals {
  badge_text?: string; // Texte du badge (ex: "2x1", "-20%")
  badge_color?: string; // Couleur du badge (hex)
  banner_image?: string; // URL de l'image de la bannière
  banner_text?: string; // Texte de la bannière
  banner_cta?: string; // Texte du bouton d'appel à l'action
}

// Promotion complète
export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  priority: number; // Priorité d'application (plus le nombre est élevé, plus la priorité est haute)
  conditions: PromotionConditions;
  discount: PromotionDiscount;
  visuals?: PromotionVisuals;
  created_at: string;
  updated_at: string;
  usage_count: number; // Nombre d'utilisations
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
