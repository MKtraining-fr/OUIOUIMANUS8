import React, { useState } from 'react';
import { Order } from '../types';
import Modal from './Modal';
import { Upload } from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onFinalize: (paymentMethod: Order['payment_method'], receiptFile?: File | null) => Promise<void>;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, order, onFinalize }) => {
  const [paymentMethod, setPaymentMethod] = useState<Order['payment_method']>('efectivo');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) return;
    setIsSubmitting(true);
    await onFinalize(paymentMethod, receiptFile);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Finalizar el pedido #${order.id.slice(-4)}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600">Total a pagar</p>
          <p className="text-4xl font-extrabold text-gray-900">{formatCurrencyCOP(order.total)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Método de pago</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as Order['payment_method'])}
            className="mt-1 ui-select"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>

        {paymentMethod === 'transferencia' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Comprobante (opcional)</label>
            <label htmlFor="payment-receipt" className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50">
              <Upload size={18} />
              <span>{receiptFile ? receiptFile.name : 'Selecciona un archivo...'}</span>
            </label>
            <input id="payment-receipt" type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files ? e.target.files[0] : null)} className="hidden" />
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onClose} className="w-full ui-btn-secondary py-3">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="w-full ui-btn-success py-3 disabled:opacity-60">
            {isSubmitting ? 'Finalizando...' : 'Confirmar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
