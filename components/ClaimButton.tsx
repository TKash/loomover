'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClaimButton({ lotId }: { lotId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(false)

  async function handleClaim() {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/lots/${lotId}/claim`, { method: 'POST' })
    setPending(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Could not claim this lot.')
      router.refresh()
      return
    }

    setClaimed(true)
    router.refresh()
  }

  if (claimed) {
    return (
      <p className="rounded-lg border border-green-600/20 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
        Claimed. The seller has been notified on WhatsApp.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClaim}
        disabled={pending}
        className="w-full rounded-full bg-accent px-4 py-3 font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? 'Claiming...' : "I'm interested"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
