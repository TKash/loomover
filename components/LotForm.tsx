'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOT_CATEGORIES, LOT_UNITS } from '@/lib/constants'
import PhotoUploader from './PhotoUploader'

const inputClass =
  'rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15'

export default function LotForm() {
  const router = useRouter()
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const form = new FormData(e.currentTarget)
    const body = {
      category: form.get('category'),
      spec: form.get('spec') || null,
      quantity: form.get('quantity'),
      unit: form.get('unit'),
      price_per_unit: form.get('price_per_unit'),
      currency: 'INR',
      location: form.get('location') || null,
      notes: form.get('notes') || null,
      urgency_note: form.get('urgency_note') || null,
      photo_urls: photoUrls,
    }

    const res = await fetch('/api/lots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json()
      setError(typeof data.error === 'string' ? data.error : 'Could not post this lot.')
      return
    }

    const { lot } = await res.json()
    router.push(`/lots/${lot.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Photos</h2>
        <PhotoUploader onChange={setPhotoUrls} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Material details</h2>
        <select name="category" required className={inputClass}>
          <option value="">Category</option>
          {LOT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input name="spec" placeholder="Spec, e.g. 120 GSM" className={inputClass} />
        <div className="flex gap-3">
          <input
            name="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="Quantity"
            required
            className={`w-1/2 ${inputClass}`}
          />
          <select name="unit" required className={`w-1/2 ${inputClass}`}>
            <option value="">Unit</option>
            {LOT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
          Pricing and location
        </h2>
        <input
          name="price_per_unit"
          type="number"
          step="any"
          min="0"
          placeholder="Price per unit (₹)"
          required
          className={inputClass}
        />
        <input name="location" placeholder="Location / city" className={inputClass} />
        <input
          name="urgency_note"
          placeholder="Urgency, e.g. need to clear by Friday"
          className={inputClass}
        />
        <textarea name="notes" placeholder="Notes" className={inputClass} rows={3} />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-accent px-4 py-3 font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? 'Posting...' : 'Post lot'}
      </button>
    </form>
  )
}
