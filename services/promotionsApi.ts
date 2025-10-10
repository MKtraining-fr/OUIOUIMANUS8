import { supabase } from './supabaseClient';
import { 
  Promotion, 
  PromotionConfig,
  PromotionCondition,
  PromotionUsage,
  isPromotionCurrentlyValid,
  isPromotionValidAtTime
} from '../types/promotions';
import { Order } from '../types';

// Types pour les réponses Supabase
type SupabaseResponse<T> = {
  data: T;
  error: { message: string } | null;
  status?: number;
};

// Fonctions utilitaires
const unwrap = <T>(response: SupabaseResponse<T>): T => {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
};

const unwrapMaybe = <T>(response: SupabaseResponse<T | null>): T | null => {
  if (response.error && response.status !== 406) {
    throw new Error(response.error.message);
  }
  return response.data ?? null;
};

/**
 * Récupère toutes les promotions
 */
export const fetchPromotions = async (): Promise<Promotion[]> => {
  const response = await supabase
    .from('promotions')
    .select('*')
    .order('priority', { ascending: false });
  
  return unwrap<Promotion[]>(response as SupabaseResponse<Promotion[]>);
};

/**
 * Récupère une promotion par son ID
 */
export const fetchPromotionById = async (id: string): Promise<Promotion | null> => {
  const response = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  return unwrapMaybe<Promotion>(response as SupabaseResponse<Promotion | null>);
};

/**
 * Récupère les promotions actives et valides
 */
export const fetchActivePromotions = async (): Promise<Promotion[]> => {
  const now = new Date().toISOString();
  
  const response = await supabase
    .from('promotions')
    .select('*')
    .eq('active', true)
    .lte('start_date', now)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('priority', { ascending: false });
  
  const promotions = unwrap<Promotion[]>(response as SupabaseResponse<Promotion[]>);
  
  // Filtrer les promotions qui ont atteint leur limite d'utilisation
  return promotions.filter(promo => {
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return false;
    }
    return isPromotionValidAtTime(promo);
  });
};

/**
 * Crée une nouvelle promotion
 */
