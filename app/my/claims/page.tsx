import Link from 'next/link'
import { requireProfile } from '@/lib/auth/guards'
import { getMyClaims } from '@/lib/lots/queries'
import type { Lot } from '@/lib/lots/types'

export default async function MyClaimsPage() {
  const { supabase, user } = await requireProfile()

  const claims = await getMyClaims(supabase, user.id)

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-6">
      <h1 className="mb-4 text-xl font-semibold">My claims</h1>
      {claims.length === 0 ? (
        <p className="text-sm text-muted">
          You haven&apos;t claimed any lots yet.{' '}
          <Link href="/feed" className="text-accent underline">
            Browse the feed
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {claims.map((claim) => {
            const lot = claim.lots as unknown as Lot
            return (
              <li key={claim.id}>
                <Link
                  href={`/lots/${lot.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-muted-light"
                >
                  <div>
                    <p className="font-medium capitalize">{lot.category}</p>
                    <p className="text-sm text-muted">
                      {lot.quantity} {lot.unit}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs capitalize text-stone-600">
                    {claim.status}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
