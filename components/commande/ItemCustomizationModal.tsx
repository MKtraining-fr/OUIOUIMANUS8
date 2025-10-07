import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import Modal from '../Modal';
import type { Product } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';

export interface ItemCustomizationResult {
    quantity: number;
    comment: string;
}

export interface ItemCustomizationModalProps {
    isOpen: boolean;
    product: Product | null;
    onClose: () => void;
    onSave: (result: ItemCustomizationResult) => void;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
    isOpen,
    product,
    onClose,
    onSave,
}) => {
    const [quantity, setQuantity] = useState(1);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setQuantity(1);
        setComment('');
    }, [isOpen, product?.id]);

    if (!product) {
        return null;
    }

    const handleDecrease = () => {
        setQuantity(prev => Math.max(1, prev - 1));
    };

    const handleIncrease = () => {
        setQuantity(prev => prev + 1);
    };

    const handleSave = () => {
        onSave({
            quantity,
            comment,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.nom_produit}>
            <div className="space-y-4">
                <img
                    src={product.image}
                    alt={product.nom_produit}
                    className="w-full h-48 object-cover rounded-lg"
                />
                {product.description && (
                    <p className="text-gray-200 text-sm">{product.description}</p>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-200">Commentaire</label>
                    <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={2}
                        className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-900/60 py-2 px-3 text-sm text-gray-100 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="Allergies, instructions spécifiques…"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleDecrease}
                            className="p-2 rounded-full bg-gray-800 text-gray-100 hover:bg-gray-700"
                            aria-label="Diminuer la quantité"
                        >
                            <Minus size={18} />
                        </button>
                        <span className="w-8 text-center text-lg font-bold text-gray-100">{quantity}</span>
                        <button
                            type="button"
                            onClick={handleIncrease}
                            className="p-2 rounded-full bg-gray-800 text-gray-100 hover:bg-gray-700"
                            aria-label="Augmenter la quantité"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg bg-brand-primary py-2 px-6 font-semibold text-brand-secondary transition hover:bg-yellow-400"
                    >
                        Ajouter ({formatCurrencyCOP(product.prix_vente * quantity)})
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ItemCustomizationModal;
