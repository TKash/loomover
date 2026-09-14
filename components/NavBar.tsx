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
      {/* Phones: logo + "Post a lot" on the first row, links wrap to a second row (one row was
          wider than the screen and pushed "Sign out" off-canvas). sm and up: a single row. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2.5 px-4 py-3 sm:px-6 sm:py-3.5">
        <Link href="/feed" className="mr-auto flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-accent" />
          <span className="font-display text-[22px] tracking-[-0.01em]">Loomover</span>
        </Link>
        <nav className="order-3 flex w-full items-center gap-5 overflow-x-auto whitespace-nowrap text-sm text-foreground/80 sm:order-2 sm:w-auto sm:gap-6">
          <Link href="/feed" className="hover:text-foreground">
            Feed
          </Link>
          <Link href="/my/listings" className="hover:text-foreground">
            My listings
          </Link>
          <Link href="/my/claims" className="hover:text-foreground">
            My claims
          </Link>
          <form action={signOut} className="ml-auto sm:ml-0">
            <button type="submit" className="text-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </nav>
        <Link
          href="/lots/new"
          className="order-2 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover sm:order-3"
        >
          Post a lot
        </Link>
      </div>
    </header>
  )
}
