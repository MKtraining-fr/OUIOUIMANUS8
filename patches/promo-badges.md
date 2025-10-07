# Patch pour les badges promotionnels

Ce document contient les modifications à apporter au code pour implémenter les badges promotionnels sur les cartes produits.

## 1. Ajouter l'import du composant ProductCardWithPromotion dans CommandeClient.tsx

Ajouter cette ligne à la fin des imports dans CommandeClient.tsx :

```jsx
import ProductCardWithPromotion from '../components/ProductCardWithPromotion';
```

## 2. Modifier la section des produits dans CommandeClient.tsx

Remplacer le code suivant :

```jsx
{filteredProducts.map(product => (
    <div key={product.id} onClick={() => product.estado === 'disponible' && handleProductClick(product)}
        className={`border rounded-2xl p-6 flex flex-col items-center text-center transition-shadow bg-white/90 shadow-md ${product.estado === 'disponible' ? 'cursor-pointer hover:shadow-xl' : 'opacity-50'}`}>
        <img src={product.image} alt={product.nom_produit} className="w-36 h-36 md:w-40 md:h-40 object-cover rounded-xl mb-4" />
        <p className="font-semibold text-lg flex-grow text-gray-800">{product.nom_produit}</p>
        <p className="text-base text-gray-600 mt-2 px-1 max-h-20 overflow-hidden">{product.description}</p>
        <p className="font-bold text-2xl text-gray-800 mt-3">{formatCurrencyCOP(product.prix_vente)}</p>
        {product.estado !== 'disponible' && <span className="text-xs text-red-500 font-bold mt-1">Agotado</span>}
    </div>
))}
```

Par ce code :

```jsx
{filteredProducts.map(product => (
    <ProductCardWithPromotion 
        key={product.id} 
        product={product} 
        onClick={() => product.estado === 'disponible' && handleProductClick(product)} 
    />
))}
```

## 3. Composant ProductCardWithPromotion.tsx

Créer le fichier `components/ProductCardWithPromotion.tsx` avec le contenu suivant :

```tsx
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
  // Récupérer les promotions applicables au produit
  const { bestPromotion, loading } = useProductPromotions(product);

  return (
    <div 
      onClick={() => product.estado === 'disponible' && onClick()}
      className={`relative border rounded-2xl p-6 flex flex-col items-center text-center transition-shadow bg-white/90 shadow-md ${
        product.estado === 'disponible' ? 'cursor-pointer hover:shadow-xl' : 'opacity-50'
      }`}
    >
      {/* Afficher le badge promotionnel si une promotion est applicable */}
      {!loading && bestPromotion && product.estado === 'disponible' && (
        <PromotionBadge promotion={bestPromotion} />
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
```

## 4. Composant PromotionBadge.tsx

Créer le fichier `components/promotions/PromotionBadge.tsx` avec le contenu suivant :

```tsx
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
```

## 5. Hook useProductPromotions.ts

Créer le fichier `hooks/useProductPromotions.ts` avec le contenu suivant :

```tsx
import { useState, useEffect } from 'react';
import { Product } from '../types';
import { Promotion } from '../types/promotions';
import { fetchActivePromotions } from '../services/promotionsApi';

/**
 * Hook pour récupérer les promotions applicables à un produit
 * @param product Le produit pour lequel récupérer les promotions
 * @returns Les promotions applicables au produit et l'état de chargement
 */
const useProductPromotions = (product: Product | null) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Si aucun produit n'est fourni, ne rien faire
    if (!product) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    const fetchPromotions = async () => {
      try {
        setLoading(true);
        // Utiliser un tableau vide par défaut pour éviter les erreurs
        const allActivePromotions = await fetchActivePromotions().catch(() => []);
        
        // Filtrer les promotions applicables au produit
        const applicablePromotions = allActivePromotions.filter(promotion => {
          // Si la promotion n'est pas active, elle ne s'applique pas
          if (promotion.status !== 'active') {
            return false;
          }

          const conditions = promotion.conditions || {};
          
          // Si la promotion n'a pas de conditions spécifiques aux produits, elle ne s'applique pas directement aux produits
          if (!conditions.product_ids && !conditions.category_ids) {
            return false;
          }
          
          // Vérifier si le produit est directement concerné
          if (conditions.product_ids?.includes(product.id)) {
            return true;
          }
          
          // Vérifier si la catégorie du produit est concernée
          if (conditions.category_ids?.includes(product.category_id)) {
            return true;
          }
          
          return false;
        });
        
        // Trier les promotions par priorité (la plus haute d'abord)
        const sortedPromotions = applicablePromotions.sort((a, b) => 
          (b.priority || 0) - (a.priority || 0)
        );
        
        setPromotions(sortedPromotions);
      } catch (err) {
        console.error('Erreur lors du chargement des promotions:', err);
        setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
        // En cas d'erreur, définir un tableau vide pour éviter les erreurs
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [product]);

  // Retourner la promotion la plus prioritaire (si plusieurs sont applicables)
  const bestPromotion = promotions.length > 0 ? promotions[0] : null;

  return { 
    promotions, 
    bestPromotion, 
    loading, 
    error 
  };
};

export default useProductPromotions;
```

