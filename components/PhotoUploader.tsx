'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MAX_LOT_PHOTOS } from '@/lib/constants'

export default function PhotoUploader({
  onChange,
}: {
  onChange: (urls: string[]) => void
}) {
  const [urls, setUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)

    const supabase = createClient()
    const remainingSlots = MAX_LOT_PHOTOS - urls.length
    const toUpload = Array.from(files).slice(0, remainingSlots)

    try {
      const newUrls: string[] = []
      for (const file of toUpload) {
        const path = `${crypto.randomUUID()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('lot-photos')
          .upload(path, file)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('lot-photos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      const updated = [...urls, ...newUrls]
      setUrls(updated)
      onChange(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const emptySlots = Math.max(0, MAX_LOT_PHOTOS - urls.length)

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt="Lot photo"
            className="h-20 w-20 rounded-lg border border-border object-cover"
          />
        ))}
        {emptySlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-[11px]">{uploading ? 'Uploading' : 'Add photo'}</span>
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
