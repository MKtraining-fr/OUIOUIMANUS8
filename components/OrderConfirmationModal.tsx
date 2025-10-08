import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Order } from '../types';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  order: Order | null;
  whatsappNumber?: string;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  order,
  whatsappNumber = '573238090562' // Default number
}) => {
  const navigate = useNavigate();

  // Removed automatic redirect - user will click WhatsApp button to proceed

  if (!isOpen || !order) return null;

  const generateWhatsAppMessage = (): string => {
    const itemsText = order.items
      .filter(item => !item.nom_produit?.toLowerCase().includes('domicilio'))
      .map(item => `- ${item.quantite}x ${item.nom_produit} (${formatCurrencyCOP(item.prix_unitaire)})`)
      .join('\n');
    
    const totalText = `Total: ${formatCurrencyCOP(order.total)}`;
    const clientText = `Cliente: ${order.clientInfo?.nom} (${order.clientInfo?.telephone})\nDirección: ${order.clientInfo?.adresse}`;
    const paymentText = `Método de pago: ${order.payment_method === 'transferencia' ? 'Transferencia' : 'Efectivo'}`;
    const receiptText = order.receipt_url ? `Comprobante: ${order.receipt_url}` : '';
    const orderIdText = `Pedido #${order.id.slice(-6)}`;

    return encodeURIComponent(
      `¡Hola! Aquí está mi pedido:\n\n${orderIdText}\n\n${itemsText}\n\n${totalText}\n\n${clientText}\n${paymentText}\n${receiptText}`
    );
  };

  const handleWhatsAppClick = () => {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    // Redirect to tracking page immediately after opening WhatsApp
    navigate(`/suivi-commande/${order.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex flex-col items-center">
            <CheckCircle size={64} className="mb-3" />
            <h2 className="text-2xl font-bold text-center">¡Pedido Confirmado!</h2>
            <p className="text-green-100 mt-2">Pedido #{order.id.slice(-6)}</p>
          </div>
        </div>

        <div className="p-6 text-center">
          <p className="text-gray-700 mb-6">
            Total: <span className="font-bold text-2xl text-green-600">{formatCurrencyCOP(order.total)}</span>
          </p>

          <button
            onClick={handleWhatsAppClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar por WhatsApp
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Haz clic para enviar tu pedido por WhatsApp y ver el seguimiento
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