## 6. Service promotionsApi.ts

Créer le fichier `services/promotionsApi.ts` avec le contenu suivant :

```tsx
import { supabase } from './supabase';
import { Promotion } from '../types/promotions';

/**
 * Récupère toutes les promotions actives
 * @returns Liste des promotions actives
 */
export const fetchActivePromotions = async (): Promise<Promotion[]> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('status', 'active');
    
    if (error) {
      console.error('Erreur lors de la récupération des promotions:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des promotions:', err);
    return [];
  }
};

/**
 * Récupère les promotions applicables à un produit spécifique
 * @param productId ID du produit
 * @returns Liste des promotions applicables au produit
 */
export const fetchPromotionsForProduct = async (productId: string): Promise<Promotion[]> => {
  try {
    // Récupérer toutes les promotions actives
    const activePromotions = await fetchActivePromotions();
    
    // Filtrer les promotions applicables au produit
    return activePromotions.filter(promotion => {
      const conditions = promotion.conditions || {};
      
      // Vérifier si le produit est directement concerné
      if (conditions.product_ids?.includes(productId)) {
        return true;
      }
      
      // Pour les promotions basées sur les catégories, il faudrait connaître la catégorie du produit
      // Ce qui nécessiterait une requête supplémentaire
      
      return false;
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des promotions pour le produit:', err);
    return [];
  }
};

/**
 * Récupère une promotion par son code
 * @param code Code de la promotion
 * @returns La promotion correspondante ou null si non trouvée
 */
export const fetchPromotionByCode = async (code: string): Promise<Promotion | null> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('type', 'promo_code')
      .eq('status', 'active')
      .eq('conditions->code', code)
      .single();
    
    if (error || !data) {
      console.error('Erreur lors de la récupération de la promotion par code:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Erreur lors de la récupération de la promotion par code:', err);
    return null;
  }
};
```

## 7. Types promotions.ts

Créer le fichier `types/promotions.ts` avec le contenu suivant :

```tsx
export interface PromotionVisuals {
  badge_text?: string;
  badge_color?: string;
  banner_image?: string;
  banner_text?: string;
  banner_button_text?: string;
  banner_button_url?: string;
}

export interface PromotionConditions {
  product_ids?: string[];
  category_ids?: string[];
  min_order_amount?: number;
  max_order_amount?: number;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  code?: string;
  max_uses?: number;
  max_uses_per_customer?: number;
}

export interface PromotionDiscount {
  percentage?: number;
  fixed_amount?: number;
  free_product_id?: string;
  buy_x_get_y?: {
    buy_quantity: number;
    get_quantity: number;
  };
}

export type PromotionType = 
  | 'percentage' 
  | 'fixed_amount' 
  | 'promo_code' 
  | 'buy_x_get_y' 
  | 'free_product' 
  | 'free_shipping' 
  | 'combo' 
  | 'threshold' 
  | 'happy_hour';

export type PromotionStatus = 'active' | 'inactive' | 'scheduled' | 'expired';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  priority?: number;
  conditions?: PromotionConditions;
  discount: PromotionDiscount;
  visuals?: PromotionVisuals;
  created_at: string;
  updated_at: string;
  usage_count: number;
}
```

## 8. Mettre à jour le fichier types/index.ts

Ajouter cette ligne à la fin du fichier `types/index.ts` :

```tsx
export * from './promotions';
```
