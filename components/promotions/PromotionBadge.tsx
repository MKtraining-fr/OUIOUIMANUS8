import React from 'react';
import { PromotionVisuals } from '../../types/promotions';

interface PromotionBadgeProps {
  visuals?: PromotionVisuals;
  defaultText?: string;
  defaultColor?: string;
  className?: string;
}

/**
 * Composant pour afficher un badge de promotion sur les cartes produits
 */
const PromotionBadge: React.FC<PromotionBadgeProps> = ({
  visuals,
  defaultText = 'PROMO',
  defaultColor = '#FF3B30',
  className = '',
}) => {
  const badgeText = visuals?.badge_text || defaultText;
  const badgeColor = visuals?.badge_color || defaultColor;
  
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
