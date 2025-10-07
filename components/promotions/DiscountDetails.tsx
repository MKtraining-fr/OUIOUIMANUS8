import React from 'react';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';
import { Promotion } from '../../types/promotions';

interface DiscountDetailsProps {
  subtotal: number;
  discount: number;
  total: number;
  promotion?: Promotion | null;
  className?: string;
}

/**
 * Composant pour afficher les détails de la réduction
 */
const DiscountDetails: React.FC<DiscountDetailsProps> = ({
  subtotal,
  discount,
  total,
  promotion,
  className = '',
}) => {
  if (discount <= 0) {
    return null;
  }
  
  // Calculer le pourcentage de réduction
  const discountPercentage = Math.round((discount / subtotal) * 100);
  
  return (
    <div className={`${className}`}>
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
        <h3 className="text-green-800 font-semibold mb-1">Économisez {formatCurrencyCOP(discount)} ({discountPercentage}%)</h3>
        
        {promotion && (
          <p className="text-sm text-green-700 mb-2">
            {promotion.name}
          </p>
        )}
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sous-total:</span>
            <span className="text-gray-800 font-medium">{formatCurrencyCOP(subtotal)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-green-600">Réduction:</span>
            <span className="text-green-600 font-medium">-{formatCurrencyCOP(discount)}</span>
          </div>
          
          <div className="flex justify-between pt-1 border-t border-green-200">
            <span className="text-gray-800 font-medium">Nouveau total:</span>
            <span className="text-gray-800 font-bold">{formatCurrencyCOP(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountDetails;
