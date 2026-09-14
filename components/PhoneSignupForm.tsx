'use client'

import { useActionState } from 'react'
import { requestOtp } from '@/lib/auth/actions'
import { OTP_CHANNEL } from '@/lib/auth/otp-channel'

// Inline sign-up for the marketing page: sends the OTP straight from the homepage,
// then requestOtp redirects to /verify, the same flow as the /login page.
export default function PhoneSignupForm({ onDark = false }: { onDark?: boolean }) {
  const [state, formAction, pending] = useActionState(requestOtp, null)

  return (
    <div className="w-full max-w-[460px]">
      <form
        action={formAction}
        className={`flex items-center gap-2 rounded-full border p-1.5 pl-5 ${
          onDark ? 'border-[rgba(253,251,247,0.4)] bg-[rgba(253,251,247,0.12)]' : 'border-[rgba(30,27,22,0.15)] bg-white'
        }`}
      >
        <label htmlFor={onDark ? 'phone-footer' : 'phone-hero'} className="sr-only">
          Mobile number
        </label>
        <span
          aria-hidden="true"
          className={`shrink-0 border-r pr-3 text-base ${
            onDark ? 'border-[rgba(253,251,247,0.35)] text-[rgba(253,251,247,0.85)]' : 'border-[rgba(30,27,22,0.15)] text-[#6E6455]'
          }`}
        >
          +91
        </span>
        <input
          id={onDark ? 'phone-footer' : 'phone-hero'}
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          maxLength={16}
          required
          className={`min-w-0 flex-1 bg-transparent text-base outline-none ${
            onDark ? 'text-[#FDFBF7] placeholder:text-[rgba(253,251,247,0.55)]' : 'text-[#1E1B16] placeholder:text-[#A59B8D]'
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-[#1E1B16] px-5 py-3 text-[15px] font-medium text-[#F7F4EE] transition-opacity hover:opacity-80 disabled:opacity-60 sm:px-6"
        >
          {pending ? 'Sending...' : 'Get started →'}
        </button>
      </form>
      <p className={`mt-3 pl-5 text-sm ${onDark ? 'text-[rgba(253,251,247,0.8)]' : 'text-[#6E6455]'}`}>
        {state?.error ? (
          <span className={onDark ? 'text-[#FDFBF7]' : 'text-red-700'}>{state.error}</span>
        ) : (
          OTP_CHANNEL === 'whatsapp'
            ? "We'll send a code to your WhatsApp. No password needed."
            : "We'll text you a code to sign in. No password needed."
        )}
      </p>
    </div>
  )
}
