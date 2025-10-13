
import { supabase } from './supabaseClient';
import {
  Promotion,
  AppliedPromotion,
  PromotionType,
  PromotionDiscount,
  PromotionConditions,
  BuyXGetYConfig,
} from '../types/promotions';
import { Order, CartItem } from '../types';

// Fonctions utilitaires pour la validation des promotions

const isPromotionActive = (promotion: Promotion): boolean => {
  if (promotion.status !== 'active') return false;
  const now = new Date();
  if (promotion.conditions.start_date && new Date(promotion.conditions.start_date) > now) return false;
  if (promotion.conditions.end_date && new Date(promotion.conditions.end_date) < now) return false;
  if (promotion.conditions.usage_limit && promotion.usage_count >= promotion.conditions.usage_limit) return false;
  return true;
};

const checkTimeAndDay = (conditions: PromotionConditions): boolean => {
  const now = new Date();
  if (conditions.days_of_week && !conditions.days_of_week.includes(now.getDay())) return false;
  if (conditions.time_range) {
    const [startHour, startMinute] = conditions.time_range.start_time.split(':').map(Number);
    const [endHour, endMinute] = conditions.time_range.end_time.split(':').map(Number);
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    if (currentTime < startTime || currentTime > endTime) return false;
  }
  return true;
};

const checkOrderConditions = (order: Order, conditions: PromotionConditions): boolean => {
  const orderSubtotal = order.subtotal || order.total;
  if (conditions.min_order_amount && orderSubtotal < conditions.min_order_amount) return false;
  if (conditions.max_order_amount && orderSubtotal > conditions.max_order_amount) return false;
  const totalItems = order.items.reduce((acc, item) => acc + item.quantite, 0);
  if (conditions.min_items_count && totalItems < conditions.min_items_count) return false;
  if (conditions.max_items_count && totalItems > conditions.max_items_count) return false;
  if (conditions.order_types && !conditions.order_types.includes(order.type)) return false;
  if (conditions.first_order_only) {
    // La logique de vérification de la première commande doit être implémentée
    // en se basant sur l'historique des commandes du client.
    // Pour l'instant, nous laissons cette condition de côté.
  }
  return true;
};

const isPromotionApplicableToOrder = (promotion: Promotion, order: Order): boolean => {
  if (!isPromotionActive(promotion)) return false;
  if (!checkTimeAndDay(promotion.conditions)) return false;
  if (!checkOrderConditions(order, promotion.conditions)) return false;

  if (promotion.type === 'buy_x_get_y') {
    const config = promotion.discount.buy_x_get_y_config;
    if (!config || !config.product_ids) return false;

    const totalQuantity = order.items
      .filter(item => config.product_ids.includes(item.produitRef))
      .reduce((acc, item) => acc + item.quantite, 0);

    return totalQuantity >= 2;
  }

  return true;
};

// Fonctions de calcul des réductions par type de promotion

const calculatePercentageDiscount = (order: Order, discount: PromotionDiscount): number => {
  let applicableAmount = 0;
  const orderSubtotal = order.subtotal || order.total;
  
  if (discount.applies_to === 'total') {
    applicableAmount = orderSubtotal;
  } else if (discount.applies_to === 'products' && discount.product_ids && discount.product_ids.length > 0) {
    applicableAmount = order.items
      .filter(item => discount.product_ids?.includes(item.produitRef))
      .reduce((acc, item) => acc + item.prix_unitaire * item.quantite, 0);
  } else if (discount.applies_to === 'categories' && discount.category_ids && discount.category_ids.length > 0) {
    // La logique de catégorie nécessite que les produits aient une référence de catégorie
    // applicableAmount = ...
  }

  let discountAmount = (applicableAmount * discount.discount_value) / 100;
  if (discount.max_discount_amount) {
    discountAmount = Math.min(discountAmount, discount.max_discount_amount);
  }
  return discountAmount;
};

const calculateFixedAmountDiscount = (order: Order, discount: PromotionDiscount): number => {
  return discount.discount_value;
};

