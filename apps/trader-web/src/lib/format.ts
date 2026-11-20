export function formatNaira(amount: number | null | undefined): string {
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

export function formatSignedNaira(amount: number | null | undefined): string {
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
