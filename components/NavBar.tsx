import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/auth/actions'

export default async function NavBar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-accent" />
          <span className="font-display text-[22px] tracking-[-0.01em]">Loomover</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-foreground/80">
          <Link href="/feed" className="hover:text-foreground">
            Feed
          </Link>
          <Link href="/my/listings" className="hover:text-foreground">
            My listings
          </Link>
          <Link href="/my/claims" className="hover:text-foreground">
            My claims
          </Link>
          <Link
            href="/lots/new"
            className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground transition hover:bg-accent-hover"
          >
            Post a lot
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