const calculateBuyXGetYDiscount = (order: Order, discount: PromotionDiscount): number => {
  const config = discount.buy_x_get_y_config;
  if (!config) return 0;

  let totalDiscount = 0;

  // Group items by productRef to handle identical products
  const groupedItems = order.items.reduce((acc, item) => {
    if (!acc[item.produitRef]) {
      acc[item.produitRef] = [];
    }
    acc[item.produitRef].push(item);
    return acc;
  }, {} as { [key: string]: OrderItem[] });

  for (const produitRef in groupedItems) {
    const items = groupedItems[produitRef];
    const totalQuantity = items.reduce((acc, item) => acc + item.quantite, 0);

    // Check if this product is part of the 2x1 configuration
    if (config.product_ids && config.product_ids.includes(produitRef)) {
      // For 2x1: when customer adds 2 identical products, one is free
      // So we check if totalQuantity >= 2
      if (totalQuantity >= 2) {
        // Calculate how many free items the customer gets
        // For every 2 items, 1 is free
        const numberOfFreeItems = Math.floor(totalQuantity / 2);
        
        // Find the cheapest price among all items of this product
        // Sort items by price to give the cheapest ones for free
        const sortedItems = [...items].sort((a, b) => a.prix_unitaire - b.prix_unitaire);
        
        // The discount is the price of the cheapest item multiplied by the number of free items
        if (sortedItems.length > 0) {
          totalDiscount += sortedItems[0].prix_unitaire * numberOfFreeItems;
        }
      }
    }
  }
  return totalDiscount;
};

const calculateFreeShippingDiscount = (order: Order): number => {
  // La valeur de la livraison doit être récupérée depuis les paramètres de la commande ou du site
  const shippingCost = order.shipping_cost || 0;
  return shippingCost;
};

const calculatePromotionDiscount = (promotion: Promotion, order: Order): number => {
  switch (promotion.type) {
    case 'percentage':
      return calculatePercentageDiscount(order, promotion.discount);
    case 'fixed_amount':
      return calculateFixedAmountDiscount(order, promotion.discount);
    case 'promo_code': // Les codes promos peuvent être de type pourcentage ou montant fixe
      if (promotion.discount.discount_type === 'percentage') {
        return calculatePercentageDiscount(order, promotion.discount);
      } else if (promotion.discount.discount_type === 'fixed_amount') {
        return calculateFixedAmountDiscount(order, promotion.discount);
      }
      return 0;
    case 'buy_x_get_y':
      return calculateBuyXGetYDiscount(order, promotion.discount);
    case 'free_shipping':
      return calculateFreeShippingDiscount(order);
    case 'threshold': // Promotions de type palier (seuil)
      // Pour les promotions de type threshold, on applique la réduction si le montant minimum est atteint
      // La vérification du montant minimum est déjà faite dans isPromotionApplicableToOrder
      // On applique donc la réduction selon le type (pourcentage ou montant fixe)
      if (promotion.discount.discount_type === 'percentage') {
        return calculatePercentageDiscount(order, promotion.discount);
      } else if (promotion.discount.discount_type === 'fixed_amount') {
        return calculateFixedAmountDiscount(order, promotion.discount);
      }
      return 0;
    case 'happy_hour': // Promotions happy hour
      // Pour les happy hours, on applique la réduction si l'heure actuelle est dans la plage
      // La vérification de l'heure est déjà faite dans checkTimeAndDay
      // On applique donc la réduction selon le type (pourcentage ou montant fixe)
      if (promotion.discount.discount_type === 'percentage') {
        return calculatePercentageDiscount(order, promotion.discount);
      } else if (promotion.discount.discount_type === 'fixed_amount') {
        return calculateFixedAmountDiscount(order, promotion.discount);
      }
      return 0;
    // Les autres types de promotions (free_product, combo) 
    // nécessitent une logique plus complexe qui sera ajoutée ultérieurement.
    default:
      return 0;
  }
};

// Fonction principale pour appliquer les promotions

