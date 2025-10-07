import { supabase } from './supabaseClient';
import { 
  Promotion, 
  PromotionType, 
  PromotionStatus, 
  PromotionConditions, 
  PromotionDiscount, 
  PromotionVisuals,
  PromotionUsage,
  Order
} from '../types';

// Types pour les lignes de la base de données Supabase
type SupabasePromotionRow = {
  id: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  conditions: PromotionConditions;
  discount: PromotionDiscount;
  visuals: PromotionVisuals | null;
  created_at: string;
  updated_at: string;
  usage_count: number;
};

type SupabasePromotionUsageRow = {
  id: string;
  promotion_id: string;
  order_id: string;
  customer_phone: string | null;
  discount_amount: number;
  applied_at: string;
};

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

// Mappers pour convertir les lignes Supabase en objets TypeScript
const mapPromotionRow = (row: SupabasePromotionRow): Promotion => ({
  id: row.id,
  name: row.name,
  type: row.type,
  status: row.status,
  priority: row.priority,
  conditions: row.conditions,
  discount: row.discount,
  visuals: row.visuals || undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
  usage_count: row.usage_count
});

const mapPromotionUsageRow = (row: SupabasePromotionUsageRow): PromotionUsage => ({
  id: row.id,
  promotion_id: row.promotion_id,
  order_id: row.order_id,
  customer_phone: row.customer_phone || undefined,
  discount_amount: row.discount_amount,
  applied_at: row.applied_at
});

// Fonctions d'API pour les promotions

/**
 * Récupère toutes les promotions
 */
export const fetchPromotions = async (): Promise<Promotion[]> => {
  const response = await supabase
    .from('promotions')
    .select('*')
    .order('priority', { ascending: false });
  
  const rows = unwrap<SupabasePromotionRow[]>(response as SupabaseResponse<SupabasePromotionRow[]>);
  return rows.map(mapPromotionRow);
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
  
  const row = unwrapMaybe<SupabasePromotionRow>(response as SupabaseResponse<SupabasePromotionRow | null>);
  return row ? mapPromotionRow(row) : null;
};

/**
 * Récupère les promotions actives
 */
export const fetchActivePromotions = async (): Promise<Promotion[]> => {
  const response = await supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active')
    .order('priority', { ascending: false });
  
  const rows = unwrap<SupabasePromotionRow[]>(response as SupabaseResponse<SupabasePromotionRow[]>);
  return rows.map(mapPromotionRow);
};

/**
 * Crée une nouvelle promotion
 */
