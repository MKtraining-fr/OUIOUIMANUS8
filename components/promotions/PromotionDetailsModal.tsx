import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, Percent, Package, Info, ExternalLink } from 'lucide-react';
import { Promotion, PromotionUsage } from '../../types';
import { fetchPromotionUsages } from '../../services/promotionsApi';

interface PromotionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion;
}

const typeLabels: Record<string, string> = {
  percentage: 'Pourcentage',
  fixed_amount: 'Montant fixe',
  promo_code: 'Code promo',
  buy_x_get_y: '2x1 / Achetez X, obtenez Y',
  free_product: 'Produit gratuit',
  free_shipping: 'Livraison gratuite',
  combo: 'Combo',
  threshold: 'Palier',
  happy_hour: 'Happy hour'
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  scheduled: 'Programmée',
  expired: 'Expirée'
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800'
};

const PromotionDetailsModal: React.FC<PromotionDetailsModalProps> = ({ isOpen, onClose, promotion }) => {
  const [usages, setUsages] = useState<PromotionUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'usages'>('details');

  useEffect(() => {
    if (isOpen && promotion) {
      loadUsages();
    }
  }, [isOpen, promotion]);

  const loadUsages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPromotionUsages(promotion.id);
      setUsages(data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Détails de la promotion</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b">
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'details' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-600'}`}
            onClick={() => setActiveTab('details')}
          >
            Détails
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'usages' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-600'}`}
            onClick={() => setActiveTab('usages')}
          >
            Utilisations ({promotion.usage_count})
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{promotion.name}</h3>
                  <div className="flex items-center mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[promotion.status]}`}>
                      {statusLabels[promotion.status]}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {typeLabels[promotion.type]}
                    </span>
                  </div>
                </div>
                <div className="mt-2 md:mt-0">
                  <span className="text-sm text-gray-500">Priorité: {promotion.priority}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Info size={16} className="mr-1" />
                    Informations générales
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ID:</span>
                      <span className="text-sm font-mono">{promotion.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Créée le:</span>
                      <span className="text-sm">{formatDate(promotion.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Mise à jour:</span>
                      <span className="text-sm">{formatDate(promotion.updated_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Utilisations:</span>
                      <span className="text-sm">{promotion.usage_count}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Percent size={16} className="mr-1" />
                    Réduction
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm">
                        {promotion.discount.type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Valeur:</span>
                      <span className="text-sm font-medium">
                        {promotion.discount.value}
                        {promotion.discount.type === 'percentage' ? '%' : '€'}
                      </span>
                    </div>
                    {promotion.discount.max_discount_amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Maximum:</span>
                        <span className="text-sm">{promotion.discount.max_discount_amount}€</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Application:</span>
                      <span className="text-sm">
                        {promotion.discount.applies_to === 'total' && 'Total de la commande'}
                        {promotion.discount.applies_to === 'products' && 'Produits spécifiques'}
                        {promotion.discount.applies_to === 'shipping' && 'Frais de livraison'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Conditions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {promotion.conditions.promo_code && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Code promo:</span>
                      <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {promotion.conditions.promo_code}
                      </span>
                    </div>
                  )}

                  {promotion.conditions.min_order_amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Montant minimum:</span>
                      <span className="text-sm">{promotion.conditions.min_order_amount}€</span>
                    </div>
                  )}

                  {promotion.conditions.max_order_amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Montant maximum:</span>
                      <span className="text-sm">{promotion.conditions.max_order_amount}€</span>
                    </div>
                  )}

                  {promotion.conditions.start_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date de début:</span>
                      <span className="text-sm">{formatDate(promotion.conditions.start_date)}</span>
                    </div>
                  )}

                  {promotion.conditions.end_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date de fin:</span>
                      <span className="text-sm">{formatDate(promotion.conditions.end_date)}</span>
                    </div>
                  )}

                  {promotion.conditions.days_of_week && promotion.conditions.days_of_week.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Jours:</span>
                      <span className="text-sm">
                        {promotion.conditions.days_of_week.map(day => 
                          ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][day]
                        ).join(', ')}
                      </span>
                    </div>
                  )}

                  {promotion.conditions.hours_of_day && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Heures:</span>
                      <span className="text-sm">
                        {promotion.conditions.hours_of_day.start} - {promotion.conditions.hours_of_day.end}
                      </span>
                    </div>
                  )}

                  {promotion.conditions.max_uses_total && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Utilisations max:</span>
                      <span className="text-sm">{promotion.conditions.max_uses_total}</span>
                    </div>
                  )}

                  {promotion.conditions.max_uses_per_customer && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Max par client:</span>
                      <span className="text-sm">{promotion.conditions.max_uses_per_customer}</span>
                    </div>
                  )}

                  {promotion.conditions.first_order_only && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Première commande:</span>
                      <span className="text-sm">Oui</span>
                    </div>
                  )}

                  {promotion.type === 'buy_x_get_y' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Achetez:</span>
                        <span className="text-sm">{promotion.conditions.buy_quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Obtenez:</span>
                        <span className="text-sm">{promotion.conditions.get_quantity}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {promotion.visuals && Object.keys(promotion.visuals).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Tag size={16} className="mr-1" />
                    Éléments visuels
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promotion.visuals.badge_text && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Badge:</span>
                        <span 
                          className="text-sm px-2 py-1 rounded-full" 
                          style={{ 
                            backgroundColor: promotion.visuals.badge_color || '#F9A826',
                            color: '#ffffff'
                          }}
                        >
                          {promotion.visuals.badge_text}
                        </span>
                      </div>
                    )}

                    {promotion.visuals.banner_text && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Texte bannière:</span>
                        <span className="text-sm">{promotion.visuals.banner_text}</span>
                      </div>
                    )}

                    {promotion.visuals.banner_cta && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Bouton:</span>
                        <span className="text-sm">{promotion.visuals.banner_cta}</span>
                      </div>
                    )}
                  </div>

                  {promotion.visuals.banner_image && (
                    <div className="mt-4">
                      <span className="text-sm text-gray-600 block mb-2">Image de bannière:</span>
                      <img 
                        src={promotion.visuals.banner_image} 
                        alt="Bannière promotionnelle" 
                        className="w-full h-auto max-h-40 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'usages' && (
            <div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                  <span className="ml-2">Chargement...</span>
                </div>
              ) : usages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune utilisation enregistrée pour cette promotion
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Commande</th>
                        <th className="px-4 py-3 text-left">Client</th>
                        <th className="px-4 py-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usages.map((usage) => (
                        <tr key={usage.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{formatDate(usage.applied_at)}</td>
                          <td className="px-4 py-3">
                            <a 
                              href="#" 
                              className="text-brand-primary hover:underline flex items-center"
                              onClick={(e) => {
                                e.preventDefault();
                                // Ici, vous pourriez ouvrir un modal avec les détails de la commande
                              }}
                            >
                              {usage.order_id.substring(0, 8)}...
                              <ExternalLink size={14} className="ml-1" />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {usage.customer_phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {usage.discount_amount.toFixed(2)}€
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionDetailsModal;
