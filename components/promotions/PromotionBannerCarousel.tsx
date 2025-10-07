import React, { useState, useEffect } from 'react';
import { Promotion } from '../../types/promotions';
import PromotionBanner from './PromotionBanner';
import useActiveBannerPromotions from '../../hooks/useActiveBannerPromotions';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromotionBannerCarouselProps {
  onPromotionClick?: (promotion: Promotion) => void;
  className?: string;
  maxBanners?: number;
}

/**
 * Composant pour afficher un carrousel de bannières promotionnelles
 */
const PromotionBannerCarousel: React.FC<PromotionBannerCarouselProps> = ({
  onPromotionClick,
  className = '',
  maxBanners = 3,
}) => {
  const { promotions = [], loading, error } = useActiveBannerPromotions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  
  // Limiter le nombre de bannières affichées
  const displayedPromotions = promotions?.slice(0, maxBanners) || [];
  
  // Fonction pour passer à la bannière suivante
  const nextBanner = () => {
    if (displayedPromotions.length <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % displayedPromotions.length);
  };
  
  // Fonction pour passer à la bannière précédente
  const prevBanner = () => {
    if (displayedPromotions.length <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + displayedPromotions.length) % displayedPromotions.length);
  };
  
  // Autoplay
  useEffect(() => {
    if (!autoplay || displayedPromotions.length <= 1) return;
    
    const interval = setInterval(() => {
      nextBanner();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoplay, displayedPromotions.length, currentIndex]);
  
  // Arrêter l'autoplay au survol
  const handleMouseEnter = () => setAutoplay(false);
  const handleMouseLeave = () => setAutoplay(true);
  
  // Si aucune promotion n'est disponible, ne rien afficher
  if (!loading && (displayedPromotions.length === 0 || error)) {
    return null;
  }
  
  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Afficher un placeholder pendant le chargement */}
      {loading ? (
        <div className="w-full h-32 md:h-40 bg-gray-200 animate-pulse rounded-xl"></div>
      ) : (
        <>
          {/* Bannière actuelle */}
          {displayedPromotions.length > 0 && currentIndex < displayedPromotions.length && (
            <PromotionBanner 
              promotion={displayedPromotions[currentIndex]} 
              onClick={() => onPromotionClick?.(displayedPromotions[currentIndex])}
            />
          )}
          
          {/* Boutons de navigation (uniquement si plus d'une bannière) */}
          {displayedPromotions.length > 1 && (
            <>
              <button 
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-md hover:bg-white transition"
                onClick={(e) => { e.stopPropagation(); prevBanner(); }}
                aria-label="Bannière précédente"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-md hover:bg-white transition"
                onClick={(e) => { e.stopPropagation(); nextBanner(); }}
                aria-label="Bannière suivante"
              >
                <ChevronRight size={20} />
              </button>
              
              {/* Indicateurs de position */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {displayedPromotions.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                    aria-label={`Aller à la bannière ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PromotionBannerCarousel;
