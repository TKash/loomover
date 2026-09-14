'use client'

import { useActionState } from 'react'
import { requestOtp } from '@/lib/auth/actions'
import { OTP_CHANNEL } from '@/lib/auth/otp-channel'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestOtp, null)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="mb-2 flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-accent" />
          <span className="font-display text-[26px] font-normal tracking-[-0.01em]">Loomover</span>
        </h1>
        <p className="mb-6 text-sm text-muted">
          Enter your phone number to sign in.{' '}
          {OTP_CHANNEL === 'whatsapp'
            ? "We'll send a one-time code to your WhatsApp."
            : "We'll text you a one-time code."}
        </p>

        <form action={formAction} className="flex flex-col gap-3">
          <input
            type="tel"
            name="phone"
            placeholder="+919876543210"
            required
            className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-3.5 py-2.5 font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? 'Sending...' : 'Send code'}
          </button>
        </form>
      </div>
    </main>
  )
}
