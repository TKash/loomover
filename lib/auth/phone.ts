// Kept out of lib/auth/actions.ts on purpose: every export from a 'use server' file becomes a
// server action (which must be async), so shared sync helpers can't live there.

// Accepts how people actually type an Indian mobile number -- "98765 43210", "09876543210",
// "919876543210", "+91 98765-43210" -- and returns E.164 (+919876543210). A number that already
// starts with + is kept as-is if it's a plausible international length. Anything else is null.
export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) {
    return /^\+\d{10,15}$/.test(cleaned) ? cleaned : null
  }
  if (/^0?[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned.slice(-10)}`
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`
  return null
}
