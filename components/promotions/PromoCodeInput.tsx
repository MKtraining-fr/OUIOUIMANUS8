import React, { useState } from 'react';
import { Percent, Check, X, Loader2 } from 'lucide-react';

interface PromoCodeInputProps {
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
  appliedCode?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Composant pour saisir et appliquer un code promo
 */
const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  onApply,
  onRemove,
  appliedCode,
  disabled = false,
  className = '',
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Si un code est déjà appliqué, afficher l'état appliqué
  if (appliedCode) {
    return (
      <div className={`mt-4 ${className}`}>
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="bg-green-500 text-white p-1 rounded-full">
              <Check size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Code promo appliqué</p>
              <p className="text-xs text-green-600">{appliedCode}</p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="text-gray-500 hover:text-gray-700"
            disabled={disabled}
            aria-label="Supprimer le code promo"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }
  
  // Sinon, afficher le formulaire de saisie
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Veuillez saisir un code promo');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const isValid = await onApply(code.trim());
      if (!isValid) {
        setError('Code promo invalide ou expiré');
        setCode('');
      }
    } catch (err) {
      setError('Une erreur est survenue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`mt-4 ${className}`}>
      <p className="text-sm font-medium text-gray-700 mb-1">Code promo</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Percent size={16} />
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Saisir un code promo"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700 bg-white"
            disabled={disabled || loading}
          />
        </div>
        <button
          type="submit"
          className="bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || loading || !code.trim()}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Appliquer'}
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default PromoCodeInput;
