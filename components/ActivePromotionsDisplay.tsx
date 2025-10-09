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
    const config = promo.config as any;
    const conditions = promo.conditions as any[];
    
    // Check if it's a promo code in config
    if (config.promo_code) return false;
    
    // Check if it's a promo code in conditions
    if (conditions && conditions.some(c => c.type === 'promo_code')) return false;
    
    // Check if the description mentions "code promo" or "código"
    if (promo.description && /code|código|promo code/i.test(promo.description)) return false;
    
    return true;
  });

  if (loading || visiblePromotions.length === 0) return null;

  const getPromotionIcon = (promo: Promotion) => {
    const config = promo.config as any;
    if (config.applies_to === 'shipping') return <TruckIcon size={16} />;
    if (config.discount_type === 'percentage') return <Percent size={16} />;
    if (config.hours_of_day) return <Clock size={16} />;
    if (config.buy_quantity) return <Gift size={16} />;
    return <Tag size={16} />;
  };

  const getPromotionDescription = (promo: Promotion) => {
    const config = promo.config as any;
    const conditions = promo.conditions as any[];

    let description = promo.description || promo.name;
    
    // Add conditions info
    const minAmount = conditions.find(c => c.type === 'min_order_amount');
    if (minAmount) {
      description += ` (Mínimo: $${minAmount.value.toLocaleString()})`;
    }

    if (config.hours_of_day) {
      description += ` (${config.hours_of_day.start} - ${config.hours_of_day.end})`;
    }

    if (config.promo_code) {
      description += ` (Código: ${config.promo_code})`;
    }

    return description;
  };

  return (
    <div className="mb-4 space-y-2">
      <h3 className="text-lg font-bold text-gray-900 flex items-center drop-shadow-md">
        <Gift className="mr-2" size={22} />
        Promociones Activas
      </h3>
      <div className="space-y-1.5">
        {visiblePromotions.map((promo) => {
          const config = promo.config as any;
          const bgColor = config.visuals?.badge_bg_color || '#4CAF50';
          
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
                style={{ backgroundColor: bgColor, color: config.visuals?.badge_color || '#FFFFFF' }}
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
