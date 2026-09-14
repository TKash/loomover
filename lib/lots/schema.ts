import { z } from 'zod'
import { LOT_UNITS } from '@/lib/constants'

export const createLotSchema = z.object({
  category: z.string().min(1),
  spec: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unit: z.enum(LOT_UNITS),
  price_per_unit: z.coerce.number().positive(),
  currency: z.string().default('INR'),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  urgency_note: z.string().optional().nullable(),
  photo_urls: z.array(z.string().url()).optional().default([]),
})

export type CreateLotInput = z.infer<typeof createLotSchema>
