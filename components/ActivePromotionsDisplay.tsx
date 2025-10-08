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

  if (loading || promotions.length === 0) return null;

  const getPromotionIcon = (promo: Promotion) => {
    const config = promo.config as any;
    if (config.applies_to === 'shipping') return <TruckIcon size={20} />;
    if (config.discount_type === 'percentage') return <Percent size={20} />;
    if (config.hours_of_day) return <Clock size={20} />;
    if (config.buy_quantity) return <Gift size={20} />;
    return <Tag size={20} />;
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
    <div className="mb-6 space-y-3">
      <h3 className="text-lg font-bold text-gray-800 flex items-center">
        <Gift className="mr-2" size={24} />
        Promociones Activas
      </h3>
      <div className="space-y-2">
        {promotions.map((promo) => {
          const config = promo.config as any;
          const bgColor = config.visuals?.badge_bg_color || '#4CAF50';
          
          return (
            <div
              key={promo.id}
              className="flex items-start p-4 rounded-lg shadow-md border-l-4 transition-transform hover:scale-[1.02]"
              style={{
                borderLeftColor: bgColor,
                background: `linear-gradient(to right, ${bgColor}15, white)`,
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full mr-3 flex-shrink-0"
                style={{ backgroundColor: bgColor, color: config.visuals?.badge_color || '#FFFFFF' }}
              >
                {getPromotionIcon(promo)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{promo.name}</p>
                <p className="text-sm text-gray-600">{getPromotionDescription(promo)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePromotionsDisplay;