export const createPromotion = async (promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<Promotion> => {
  const response = await supabase
    .from('promotions')
    .insert({
      name: promotion.name,
      description: promotion.description,
      active: promotion.active,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      conditions: promotion.conditions,
      config: promotion.config,
      priority: promotion.priority,
      stackable: promotion.stackable,
      usage_limit: promotion.usage_limit,
      usage_count: 0
    })
    .select()
    .single();
  
  return unwrap<Promotion>(response as SupabaseResponse<Promotion>);
};

/**
 * Met à jour une promotion existante
 */
export const updatePromotion = async (id: string, promotion: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>>): Promise<Promotion> => {
  const response = await supabase
    .from('promotions')
    .update({
      name: promotion.name,
      description: promotion.description,
      active: promotion.active,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      conditions: promotion.conditions,
      config: promotion.config,
      priority: promotion.priority,
      stackable: promotion.stackable,
      usage_limit: promotion.usage_limit
    })
    .eq('id', id)
    .select()
    .single();
  
  return unwrap<Promotion>(response as SupabaseResponse<Promotion>);
};

/**
 * Supprime une promotion
 */
export const deletePromotion = async (id: string): Promise<void> => {
  const response = await supabase
    .from('promotions')
    .delete()
    .eq('id', id);
  
  unwrap(response as SupabaseResponse<null>);
};

/**
 * Active ou désactive une promotion
 */
export const togglePromotionActive = async (id: string, active: boolean): Promise<Promotion> => {
  const response = await supabase
    .from('promotions')
    .update({ active })
    .eq('id', id)
    .select()
    .single();
  
  return unwrap<Promotion>(response as SupabaseResponse<Promotion>);
};

/**
 * Récupère un code promo par son code
 */
export const fetchPromotionByCode = async (code: string): Promise<Promotion | null> => {
  const activePromotions = await fetchActivePromotions();
  
  return activePromotions.find(promo => 
    promo.config.promo_code?.toLowerCase() === code.toLowerCase()
  ) || null;
};

/**
 * Enregistre l'utilisation d'une promotion
 */
export const recordPromotionUsage = async (usage: Omit<PromotionUsage, 'id' | 'applied_at'>): Promise<PromotionUsage> => {
  // Incrémenter le compteur d'utilisation de la promotion
  await supabase
    .from('promotions')
    .update({ usage_count: supabase.sql`usage_count + 1` })
    .eq('id', usage.promotion_id);
  
  // Enregistrer l'utilisation
  const response = await supabase
    .from('promotion_usages')
    .insert({
      promotion_id: usage.promotion_id,
      order_id: usage.order_id,
      customer_phone: usage.customer_phone || null,
      discount_amount: usage.discount_amount
    })
    .select()
    .single();
  
  return unwrap<PromotionUsage>(response as SupabaseResponse<PromotionUsage>);
};

/**
 * Récupère les utilisations d'une promotion
 */
export const fetchPromotionUsages = async (promotionId: string): Promise<PromotionUsage[]> => {
  const response = await supabase
    .from('promotion_usages')
    .select('*')
    .eq('promotion_id', promotionId)
    .order('applied_at', { ascending: false });
  
  return unwrap<PromotionUsage[]>(response as SupabaseResponse<PromotionUsage[]>);
};

/**
 * Récupère les utilisations d'une promotion par un client
 */
export const fetchPromotionUsagesByCustomer = async (promotionId: string, customerPhone: string): Promise<PromotionUsage[]> => {
  const response = await supabase
    .from('promotion_usages')
    .select('*')
    .eq('promotion_id', promotionId)
    .eq('customer_phone', customerPhone)
    .order('applied_at', { ascending: false});
  
  return unwrap<PromotionUsage[]>(response as SupabaseResponse<PromotionUsage[]>);
};

/**
 * Vérifie si un client peut utiliser une promotion (basé sur les limites d'utilisation)
 */
export const canCustomerUsePromotion = async (promotionId: string, customerPhone: string): Promise<boolean> => {
  const promotion = await fetchPromotionById(promotionId);
  if (!promotion || !isPromotionCurrentlyValid(promotion)) return false;
  
  // Vérifier si la promotion a une limite d'utilisation par client
  if (!promotion.config.max_uses_per_customer) return true;
  
  // Récupérer les utilisations par ce client
  const usages = await fetchPromotionUsagesByCustomer(promotionId, customerPhone);
  
  // Vérifier si le client a dépassé la limite
  return usages.length < (promotion.config.max_uses_per_customer || Infinity);
};

/**
 * Vérifie si une promotion peut encore être utilisée (basé sur le nombre total d'utilisations)
 */
export const canPromotionBeUsed = async (promotionId: string): Promise<boolean> => {
  const promotion = await fetchPromotionById(promotionId);
  if (!promotion || !isPromotionCurrentlyValid(promotion)) return false;
  
  // Vérifier si la promotion a une limite d'utilisation totale
  if (!promotion.usage_limit) return true;
  
  // Vérifier si la promotion a dépassé la limite
  return promotion.usage_count < promotion.usage_limit;
};

/**
 * Vérifie si une promotion est applicable à une commande
 */
export const isPromotionApplicableToOrder = (promotion: Promotion, order: Order): boolean => {
  if (!isPromotionCurrentlyValid(promotion)) return false;
  if (!isPromotionValidAtTime(promotion)) return false;
  
  const config = promotion.config;
  
  // Vérifier le montant minimum de commande
    if (config.min_order_amount && (!order.subtotal || order.subtotal < config.min_order_amount)) {
    return false;
  }
  
  // Vérifier le nombre minimum d'articles
  if (config.min_items_count) {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantite, 0);
    if (totalItems < config.min_items_count) {
      return false;
    }
  }
  
  // Vérifier les produits concernés
  if (config.product_ids && config.product_ids.length > 0) {
    const hasMatchingProduct = order.items.some(item => 
      config.product_ids?.includes(item.produitRef)
    );
    if (!hasMatchingProduct) {
      return false;
    }
  }
  
  // Vérifier les catégories concernées (nécessite que les items aient une propriété categoria_id)
  if (config.category_ids && config.category_ids.length > 0) {
    const hasMatchingCategory = order.items.some((item: any) => 
      config.category_ids?.includes(item.categoria_id)
    );
    if (!hasMatchingCategory) {
      return false;
    }
  }
  
  return true;
};

/**
 * Calcule le montant de réduction pour une promotion appliquée à une commande
 */
