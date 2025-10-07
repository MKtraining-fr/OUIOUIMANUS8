const integerAmountFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

const copCurrencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function ensureFinite(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function formatIntegerAmount(value: number): string {
  return integerAmountFormatter.format(ensureFinite(value));
}

export function formatCurrencyCOP(value: number): string {
  return copCurrencyFormatter.format(ensureFinite(value));
}
