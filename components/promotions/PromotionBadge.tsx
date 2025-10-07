import React from 'react';
import { Promotion, PromotionVisuals } from '../../types/promotions';

interface PromotionBadgeProps {
  promotion?: Promotion;
  visuals?: PromotionVisuals;
  defaultText?: string;
  defaultColor?: string;
  className?: string;
}

/**
 * Composant pour afficher un badge de promotion sur les cartes produits
 */
const PromotionBadge: React.FC<PromotionBadgeProps> = ({
  promotion,
  visuals,
  defaultText = 'PROMO',
  defaultColor = '#FF3B30',
  className = '',
}) => {
  // Déterminer le texte et la couleur du badge en fonction du type de promotion
  const getBadgeContent = () => {
    if (!promotion) {
      return {
        text: defaultText,
        color: defaultColor
      };
    }

    switch (promotion.type) {
      case 'percentage':
        const percentage = promotion.discount?.percentage || 0;
        return {
          text: `-${percentage}%`,
          color: '#FF3B30' // Rouge
        };
      case 'fixed_amount':
        return {
          text: 'PROMO',
          color: '#FF9500' // Orange
        };
      case 'buy_x_get_y':
        return {
          text: '2x1',
          color: '#34C759' // Vert
        };
      case 'free_product':
        return {
          text: 'CADEAU',
          color: '#AF52DE' // Violet
        };
      case 'free_shipping':
        return {
          text: 'LIVRAISON',
          color: '#007AFF' // Bleu
        };
      case 'combo':
        return {
          text: 'COMBO',
          color: '#FFCC00' // Jaune
        };
      case 'threshold':
        return {
          text: 'PALIER',
          color: '#5856D6' // Indigo
        };
      case 'happy_hour':
        return {
          text: 'HAPPY HOUR',
          color: '#FF2D55' // Rose
        };
      case 'promo_code':
        return {
          text: 'CODE',
          color: '#8E8E93' // Gris
        };
      default:
        return {
          text: defaultText,
          color: defaultColor
        };
    }
  };

  // Utiliser les visuels personnalisés de la promotion si disponibles
  const badgeContent = getBadgeContent();
  const badgeText = visuals?.badge_text || promotion?.visuals?.badge_text || badgeContent.text;
  const badgeColor = visuals?.badge_color || promotion?.visuals?.badge_color || badgeContent.color;
  
  return (
    <div 
      className={`absolute top-2 right-2 py-1 px-2 rounded-md text-white text-xs font-bold shadow-md transform rotate-3 z-10 ${className}`}
      style={{ 
        backgroundColor: badgeColor,
        animation: 'pulse 2s infinite',
      }}
    >
      {badgeText}
      
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: rotate(3deg) scale(1);
          }
          50% {
            transform: rotate(3deg) scale(1.05);
          }
          100% {
            transform: rotate(3deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default PromotionBadge;