export const calculatePromotionDiscount = (promotion: Promotion, order: Order): number => {
  const config = promotion.config;
  
  // Cas de la réduction en pourcentage
  if (config.discount_type === 'percentage') {
    let baseAmount = 0;
    
    // Déterminer le montant de base sur lequel appliquer la réduction
    if (config.applies_to === 'total') {
      baseAmount = order.subtotal || order.total;
    } else if (config.applies_to === 'products' && config.product_ids) {
      // Calculer le total des produits concernés
      baseAmount = order.items
        .filter(item => config.product_ids?.includes(item.produitRef))
        .reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0);
    } else if (config.applies_to === 'category' && config.category_ids) {
      // Calculer le total des produits de la catégorie concernée
      baseAmount = order.items
        .filter((item: any) => config.category_ids?.includes(item.categoria_id))
        .reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0);
    } else if (config.applies_to === 'shipping') {
      // Pas de gestion des frais de livraison pour le moment
      baseAmount = 0;
    }
    
    // Calculer la réduction
    let discountAmount = baseAmount * (config.discount_value / 100);
    
    // Appliquer le plafond si défini
    if (config.max_discount_amount && discountAmount > config.max_discount_amount) {
      discountAmount = config.max_discount_amount;
    }
    
    return discountAmount;
  }
  
  // Cas de la réduction en montant fixe
  if (config.discount_type === 'fixed_amount') {
    return config.discount_value;
  }

  // Cas de la promotion 'Acheter X, obtenir Y gratuit'
  if (config.discount_type === 'buy_x_get_y' && config.buy_x_get_y_config) {
    const { buy_quantity, get_quantity, product_ids, category_ids } = config.buy_x_get_y_config;
    let freeItemsCount = 0;
    let cheapestItemPrice = 0;

    if (product_ids && product_ids.length > 0) {
      // Calculer pour des produits spécifiques
      const applicableItems = order.items.filter(item => product_ids.includes(item.produitRef));
      const totalApplicableQuantity = applicableItems.reduce((sum, item) => sum + item.quantite, 0);
      freeItemsCount = Math.floor(totalApplicableQuantity / (buy_quantity + get_quantity)) * get_quantity;
      if (freeItemsCount > 0) {
        // Trouver le prix de l'article le moins cher parmi les articles applicables
        cheapestItemPrice = applicableItems.reduce((minPrice, item) => Math.min(minPrice, item.prix_unitaire), Infinity);
      }
    } else if (category_ids && category_ids.length > 0) {
      // Calculer pour des catégories spécifiques
      const applicableItems = order.items.filter((item: any) => category_ids.includes(item.categoria_id));
      const totalApplicableQuantity = applicableItems.reduce((sum, item) => sum + item.quantite, 0);
      freeItemsCount = Math.floor(totalApplicableQuantity / (buy_quantity + get_quantity)) * get_quantity;
      if (freeItemsCount > 0) {
        // Trouver le prix de l'article le moins cher parmi les articles applicables
        cheapestItemPrice = applicableItems.reduce((minPrice, item) => Math.min(minPrice, item.prix_unitaire), Infinity);
      }
    } else {
      // Calculer pour tous les articles de la commande
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantite, 0);
      freeItemsCount = Math.floor(totalQuantity / (buy_quantity + get_quantity)) * get_quantity;
      if (freeItemsCount > 0) {
        const sortedPrices = order.items.map(item => item.prix_unitaire).sort((a, b) => a - b);
        cheapestItemPrice = sortedPrices.length > 0 ? sortedPrices[0] : 0;
      }
    }

    return freeItemsCount * cheapestItemPrice;
  }
  
  return 0;
};

/**
 * Applique les promotions à une commande
 */
export const applyPromotionsToOrder = async (order: Order): Promise<Order> => {
  // Récupérer toutes les promotions actives
  const activePromotions = await fetchActivePromotions();
  
  // Initialiser les valeurs
  const subtotal = order.items.reduce((acc, item) => acc + (item.prix_unitaire * item.quantite), 0);
  let totalDiscount = 0;
  const appliedPromotions: { promotion_id: string; name: string; discount_amount: number }[] = [];
  
  // Vérifier si un code promo est fourni
  if (order.promo_code) {
    const promoCodePromotion = await fetchPromotionByCode(order.promo_code);
    if (promoCodePromotion && isPromotionApplicableToOrder(promoCodePromotion, order)) {
      const discountAmount = calculatePromotionDiscount(promoCodePromotion, order);
      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        appliedPromotions.push({
          promotion_id: promoCodePromotion.id,
          name: promoCodePromotion.name,
          discount_amount: discountAmount
        });
      }
    }
  }
  
  // Appliquer les autres promotions automatiques (par ordre de priorité)
  for (const promotion of activePromotions) {
    // Ignorer les promotions de type code promo (déjà traitées)
    if (promotion.config.promo_code) continue;
    
    // Si la promotion n'est pas stackable et qu'une promotion a déjà été appliquée, ignorer
    if (!promotion.stackable && appliedPromotions.length > 0) continue;
    
    // Vérifier si la promotion est applicable
    if (isPromotionApplicableToOrder(promotion, order)) {
      const discountAmount = calculatePromotionDiscount(promotion, order);
      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        appliedPromotions.push({
          promotion_id: promotion.id,
          name: promotion.name,
          discount_amount: discountAmount
        });
        
        // Si la promotion n'est pas stackable, arrêter ici
        if (!promotion.stackable) break;
      }
    }
  }
  
  // Mettre à jour la commande avec les promotions appliquées
  const finalTotal = subtotal - totalDiscount;
  return {
    ...order,
    subtotal: subtotal,
    total_discount: totalDiscount,
    total: Math.max(0, finalTotal), // Assurez-vous que le total ne soit pas négatif
    applied_promotions: appliedPromotions
  };
};

/**
 * Enregistre les utilisations de promotions pour une commande finalisée
 */
export const recordPromotionUsagesForOrder = async (order: Order): Promise<void> => {
  if (!order.applied_promotions || order.applied_promotions.length === 0) {
    return;
  }
  
  // Enregistrer chaque utilisation de promotion
  for (const appliedPromotion of order.applied_promotions) {
    await recordPromotionUsage({
      promotion_id: appliedPromotion.promotion_id,
      order_id: order.id,
      customer_phone: order.clientInfo?.telephone,
      discount_amount: appliedPromotion.discount_amount
    });
  }
};

/**
 * Fonction de compatibilité pour l'ancien code utilisant status au lieu de active
 * @deprecated Utilisez togglePromotionActive à la place
 */
export const updatePromotionStatus = async (id: string, status: 'active' | 'inactive' | 'scheduled' | 'expired'): Promise<Promotion> => {
  const active = status === 'active';
  return togglePromotionActive(id, active);
};
