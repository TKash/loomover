import Link from 'next/link'
import { requireProfile } from '@/lib/auth/guards'
import { getFeed } from '@/lib/lots/queries'
import LotCard from '@/components/LotCard'
import LotFilters from '@/components/LotFilters'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; location?: string }>
}) {
  const { supabase } = await requireProfile()

  const { category, location } = await searchParams
  const lots = await getFeed(supabase, { category, location })

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
      <h1 className="mb-4 text-xl font-semibold">Available lots</h1>
      <LotFilters />
      {lots.length === 0 ? (
        <p className="text-sm text-muted">
          No lots match yet. Check back soon, or{' '}
          <Link href="/lots/new" className="text-accent underline">
            post one
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {lots.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </main>
  )
}
