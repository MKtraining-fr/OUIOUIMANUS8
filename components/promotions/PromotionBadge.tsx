import React from 'react';
import { Promotion } from '../../types/promotions';

interface PromotionBadgeProps {
  promotion: Promotion;
  className?: string;
}

/**
 * Composant qui affiche un badge de promotion sur une carte produit
 */
const PromotionBadge: React.FC<PromotionBadgeProps> = ({ promotion, className = '' }) => {
  const config = promotion.config;
  const visuals = config.visuals || {};
  
  // Déterminer le texte du badge
  let badgeText = visuals.badge_text || '';
  
  if (!badgeText) {
    // Générer un texte par défaut basé sur le type de réduction
    if (config.discount_type === 'percentage') {
      badgeText = `-${config.discount_value}%`;
    } else if (config.discount_type === 'fixed_amount') {
      badgeText = `-$${config.discount_value.toLocaleString()}`;
    } else if (config.buy_quantity && config.get_quantity) {
      badgeText = `${config.buy_quantity}x${config.get_quantity}`;
    } else {
      badgeText = 'PROMO';
    }
  }
  
  // Couleurs par défaut
  const textColor = visuals.badge_color || '#FFFFFF';
  const bgColor = visuals.badge_bg_color || '#E63946';
  const position = visuals.badge_position || 'top-right';
  
  // Classes de positionnement
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  };
  
  return (
    <div
      className={`absolute ${positionClasses[position]} z-10 px-3 py-1 rounded-full font-bold text-sm shadow-lg transform rotate-3 ${className}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        animation: 'pulse 2s infinite'
      }}
      title={visuals.description || promotion.description || promotion.name}
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
