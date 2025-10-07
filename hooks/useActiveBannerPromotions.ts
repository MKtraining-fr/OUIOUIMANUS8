import { useState, useEffect } from 'react';
import { Promotion } from '../types/promotions';
import { fetchActivePromotions } from '../services/promotionsApi';

/**
 * Hook pour récupérer les promotions actives avec bannières
 * @returns Les promotions actives avec bannières et l'état de chargement
 */
const useActiveBannerPromotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        // Utiliser un tableau vide par défaut pour éviter les erreurs
        const allActivePromotions = await fetchActivePromotions().catch(() => []);
        
        // Filtrer les promotions qui ont des bannières définies
        const bannerPromotions = allActivePromotions.filter(promotion => {
          // Vérifier si la promotion a des éléments visuels de bannière définis
          return promotion.visuals?.banner_text || promotion.visuals?.banner_image;
        });
        
        // Trier par priorité (du plus élevé au plus bas)
        const sortedPromotions = bannerPromotions.sort((a, b) => b.priority - a.priority);
        
        setPromotions(sortedPromotions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
        // En cas d'erreur, définir un tableau vide pour éviter les erreurs
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  return { promotions, loading, error };
};

export default useActiveBannerPromotions;
