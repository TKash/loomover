import Link from 'next/link'
import { requireProfile } from '@/lib/auth/guards'
import { getMyListings } from '@/lib/lots/queries'
import { formatPrice } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'

export default async function MyListingsPage() {
  const { supabase, user } = await requireProfile()

  const lots = await getMyListings(supabase, user.id)

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-6">
      <h1 className="mb-4 text-xl font-semibold">My listings</h1>
      {lots.length === 0 ? (
        <p className="text-sm text-muted">
          You haven&apos;t posted any lots yet.{' '}
          <Link href="/lots/new" className="text-accent underline">
            Post one
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lots.map((lot) => (
            <li key={lot.id}>
              <Link
                href={`/lots/${lot.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-muted-light"
              >
                <div>
                  <p className="font-medium capitalize">{lot.category}</p>
                  <p className="text-sm text-muted">
                    {lot.quantity} {lot.unit} · {formatPrice(lot.price_per_unit, lot.currency, lot.unit)}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
