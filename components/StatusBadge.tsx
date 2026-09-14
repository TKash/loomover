import type { LotStatus } from '@/types/database.types'

const STYLES: Record<LotStatus, string> = {
  available: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  reserved: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  sold: 'bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-500/20',
  expired: 'bg-stone-100 text-stone-400 ring-1 ring-inset ring-stone-400/20',
}

export default function StatusBadge({ status }: { status: LotStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  )
}
