import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) redirect('/feed')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Tell us about you</h1>
        <p className="mb-6 text-sm text-muted">
          This helps buyers and sellers know who they&apos;re dealing with.
        </p>
        <OnboardingForm />
      </div>
    </main>
  )
}