export const applyPromotionsToOrder = async (order: Order): Promise<Order> => {
  const mutableOrder = { 
    ...order, 
    applied_promotions: [], 
    total_discount: 0,
    subtotal: order.subtotal || order.total
  };

  const { data: activePromotions, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active');

  if (error || !activePromotions) {
    console.error('Error fetching active promotions:', error);
    return order; // Retourne la commande originale en cas d'erreur
  }

  // Séparer les promotions en deux groupes
  // Groupe 1: Promotions qui s'appliquent en premier (2x1, happy_hour, codes promo)
  // Groupe 2: Promotions basées sur le total de la commande (percentage, fixed_amount, threshold, free_shipping)
  let currentSubtotal = mutableOrder.subtotal!;

  // 1. Appliquer les promotions 'Buy X Get Y' en premier
  const buyXGetYPromotions = activePromotions
    .filter(promo => promo.type === 'buy_x_get_y' && isPromotionApplicableToOrder(promo, mutableOrder))
    .sort((a, b) => b.priority - a.priority);

  for (const promo of buyXGetYPromotions) {
    const discount = calculatePromotionDiscount(promo, mutableOrder);
    if (discount > 0) {
      const cappedDiscount = Math.min(discount, currentSubtotal);
      currentSubtotal -= cappedDiscount;
      mutableOrder.total_discount! += cappedDiscount;
      mutableOrder.applied_promotions!.push({
        promotion_id: promo.id,
        name: promo.name,
        discount_amount: cappedDiscount,
        config: promo.discount.buy_x_get_y_config, // Ajouter la config pour le suivi
      });
    }
  }

  // 2. Appliquer les codes promo
  if (order.promo_code) {
    const promoCodePromotion = await fetchPromotionByCode(order.promo_code);

    if (promoCodePromotion && isPromotionApplicableToOrder(promoCodePromotion, mutableOrder)) {
      const discount = calculatePromotionDiscount(promoCodePromotion, mutableOrder);
      if (discount > 0) {
        const cappedDiscount = Math.min(discount, currentSubtotal);
        currentSubtotal -= cappedDiscount;
        mutableOrder.total_discount! += cappedDiscount;
        mutableOrder.applied_promotions!.push({
          promotion_id: promoCodePromotion.id,
          name: promoCodePromotion.name,
          discount_amount: cappedDiscount,
          config: { promo_code: promoCodePromotion.discount.promo_code }, // Ajouter le code promo pour le suivi
        });
      }
    }
  }

  // 3. Appliquer les promotions en pourcentage sur le total (et autres réductions générales)
  const percentageAndFixedPromotions = activePromotions
    .filter(promo =>
      (promo.type === 'percentage' || promo.type === 'fixed_amount' || promo.type === 'threshold' || promo.type === 'happy_hour') &&
      isPromotionApplicableToOrder(promo, mutableOrder)
    )
    .sort((a, b) => b.priority - a.priority);

  for (const promo of percentageAndFixedPromotions) {
    const discount = calculatePromotionDiscount(promo, mutableOrder);
    if (discount > 0) {
      const cappedDiscount = Math.min(discount, currentSubtotal);
      currentSubtotal -= cappedDiscount;
      mutableOrder.total_discount! += cappedDiscount;
      mutableOrder.applied_promotions!.push({
        promotion_id: promo.id,
        name: promo.name,
        discount_amount: cappedDiscount,
      });
    }
  }

  // 4. Appliquer la promotion 'Domicilio Gratis' en dernier
  const freeShippingPromotion = activePromotions
    .find(promo => promo.type === 'free_shipping' && isPromotionApplicableToOrder(promo, mutableOrder));

  if (freeShippingPromotion) {
    const discount = calculatePromotionDiscount(freeShippingPromotion, mutableOrder);
    if (discount > 0) {
      // Les frais de livraison sont gérés séparément dans CommandeClient.tsx
      // Ici, nous enregistrons juste la promotion appliquée.
      mutableOrder.applied_promotions!.push({
        promotion_id: freeShippingPromotion.id,
        name: freeShippingPromotion.name,
        discount_amount: discount,
        type: 'FREE_SHIPPING', // Ajouter le type pour une meilleure identification
      });
    }
  }

  mutableOrder.total = currentSubtotal;
  return mutableOrder;
};

// Fonctions CRUD pour la gestion des promotions

export const fetchPromotions = async (): Promise<Promotion[]> => {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching promotions:', error);
    throw new Error('Impossible de récupérer les promotions');
  }

  return data || [];
};

