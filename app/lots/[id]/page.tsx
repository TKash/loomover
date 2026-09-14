import { requireProfile } from '@/lib/auth/guards'
import { getLotById } from '@/lib/lots/queries'
import { formatPrice } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import ClaimButton from '@/components/ClaimButton'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireProfile()

  const lot = await getLotById(supabase, id)
  const isOwnLot = lot.seller_id === user.id
  const sellerName = lot.profiles?.full_name || lot.profiles?.company_name || 'Unknown seller'

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative h-64 w-full bg-background">
          {lot.photo_urls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lot.photo_urls[0]} alt={lot.category} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted-light"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          <div className="absolute right-3 top-3">
            <StatusBadge status={lot.status} />
          </div>
        </div>

        {lot.photo_urls.length > 1 && (
          <div className="flex gap-2 border-b border-border px-4 py-2">
            {lot.photo_urls.slice(1).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={lot.category} className="h-14 w-14 rounded-lg object-cover" />
            ))}
          </div>
        )}

        <div className="px-5 py-5">
          <p className="text-2xl font-semibold">
            {formatPrice(lot.price_per_unit, lot.currency, lot.unit)}
          </p>
          <p className="mt-1 text-base font-medium capitalize">
            {lot.category}
            {lot.spec && <span className="text-muted"> · {lot.spec}</span>}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {lot.quantity} {lot.unit}
            {lot.location && ` · ${lot.location}`}
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-lg bg-background px-3.5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
              {initials(sellerName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{sellerName}</p>
              <p className="text-xs text-muted">Seller</p>
            </div>
          </div>

          {(lot.urgency_note || lot.notes) && (
            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
              {lot.urgency_note && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Urgency</dt>
                  <dd className="text-right">{lot.urgency_note}</dd>
                </div>
              )}
              {lot.notes && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Notes</dt>
                  <dd className="text-right">{lot.notes}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-5">
            {isOwnLot ? (
              <p className="text-sm text-muted">This is your listing.</p>
            ) : lot.status === 'available' ? (
              <ClaimButton lotId={lot.id} />
            ) : (
              <p className="text-sm text-muted">This lot is no longer available.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