export const createPromotion = async (promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<Promotion> => {
  const response = await supabase
    .from('promotions')
    .insert({
      name: promotion.name,
      type: promotion.type,
      status: promotion.status,
      priority: promotion.priority,
      conditions: promotion.conditions,
      discount: promotion.discount,
      visuals: promotion.visuals || null,
      usage_count: 0
    })
    .select()
    .single();
  
  const row = unwrap<SupabasePromotionRow>(response as SupabaseResponse<SupabasePromotionRow>);
  return mapPromotionRow(row);
};

/**
 * Met à jour une promotion existante
 */
export const updatePromotion = async (id: string, promotion: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>>): Promise<Promotion> => {
  const response = await supabase
    .from('promotions')
    .update({
      name: promotion.name,
      type: promotion.type,
      status: promotion.status,
      priority: promotion.priority,
      conditions: promotion.conditions,
      discount: promotion.discount,
      visuals: promotion.visuals || null
    })
    .eq('id', id)
    .select()
    .single();
  
  const row = unwrap<SupabasePromotionRow>(response as SupabaseResponse<SupabasePromotionRow>);
  return mapPromotionRow(row);
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
 * Change le statut d'une promotion
 */
export const updatePromotionStatus = async (id: string, status: PromotionStatus): Promise<Promotion> => {
  const response = await supabase
    .from('promotions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  
  const row = unwrap<SupabasePromotionRow>(response as SupabaseResponse<SupabasePromotionRow>);
  return mapPromotionRow(row);
};

/**
 * Récupère un code promo par son code
 */
export const fetchPromotionByCode = async (code: string): Promise<Promotion | null> => {
  const response = await supabase
    .from('promotions')
    .select('*')
    .eq('type', 'promo_code')
    .eq('status', 'active')
    .filter('conditions->promo_code', 'eq', code)
    .maybeSingle();
  
  const row = unwrapMaybe<SupabasePromotionRow>(response as SupabaseResponse<SupabasePromotionRow | null>);
  return row ? mapPromotionRow(row) : null;
};

/**
 * Enregistre l'utilisation d'une promotion
 */
export const recordPromotionUsage = async (usage: Omit<PromotionUsage, 'id' | 'applied_at'>): Promise<PromotionUsage> => {
  // Incrémenter le compteur d'utilisation de la promotion
  await supabase
    .from('promotions')
    .update({ usage_count: supabase.rpc('increment', { x: 1 }) })
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
  
  const row = unwrap<SupabasePromotionUsageRow>(response as SupabaseResponse<SupabasePromotionUsageRow>);
  return mapPromotionUsageRow(row);
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
  
  const rows = unwrap<SupabasePromotionUsageRow[]>(response as SupabaseResponse<SupabasePromotionUsageRow[]>);
  return rows.map(mapPromotionUsageRow);
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
    .order('applied_at', { ascending: false });
  
  const rows = unwrap<SupabasePromotionUsageRow[]>(response as SupabaseResponse<SupabasePromotionUsageRow[]>);
  return rows.map(mapPromotionUsageRow);
};

/**
 * Vérifie si un client peut utiliser une promotion (basé sur les limites d'utilisation)
 */
export const canCustomerUsePromotion = async (promotionId: string, customerPhone: string): Promise<boolean> => {
  // Récupérer la promotion
  const promotion = await fetchPromotionById(promotionId);
  if (!promotion) return false;
  
  // Vérifier si la promotion a une limite d'utilisation par client
  if (!promotion.conditions.max_uses_per_customer) return true;
  
  // Récupérer les utilisations par ce client
  const usages = await fetchPromotionUsagesByCustomer(promotionId, customerPhone);
  
  // Vérifier si le client a dépassé la limite
  return usages.length < (promotion.conditions.max_uses_per_customer || Infinity);
};

/**
 * Vérifie si une promotion peut encore être utilisée (basé sur le nombre total d'utilisations)
 */
export const canPromotionBeUsed = async (promotionId: string): Promise<boolean> => {
  // Récupérer la promotion
  const promotion = await fetchPromotionById(promotionId);
  if (!promotion) return false;
  
  // Vérifier si la promotion a une limite d'utilisation totale
  if (!promotion.conditions.max_uses_total) return true;
  
  // Vérifier si la promotion a dépassé la limite
  return promotion.usage_count < (promotion.conditions.max_uses_total || Infinity);
};

/**
 * Vérifie si une promotion est applicable à une commande
 */
export const isPromotionApplicableToOrder = (promotion: Promotion, order: Order): boolean => {
  const conditions = promotion.conditions;
  
  // Vérifier le montant minimum de commande
  if (conditions.min_order_amount && (!order.total || order.total < conditions.min_order_amount)) {
    return false;
  }
  
  // Vérifier le nombre minimum d'articles
  if (conditions.min_items_count) {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantite, 0);
    if (totalItems < conditions.min_items_count) {
      return false;
    }
  }
  
  // Vérifier les produits concernés
  if (conditions.product_ids && conditions.product_ids.length > 0) {
    const hasMatchingProduct = order.items.some(item => 
      conditions.product_ids?.includes(item.produitRef)
    );
    if (!hasMatchingProduct) {
      return false;
    }
  }
  
  // Vérifier les catégories concernées
  // Note: Cette vérification nécessiterait de connaître la catégorie de chaque produit
  // Ce qui n'est pas disponible directement dans l'objet Order
  
  // Vérifier les conditions temporelles
  const now = new Date();
  
  // Vérifier la date de début
  if (conditions.start_date && new Date(conditions.start_date) > now) {
    return false;
  }
  
  // Vérifier la date de fin
  if (conditions.end_date && new Date(conditions.end_date) < now) {
    return false;
  }
  
  // Vérifier le jour de la semaine
  if (conditions.days_of_week && conditions.days_of_week.length > 0) {
    const currentDay = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
    if (!conditions.days_of_week.includes(currentDay)) {
      return false;
    }
  }
  
  // Vérifier l'heure de la journée
  if (conditions.hours_of_day) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const [startHour, startMinute] = conditions.hours_of_day.start.split(':').map(Number);
    const [endHour, endMinute] = conditions.hours_of_day.end.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
      return false;
    }
  }
  
  // Si toutes les conditions sont remplies, la promotion est applicable
  return true;
};

/**
 * Calcule le montant de réduction pour une promotion appliquée à une commande
 */
export const calculatePromotionDiscount = (promotion: Promotion, order: Order): number => {
  const discount = promotion.discount;
  
  // Cas de la réduction en pourcentage
  if (discount.type === 'percentage') {
    let baseAmount = 0;
    
    // Déterminer le montant de base sur lequel appliquer la réduction
    if (discount.applies_to === 'total') {
      baseAmount = order.subtotal || order.total;
    } else if (discount.applies_to === 'products' && promotion.conditions.product_ids) {
      // Calculer le total des produits concernés
      baseAmount = order.items
        .filter(item => promotion.conditions.product_ids?.includes(item.produitRef))
        .reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0);
    } else if (discount.applies_to === 'shipping') {
      // Pas de gestion des frais de livraison pour le moment
      baseAmount = 0;
    }
    
    // Calculer la réduction
    let discountAmount = baseAmount * (discount.value / 100);
    
    // Appliquer le plafond si défini
    if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
      discountAmount = discount.max_discount_amount;
    }
    
    return discountAmount;
  }
  
  // Cas de la réduction en montant fixe
  if (discount.type === 'fixed_amount') {
    return discount.value;
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
  const subtotal = order.total;
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
    if (promotion.type === 'promo_code') continue;
    
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
      }
    }
  }
  
  // Mettre à jour la commande avec les promotions appliquées
  return {
    ...order,
    subtotal,
    total_discount: totalDiscount,
    total: subtotal - totalDiscount,
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