export const fetchPromotionById = async (id: string): Promise<Promotion | null> => {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching promotion:', error);
    return null;
  }

  return data;
};

export const fetchActivePromotions = async (): Promise<Promotion[]> => {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active')
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching active promotions:', error);
    throw new Error('Impossible de récupérer les promotions actives');
  }

  return data || [];
};

export const createPromotion = async (
  promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
): Promise<Promotion> => {
  const { data, error } = await supabase
    .from('promotions')
    .insert([{ ...promotion, usage_count: 0 }])
    .select()
    .single();

  if (error) {
    console.error('Error creating promotion:', error);
    throw new Error('Impossible de créer la promotion');
  }

  return data;
};

export const updatePromotion = async (
  id: string,
  promotion: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at' | 'usage_count'>>
): Promise<Promotion> => {
  const { data, error } = await supabase
    .from('promotions')
    .update(promotion)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating promotion:', error);
    throw new Error('Impossible de mettre à jour la promotion');
  }

  return data;
};

export const updatePromotionStatus = async (
  id: string,
  status: PromotionStatus
): Promise<Promotion> => {
  return updatePromotion(id, { status });
};

export const deletePromotion = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting promotion:', error);
    throw new Error('Impossible de supprimer la promotion');
  }
};

export const fetchPromotionByCode = async (code: string): Promise<Promotion | null> => {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('type', 'promo_code')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching promotion by code:', error);
    return null;
  }

  // Filtrer par code promo dans le champ discount JSONB
  const promotion = data?.find(p => p.discount?.promo_code === code);
  return promotion || null;
};

// Fonctions pour l'enregistrement des utilisations de promotions

interface PromotionUsage {
  id: string;
  promotion_id: string;
  order_id: string;
  customer_phone?: string;
  discount_amount: number;
  applied_at: string;
}

export const recordPromotionUsage = async (
  usage: Omit<PromotionUsage, 'id' | 'applied_at'>
): Promise<void> => {
  const { error } = await supabase
    .from('promotion_usages')
    .insert([usage]);

  if (error) {
    console.error('Error recording promotion usage:', error);
    throw new Error('Impossible d\'enregistrer l\'utilisation de la promotion');
  }

  // Incrémenter le compteur d'utilisation de la promotion
  const { error: updateError } = await supabase.rpc('increment', {
    row_id: usage.promotion_id,
    table_name: 'promotions',
    column_name: 'usage_count'
  });

  if (updateError) {
    console.error('Error incrementing usage count:', updateError);
  }
};

export const recordPromotionUsagesForOrder = async (order: Order): Promise<void> => {
  if (!order.applied_promotions || order.applied_promotions.length === 0) return;

  for (const appliedPromo of order.applied_promotions) {
    await recordPromotionUsage({
      promotion_id: appliedPromo.promotion_id,
      order_id: order.id,
      customer_phone: order.client_phone,
      discount_amount: appliedPromo.discount_amount,
    });
  }
};

export const fetchPromotionUsages = async (promotionId: string): Promise<PromotionUsage[]> => {
  const { data, error } = await supabase
    .from('promotion_usages')
    .select('*')
    .eq('promotion_id', promotionId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('Error fetching promotion usages:', error);
    return [];
  }

  return data || [];
};

export const canCustomerUsePromotion = async (
  promotionId: string,
  customerPhone: string
): Promise<boolean> => {
  const promotion = await fetchPromotionById(promotionId);
  if (!promotion) return false;

  if (!promotion.conditions.usage_limit_per_customer) return true;

  const { data, error } = await supabase
    .from('promotion_usages')
    .select('*')
    .eq('promotion_id', promotionId)
    .eq('customer_phone', customerPhone);

  if (error) {
    console.error('Error checking customer promotion usage:', error);
    return false;
  }

  return (data?.length || 0) < promotion.conditions.usage_limit_per_customer;
};

