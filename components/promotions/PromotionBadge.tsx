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
  
  // Déterminer le texte du badge (plus informatif)
  let badgeText = visuals.badge_text || '';
  let badgeDescription = visuals.description || promotion.description || '';
  
  if (!badgeText) {
    // Générer un texte par défaut basé sur le type de réduction
    if (config.discount_type === 'percentage') {
      badgeText = `-${config.discount_value}%`;
      badgeDescription = badgeDescription || `${config.discount_value}% de descuento`;
    } else if (config.discount_type === 'fixed_amount') {
      badgeText = `-$${config.discount_value.toLocaleString()}`;
      badgeDescription = badgeDescription || `$${config.discount_value.toLocaleString()} de descuento`;
    } else if (config.buy_quantity && config.get_quantity) {
      badgeText = `${config.buy_quantity}x${config.get_quantity}`;
      badgeDescription = badgeDescription || `Compra ${config.buy_quantity}, lleva ${config.get_quantity}`;
    } else if (config.applies_to === 'shipping') {
      badgeText = 'ENVÍO GRATIS';
      badgeDescription = badgeDescription || 'Envío gratis en este producto';
    } else {
      // Use promotion name as badge text if no specific type is recognized
      badgeText = promotion.name || 'PROMO';
      badgeDescription = badgeDescription || promotion.name;
    }
  }
  
  // Couleurs par défaut
  const textColor = visuals.badge_color || '#FFFFFF';
  const bgColor = visuals.badge_bg_color || '#E63946';
  
  // Vérifier s'il y a une image de fond
  const backgroundImage = visuals.badge_bg_image;
  
  return (
    <div
      className={`px-2 py-0.5 rounded-full font-bold text-xs shadow-md ${className}`}
      style={{
        backgroundColor: backgroundImage ? 'transparent' : bgColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: textColor,
        textShadow: backgroundImage ? '0 1px 3px rgba(0,0,0,0.8)' : 'none'
      }}
      title={badgeDescription}
    >
      {badgeText}
    </div>
  );
};

export default PromotionBadge;
