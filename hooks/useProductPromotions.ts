import { useState, useEffect } from 'react';
import { Product } from '../types';
import { Promotion, PromotionConditions } from '../types/promotions';
import { fetchActivePromotions } from '../services/promotionsApi';

/**
 * Hook pour récupérer les promotions applicables à un produit
 * @param product Le produit pour lequel récupérer les promotions
 * @returns Les promotions applicables au produit et l'état de chargement
 */
const useProductPromotions = (product: Product | null) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!product) {
      console.log('[useProductPromotions] No product provided, skipping promotion fetch.');
      setPromotions([]);
      setLoading(false);
      return;
    }

    const fetchPromotions = async () => {
      console.log(`[useProductPromotions] Starting promotion fetch for product: ${product.nom_produit} (ID: ${product.id}, Category ID: ${product.categoria_id})`);
      try {
        setLoading(true);
        const allActivePromotions = await fetchActivePromotions().catch(err => {
          console.error('[useProductPromotions] Error fetching active promotions from API:', err);
          return [];
        });
        
        console.log('[useProductPromotions] All active promotions fetched:', allActivePromotions);

        const applicablePromotions = allActivePromotions.filter(promotion => {
          console.log(`[useProductPromotions] Evaluating promotion: ${promotion.name} (ID: ${promotion.id})`);
          if (promotion.status !== 'active') {
            console.log(`[useProductPromotions] Promotion ${promotion.name} is not active.`);
            return false;
          }

          const conditionsArray = Array.isArray(promotion.conditions) ? promotion.conditions : [];
          console.log(`[useProductPromotions] Promotion ${promotion.name} conditions:`, conditionsArray);

          if (conditionsArray.length === 0) {
            console.log(`[useProductPromotions] Promotion ${promotion.name} has no specific conditions, not applicable to a product.`);
            return false;
          }

          const isApplicable = conditionsArray.some(condition => {
            if (condition.type === 'specific_product' && Array.isArray(condition.value)) {
              const applies = condition.value.includes(product.id);
              console.log(`[useProductPromotions] Checking product condition for ${promotion.name}: product.id (${product.id}) in ${condition.value}? ${applies}`);
              return applies;
            }
            if (condition.type === 'specific_category' && Array.isArray(condition.value)) {
              const applies = condition.value.includes(product.categoria_id);
              console.log(`[useProductPromotions] Checking category condition for ${promotion.name}: product.categoria_id (${product.categoria_id}) in ${condition.value}? ${applies}`);
              return applies;
            }
            return false;
          });
          console.log(`[useProductPromotions] Promotion ${promotion.name} is applicable: ${isApplicable}`);
          return isApplicable;
        });
        
        console.log('[useProductPromotions] Filtered applicable promotions:', applicablePromotions);

        const sortedPromotions = applicablePromotions.sort((a, b) => 
          (b.priority || 0) - (a.priority || 0)
        );
        
        console.log('[useProductPromotions] Sorted applicable promotions (best first):', sortedPromotions);
        setPromotions(sortedPromotions);
      } catch (err) {
        console.error('[useProductPromotions] Error during promotion processing:', err);
        setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [product]);

  const bestPromotion = promotions.length > 0 ? promotions[0] : null;
  console.log('[useProductPromotions] Best promotion for product:', product?.nom_produit, bestPromotion);

  return { 
    promotions, 
    bestPromotion, 
    loading, 
    error 
  };
};
