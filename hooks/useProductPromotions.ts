import { useState, useEffect } from 'react';
import { Product } from '../types';
import { Promotion } from '../types/promotions';
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
    // Si aucun produit n'est fourni, ne rien faire
    if (!product) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    const fetchPromotions = async () => {
      try {
        setLoading(true);
        // Utiliser un tableau vide par défaut pour éviter les erreurs
        const allActivePromotions = await fetchActivePromotions().catch(() => []);
        
        // Filtrer les promotions applicables au produit
        const applicablePromotions = allActivePromotions.filter(promotion => {
          // Si la promotion n'est pas active, elle ne s'applique pas
          if (promotion.status !== 'active') {
            return false;
          }

          const conditions = promotion.conditions || {};
          
          // Si la promotion n'a pas de conditions spécifiques aux produits, elle ne s'applique pas directement aux produits
          if (!conditions.product_ids && !conditions.category_ids) {
            return false;
          }
          
          // Vérifier si le produit est directement concerné
          if (conditions.product_ids?.includes(product.id)) {
            return true;
          }
          
          // Vérifier si la catégorie du produit est concernée
          if (conditions.category_ids?.includes(product.category_id)) {
            return true;
          }
          
          return false;
        });
        
        // Trier les promotions par priorité (la plus haute d'abord)
        const sortedPromotions = applicablePromotions.sort((a, b) => 
          (b.priority || 0) - (a.priority || 0)
        );
        
        setPromotions(sortedPromotions);
      } catch (err) {
        console.error('Erreur lors du chargement des promotions:', err);
        setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
        // En cas d'erreur, définir un tableau vide pour éviter les erreurs
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [product]);

  // Retourner la promotion la plus prioritaire (si plusieurs sont applicables)
  const bestPromotion = promotions.length > 0 ? promotions[0] : null;

  return { 
    promotions, 
    bestPromotion, 
    loading, 
    error 
  };
};

export default useProductPromotions;
