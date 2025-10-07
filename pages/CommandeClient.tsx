                        <div className="border-t my-4"></div>
                        
                        {/* Affichage des détails de la réduction si un code promo est appliqué */}
                        {discount > 0 && (
                            <DiscountDetails
                                subtotal={subtotal}
                                discount={discount}
                                total={total}
                                promotion={promoCodePromotion}
                                className="mb-3"
                            />
                        )}
                        
                        {/* Total */}
                        <div className="flex justify-between text-xl font-bold text-gray-700">
                            <span>Total</span>
                            <span>{formatCurrencyCOP(total)}</span>
                        </div>
                        
                        {/* Champ de code promo */}
                        {cart.length > 0 && (
                            <PromoCodeInput
                                onApply={applyPromoCode}
                                onRemove={removePromoCode}
                                appliedCode={promoCode || undefined}
                                disabled={submitting}
                            />
                        )}
