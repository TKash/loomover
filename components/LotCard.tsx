import Link from 'next/link'
import type { LotWithSeller } from '@/lib/lots/types'
import { formatPrice } from '@/lib/format'
import StatusBadge from './StatusBadge'

export default function LotCard({ lot }: { lot: LotWithSeller }) {
  return (
    <Link
      href={`/lots/${lot.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-muted-light hover:shadow-sm"
    >
      <div className="relative h-40 w-full bg-background">
        {lot.photo_urls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lot.photo_urls[0]}
            alt={lot.category}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              width="28"
              height="28"
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
        <div className="absolute right-2 top-2">
          <StatusBadge status={lot.status} />
        </div>
      </div>
      <div className="flex flex-col gap-1 px-3.5 py-3">
        <p className="text-lg font-semibold leading-tight">
          {formatPrice(lot.price_per_unit, lot.currency, lot.unit)}
        </p>
        <p className="text-sm font-medium capitalize">
          {lot.category}
          {lot.spec && <span className="text-muted"> · {lot.spec}</span>}
        </p>
        <p className="text-xs text-muted">
          {lot.quantity} {lot.unit}
          {lot.location && ` · ${lot.location}`}
        </p>
      </div>
    </Link>
  )
}
