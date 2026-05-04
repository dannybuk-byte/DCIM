// Shared formatting utilities

export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  const trim = (n: number, digits: number) => {
    return Number(n.toFixed(digits)).toString();
  };

  if (abs >= 1_000_000_000) return `${sign}$${trim(abs / 1_000_000_000, 2)}B`;
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000, 1)}K`;

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

