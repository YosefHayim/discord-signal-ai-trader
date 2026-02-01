export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

export function formatPriceShort(price: number | undefined): string {
  if (price === undefined) return 'N/A';
  return `$${price}`;
}

export function formatPercentage(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatQuantity(qty: number, decimals: number = 4): string {
  return qty.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
  });
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}

export function formatLeverage(leverage: number): string {
  return `${leverage}x`;
}
