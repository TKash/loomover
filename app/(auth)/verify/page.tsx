'use client'

import { Suspense, useActionState, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { verifyOtp } from '@/lib/auth/actions'
import { OTP_CHANNEL } from '@/lib/auth/otp-channel'

const CODE_LENGTH = 6

function VerifyForm() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [state, formAction, pending] = useActionState(verifyOtp, null)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  function updateDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    e.preventDefault()
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] || ''))
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Enter your code</h1>
      <p className="mb-6 text-sm text-muted">
        We sent a 6-digit code {OTP_CHANNEL === 'whatsapp' ? 'on WhatsApp ' : ''}to{' '}
        <strong className="text-foreground">{phone}</strong>.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="token" value={digits.join('')} />
        <div className="flex justify-between gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => updateDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="h-12 w-11 rounded-lg border border-border bg-surface text-center text-lg font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          ))}
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending || digits.some((d) => !d)}
          className="rounded-full bg-accent px-3.5 py-2.5 font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </>
  )
}

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-7 shadow-sm">
        <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
          <VerifyForm />
        </Suspense>
      </div>
    </main>
  )
}
