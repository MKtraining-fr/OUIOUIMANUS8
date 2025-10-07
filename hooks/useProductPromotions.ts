import { useState, useEffect } from 'react';
import { Promotion } from '../types/promotions';
import { fetchActivePromotions, isPromotionApplicableToOrder } from '../services/promotionsApi';

/**
 * Hook pour récupérer les promotions applicables à un produit
 * @param productId ID du produit
 * @returns Les promotions applicables au produit et l'état de chargement
 */
const useProductPromotions = (productId: string) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const allActivePromotions = await fetchActivePromotions();
        
        // Filtrer les promotions applicables au produit
        const applicablePromotions = allActivePromotions.filter(promotion => {
          const conditions = promotion.conditions;
          
          // Si la promotion n'a pas de conditions spécifiques aux produits, elle ne s'applique pas directement aux produits
          if (!conditions.product_ids && !conditions.category_ids) {
            return false;
          }
          
          // Vérifier si le produit est directement concerné
          if (conditions.product_ids?.includes(productId)) {
            return true;
          }
          
          // Pour les promotions basées sur les catégories, il faudrait connaître la catégorie du produit
          // Ce qui nécessiterait une requête supplémentaire
          // Pour l'instant, on ne les inclut pas
          
          return false;
        });
        
        setPromotions(applicablePromotions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [productId]);

  return { promotions, loading, error };
};

export default useProductPromotions;
