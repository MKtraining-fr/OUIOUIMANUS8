import React, { useEffect, useState } from 'react';
import { fetchActivePromotions } from '../services/promotionsApi';
import { Promotion } from '../types/promotions';
import { Tag, Gift, TruckIcon, Clock, Percent } from 'lucide-react';

const ActivePromotionsDisplay: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const activePromos = await fetchActivePromotions();
        setPromotions(activePromos);
      } catch (error) {
        console.error('Error loading promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPromotions();
  }, []);

  // Filter out promo code promotions (codes secrets)
  const visiblePromotions = promotions.filter(promo => {
    if (promo.type === 'promo_code') return false;
    
    return true;
  });

  if (loading || visiblePromotions.length === 0) return null;

  const getPromotionIcon = (promo: Promotion) => {
    if (promo.type === 'free_shipping') return <TruckIcon size={16} />;
    if (promo.type === 'percentage') return <Percent size={16} />;
    if (promo.conditions?.time_range) return <Clock size={16} />;
    if (promo.type === 'buy_x_get_y') return <Gift size={16} />;
    return <Tag size={16} />;
  };

  const getPromotionDescription = (promo: Promotion) => {
    const discount = promo.discount;
    const conditions = promo.conditions;

    let description = promo.description || promo.name;
    
    // Add conditions info
    if (conditions?.min_order_amount) {
      description += ` (Mínimo: ${conditions.min_order_amount.toLocaleString()})`;
    }

    if (conditions?.time_range) {
      description += ` (${conditions.time_range.start_time} - ${conditions.time_range.end_time})`;
    }

    if (promo.type === 'promo_code' && discount?.promo_code) {
      description += ` (Código: ${discount.promo_code})`;
    }

    return description;
  };

  return (
    <div className="mb-4 space-y-2">
      <h3 className="text-lg font-bold text-gray-900 flex items-center drop-shadow-md">
        <Gift className="mr-2" size={22} />
        Promociones Activas
      </h3>
      <div className="space-y-2">
        {visiblePromotions.map((promo) => {
          const bgColor = promo.visuals?.badge_bg_color || '#4CAF50';
          const bannerImage = promo.visuals?.banner_image;
          const bannerText = promo.visuals?.banner_text;
          
          // Si une bannière d'image est disponible, l'afficher en grand
          if (bannerImage) {
            return (
              <div
                key={promo.id}
                className="relative overflow-hidden rounded-lg shadow-md transition-transform hover:scale-[1.02]"
              >
                <img
                  src={bannerImage}
                  alt={promo.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <div className="text-white">
                    <p className="font-bold text-lg drop-shadow-md">{promo.name}</p>
                    {bannerText && (
                      <p className="text-sm drop-shadow-md">{bannerText}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          // Sinon, afficher le format compact habituel
          return (
            <div
              key={promo.id}
              className="flex items-start p-2 rounded-lg shadow-sm border-l-4 transition-transform hover:scale-[1.01]"
              style={{
                borderLeftColor: bgColor,
                background: `linear-gradient(to right, ${bgColor}15, white)`,
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: bgColor, color: promo.visuals?.badge_color || '#FFFFFF' }}
              >
                {getPromotionIcon(promo)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{promo.name}</p>
                <p className="text-xs text-gray-600">{getPromotionDescription(promo)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePromotionsDisplay;
