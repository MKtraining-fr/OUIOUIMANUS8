import { useState } from 'react';
import { fetchPromotionByCode } from '../services/promotionsApi';
import { Promotion } from '../types/promotions';

/**
 * Hook pour gérer les codes promo
 * @returns Les fonctions et états pour gérer les codes promo
 */
const usePromoCode = () => {
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoCodePromotion, setPromoCodePromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Applique un code promo
   * @param code Le code promo à appliquer
   * @returns true si le code est valide, false sinon
   */
  const applyPromoCode = async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const promotion = await fetchPromotionByCode(code);
      
      if (!promotion) {
        setError('Code promo invalide ou expiré');
        return false;
      }
      
      setPromoCode(code);
      setPromoCodePromotion(promotion);
      return true;
    } catch (err) {
      setError('Une erreur est survenue lors de la validation du code promo');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Supprime le code promo appliqué
   */
  const removePromoCode = () => {
    setPromoCode(null);
    setPromoCodePromotion(null);
    setError(null);
  };

  return {
    promoCode,
    promoCodePromotion,
    loading,
    error,
    applyPromoCode,
    removePromoCode,
  };
};

export default usePromoCode;
