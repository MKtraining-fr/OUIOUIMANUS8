import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface CustomizationTooltipProps {
  content: string;
  children?: React.ReactNode;
}

const CustomizationTooltip: React.FC<CustomizationTooltipProps> = ({
  content,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Aide"
      >
        {children || <HelpCircle className="h-4 w-4" />}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap animate-in fade-in duration-150">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
};

export default CustomizationTooltip;