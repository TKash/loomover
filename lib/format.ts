export function formatPrice(pricePerUnit: number, currency: string, unit: string): string {
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(pricePerUnit)
  return `${amount}/${unit}`
}

export function waLink(phoneE164: string, message?: string): string {
  const digits = phoneE164.replace(/[^\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}
