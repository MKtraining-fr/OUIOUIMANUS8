import React from 'react';
import { Product } from '../types';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import PromotionBadge from './promotions/PromotionBadge';
import useProductPromotions from '../hooks/useProductPromotions';

interface ProductCardWithPromotionProps {
  product: Product;
  onClick: () => void;
}

/**
 * Composant de carte produit avec badge promotionnel
 */
const ProductCardWithPromotion: React.FC<ProductCardWithPromotionProps> = ({ product, onClick }) => {
  // Récupérer toutes les promotions applicables au produit
  const { promotions, loading } = useProductPromotions(product);

  return (
    <div 
      onClick={() => product.estado === 'disponible' && onClick()}
      className={`relative border rounded-2xl p-6 flex flex-col items-center text-center transition-shadow bg-white/90 shadow-md ${
        product.estado === 'disponible' ? 'cursor-pointer hover:shadow-xl' : 'opacity-50'
      }`}
    >
      {/* Afficher tous les badges promotionnels si des promotions sont applicables */}
      {!loading && promotions.length > 0 && product.estado === 'disponible' && (
        <div className="absolute top-2 right-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] justify-end z-10">
          {promotions.map((promotion, index) => (
            <PromotionBadge key={promotion.id || index} promotion={promotion} />
          ))}
        </div>
      )}
      
      {/* Image du produit */}
      <img 
        src={product.image} 
        alt={product.nom_produit} 
        className="w-36 h-36 md:w-40 md:h-40 object-cover rounded-xl mb-4" 
      />
      
      {/* Nom du produit */}
      <p className="font-semibold text-lg flex-grow text-gray-800">{product.nom_produit}</p>
      
      {/* Description */}
      <p className="text-base text-gray-600 mt-2 px-1 max-h-20 overflow-hidden">
        {product.description}
      </p>
      
      {/* Prix */}
      <p className="font-bold text-2xl text-gray-800 mt-3">
        {formatCurrencyCOP(product.prix_vente)}
      </p>
      
      {/* Statut */}
      {product.estado !== 'disponible' && (
        <span className="text-xs text-red-500 font-bold mt-1">Agotado</span>
      )}
    </div>
  );
};

export default ProductCardWithPromotion;
