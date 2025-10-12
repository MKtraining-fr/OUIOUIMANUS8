import { useState, useEffect } from 'react';
import { Product } from '../types';
import { Promotion, isPromotionCurrentlyValid, isPromotionValidAtTime } from '../types/promotions';
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
      setPromotions([]);
      setLoading(false);
      return;
    }

    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const allActivePromotions = await fetchActivePromotions().catch(err => {
          console.error('[useProductPromotions] Error fetching active promotions from API:', err);
          return [];
        });

        const applicablePromotions = allActivePromotions.filter(promotion => {
          // Vérifier que la promotion est valide
          if (!isPromotionCurrentlyValid(promotion)) return false;
          if (!isPromotionValidAtTime(promotion)) return false;

          const config = promotion.config || {};
          const conditions = Array.isArray(promotion.conditions) ? promotion.conditions : [];

          // Si pas de conditions spécifiques de produit/catégorie, la promotion n'est pas applicable à un produit individuel
          if (!config.product_ids && !config.category_ids && conditions.length === 0) {
            return false;
          }

          // Vérifier les produits spécifiques dans config
          if (config.product_ids && Array.isArray(config.product_ids) && config.product_ids.length > 0) {
            if (config.product_ids.includes(product.id)) {
              return true;
            }
          }

          // Vérifier les catégories spécifiques dans config
          if (config.category_ids && Array.isArray(config.category_ids) && config.category_ids.length > 0) {
            if (config.category_ids.includes(product.categoria_id)) {
              return true;
            }
          }

          // Vérifier les conditions du tableau conditions
          if (conditions.length > 0) {
            const isApplicable = conditions.some(condition => {
              if (condition.type === 'specific_product' && Array.isArray(condition.value)) {
                return condition.value.includes(product.id);
              }
              if (condition.type === 'specific_category' && Array.isArray(condition.value)) {
                return condition.value.includes(product.categoria_id);
              }
              return false;
            });
            
            return isApplicable;
          }

          return false;
        });

        // Trier par priorité (plus élevée en premier)
        const sortedPromotions = applicablePromotions.sort((a, b) => 
          (b.priority || 0) - (a.priority || 0)
        );
        
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

  return { 
    promotions, 
    bestPromotion, 
    loading, 
    error 
  };
};

export default useProductPromotions;
