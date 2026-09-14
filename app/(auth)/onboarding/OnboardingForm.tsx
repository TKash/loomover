'use client'

import { useActionState } from 'react'
import { completeOnboarding } from '@/lib/auth/actions'

const inputClass =
  'rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15'

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(completeOnboarding, null)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="full_name" placeholder="Full name" required className={inputClass} />
      <input name="company_name" placeholder="Company (optional)" className={inputClass} />
      <input name="city" placeholder="City" className={inputClass} />
      <input
        name="whatsapp_number"
        placeholder="WhatsApp number, e.g. +919876543210"
        className={inputClass}
      />
      <select name="role" defaultValue="both" className={inputClass}>
        <option value="both">I buy and sell</option>
        <option value="seller">I mostly sell</option>
        <option value="buyer">I mostly buy</option>
      </select>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-3.5 py-2.5 font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? 'Saving...' : 'Continue'}
      </button>
    </form>
  )
}
