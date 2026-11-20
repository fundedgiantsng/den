export function formatNaira(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₦0.00';
  }
  const num = Number(amount);
  const formatted = Math.abs(num).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (num < 0) {
    return `-₦${formatted}`;
  }
  return `₦${formatted}`;
}

export function formatSignedNaira(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₦0.00';
  }
  const num = Number(amount);
  if (num > 0) {
    return `+${formatNaira(num)}`;
  }
  if (num < 0) {
    return `-${formatNaira(Math.abs(num))}`;
  }
  return formatNaira(0);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
