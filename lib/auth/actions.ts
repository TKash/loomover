'use server'

import { redirect } from 'next/navigation'
import { OTP_CHANNEL } from './otp-channel'
import { normalizePhone } from './phone'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database.types'

export async function requestOtp(_prevState: unknown, formData: FormData) {
  const phone = normalizePhone(String(formData.get('phone') || ''))
  if (!phone) return { error: 'Enter a valid 10-digit mobile number.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: OTP_CHANNEL } })
  if (error) {
    // Network failures reaching Supabase surface as a bare "fetch failed" -- not
    // something to show a visitor on the marketing page.
    if (error.name === 'AuthRetryableFetchError' || error.message === 'fetch failed') {
      return { error: "We couldn't send a code right now. Please try again in a minute." }
    }
    return { error: error.message }
  }

  redirect(`/verify?phone=${encodeURIComponent(phone)}`)
}

export async function verifyOtp(_prevState: unknown, formData: FormData) {
  const phone = String(formData.get('phone') || '').trim()
  const token = String(formData.get('token') || '').trim()
  if (!phone || !token) return { error: 'Enter the code sent to your phone.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user!.id)
    .maybeSingle()

  redirect(profile ? '/feed' : '/onboarding')
}

export async function completeOnboarding(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const full_name = String(formData.get('full_name') || '').trim()
  const company_name = String(formData.get('company_name') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const whatsapp_number = String(formData.get('whatsapp_number') || '').trim()
  const role = String(formData.get('role') || 'both') as UserRole

  if (!full_name) return { error: 'Name is required.' }

  const { error } = await supabase.from('profiles').insert({
    id: user!.id,
    full_name,
    company_name: company_name || null,
    city: city || null,
    whatsapp_number: whatsapp_number || null,
    role,
  })

  if (error) return { error: error.message }

  redirect('/feed')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
