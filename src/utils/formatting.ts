// Shared formatting utilities

export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  const formatCompact = (value: number, decimals: number): string => {
    // Strip trailing zeros for cleaner display (e.g. 1.00 -> 1, 1.0 -> 1)
    return value
      .toFixed(decimals)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*[1-9])0+$/, '$1');
  };

  if (abs >= 1_000_000_000) return `${sign}$${formatCompact(abs / 1_000_000_000, 2)}B`;
  if (abs >= 1_000_000) return `${sign}$${formatCompact(abs / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${sign}$${formatCompact(abs / 1_000, 1)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}

