import React from 'react';
import { Promotion } from '../../types/promotions';
import { ArrowRight } from 'lucide-react';

interface PromotionBannerProps {
  promotion: Promotion;
  onClick?: () => void;
  className?: string;
}

/**
 * Composant pour afficher une bannière promotionnelle sur la page d'accueil
 */
const PromotionBanner: React.FC<PromotionBannerProps> = ({
  promotion,
  onClick,
  className = '',
}) => {
  const { visuals } = promotion;
  
  // Si la promotion n'a pas d'éléments visuels définis, utiliser des valeurs par défaut
  const bannerText = visuals?.banner_text || promotion.name;
  const bannerCta = visuals?.banner_cta || 'En profiter';
  const bannerImage = visuals?.banner_image;
  
  // Déterminer le texte du badge en fonction du type de promotion
  let badgeText = visuals?.badge_text || '';
  if (!badgeText) {
    if (promotion.type === 'percentage') {
      badgeText = `-${promotion.discount.value}%`;
    } else if (promotion.type === 'fixed_amount') {
      badgeText = `-${promotion.discount.value}`;
    } else if (promotion.type === 'buy_x_get_y') {
      const { buy_quantity, get_quantity } = promotion.conditions;
      badgeText = buy_quantity && get_quantity ? `${buy_quantity}x${get_quantity}` : '2x1';
    } else if (promotion.type === 'promo_code') {
      badgeText = 'CODE';
    } else {
      badgeText = 'PROMO';
    }
  }
  
  // Couleur du badge
  const badgeColor = visuals?.badge_color || '#FF3B30';
  
  return (
    <div 
      className={`relative overflow-hidden rounded-xl shadow-lg mb-6 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Image de fond ou couleur de fond par défaut */}
      <div 
        className="w-full h-32 md:h-40 bg-gradient-to-r from-orange-500 to-red-600 flex items-center"
        style={bannerImage ? { backgroundImage: `url(${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {/* Contenu de la bannière */}
        <div className="w-full h-full flex items-center p-4 bg-black/30">
          <div className="flex-1">
            {/* Badge */}
            <span 
              className="inline-block py-1 px-3 rounded-full text-white text-xs font-bold mb-2"
              style={{ backgroundColor: badgeColor }}
            >
              {badgeText}
            </span>
            
            {/* Texte principal */}
            <h3 className="text-white text-xl md:text-2xl font-bold mb-2 drop-shadow-md">
              {bannerText}
            </h3>
            
            {/* Bouton d'appel à l'action */}
            <button className="inline-flex items-center gap-1 bg-white text-orange-600 py-1 px-3 rounded-full text-sm font-semibold transition hover:bg-orange-50">
              {bannerCta} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionBanner;
