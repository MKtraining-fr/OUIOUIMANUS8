import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Product, Category } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';

export interface ProductGridProps {
    filteredProducts: Product[];
    quantities: Record<string, number>;
    onAdd: (product: Product) => void;
    activeCategoryId: string;
    categories: Category[];
    onSelectCategory: (categoryId: string) => void;
    isProductAvailable: (product: Product) => boolean;
    handleProductPointerDown: (
        product: Product,
    ) => (event: React.PointerEvent<HTMLButtonElement>) => void;
    handleProductKeyDown: (
        product: Product,
    ) => (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const ProductGridComponent: React.FC<ProductGridProps> = ({
    filteredProducts,
    quantities,
    onAdd,
    activeCategoryId,
    categories,
    onSelectCategory,
    isProductAvailable,
    handleProductPointerDown,
    handleProductKeyDown,
}) => {
    return (
        <>
            <div className="p-4 border-b">
                <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => onSelectCategory('all')}
                        className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap ${
                            activeCategoryId === 'all'
                                ? 'bg-brand-primary text-brand-secondary'
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Tous
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap ${
                                activeCategoryId === cat.id
                                    ? 'bg-brand-primary text-brand-secondary'
                                    : 'bg-gray-200 text-gray-700'
                            }`}
                        >
                            {cat.nom}
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 overflow-y-auto">
                {filteredProducts.map((product) => {
                    const isLowStock = !isProductAvailable(product);
                    const quantityInCart = quantities[product.id] || 0;
                    const handleProductClick = () => onAdd(product);
                    const handlePointerDown = handleProductPointerDown(product);
                    const handleKeyDown = handleProductKeyDown(product);

                    return (
                        <button
                            key={product.id}
                            type="button"
                            onClick={handleProductClick}
                            onPointerDown={handlePointerDown}
                            onKeyDown={handleKeyDown}
                            className={`border rounded-lg p-2 flex flex-col items-center justify-between text-center cursor-pointer hover:shadow-lg transition-all relative focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                isLowStock ? 'border-yellow-500 border-2' : ''
                            }`}
                        >
                            {quantityInCart > 0 && (
                                <div className="absolute top-1 left-1 bg-brand-accent text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                                    {quantityInCart}
                                </div>
                            )}
                            {isLowStock && (
                                <div
                                    className="absolute top-1 right-1 bg-yellow-500 text-white rounded-full p-1"
                                    title="Stock bas"
                                >
                                    <AlertTriangle size={16} />
                                </div>
                            )}
                            <img
                                src={product.image}
                                alt={product.nom_produit}
                                className="w-24 h-24 object-cover rounded-md mb-2"
                            />
                            <p className="font-semibold text-sm text-gray-800">{product.nom_produit}</p>
                            <p className="text-xs text-gray-600 px-1 h-10 overflow-hidden flex-grow">
                                {product.description}
                            </p>
                            <p className="font-bold text-brand-primary mt-1">
                                {formatCurrencyCOP(product.prix_vente)}
                            </p>
                        </button>
                    );
                })}
            </div>
        </>
    );
};

export default memo(ProductGridComponent);
