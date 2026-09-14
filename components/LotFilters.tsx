'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LOT_CATEGORIES } from '@/lib/constants'

const inputClass =
  'rounded-full border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15'

export default function LotFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/feed?${params.toString()}`)
  }

  return (
    <div className="mb-5 flex w-full gap-3">
      <select
        defaultValue={searchParams.get('category') || ''}
        onChange={(e) => updateParam('category', e.target.value)}
        className={`${inputClass} shrink-0`}
      >
        <option value="">All categories</option>
        {LOT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="City"
        defaultValue={searchParams.get('location') || ''}
        onBlur={(e) => updateParam('location', e.target.value)}
        // min-w-0 + flex-1: an input's default ~20ch width otherwise pushes the row past a phone screen.
        className={`${inputClass} w-full min-w-0 flex-1`}
      />
    </div>
  )
}
