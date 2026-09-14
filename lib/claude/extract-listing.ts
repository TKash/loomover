import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { LOT_UNITS } from '@/lib/constants'

const extractedListingSchema = z.object({
  category: z.string().nullable(),
  spec: z.string().nullable(),
  quantity: z.number().positive().nullable(),
  unit: z.enum(LOT_UNITS).nullable(),
  price_per_unit: z.number().positive().nullable(),
  currency: z.string(),
  location: z.string().nullable(),
  urgency_note: z.string().nullable(),
  notes: z.string().nullable(),
})

export type ExtractedListing = z.infer<typeof extractedListingSchema>

export const REQUIRED_LISTING_FIELDS = ['category', 'quantity', 'unit', 'price_per_unit'] as const

const TOOL_NAME = 'record_listing_fields'

let client: Anthropic | null = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return client
}

const emptyFields: ExtractedListing = {
  category: null,
  spec: null,
  quantity: null,
  unit: null,
  price_per_unit: null,
  currency: 'INR',
  location: null,
  urgency_note: null,
  notes: null,
}

// Extracts structured listing fields from one WhatsApp message. Only reports
// fields explicitly present in `newMessage` -- merging with prior state is done
// deterministically in code below, not left to the model, so a correction like
// "actually 1800m not 2000" reliably overrides just that one field.
export async function extractListingFields({
  newMessage,
  existingFields,
}: {
  newMessage: string
  existingFields?: Partial<ExtractedListing>
}): Promise<ExtractedListing> {
  const system =
    'You extract structured textile/fabric surplus listing data from a WhatsApp message ' +
    'sent by a seller (mill owner or broker). Call the record_listing_fields tool with ONLY ' +
    'the fields explicitly mentioned or corrected in this specific message -- omit any field ' +
    'not mentioned. Quantities and prices must be plain numbers with no currency symbols or ' +
    'unit text mixed in.'

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: newMessage }],
    tools: [
      {
        name: TOOL_NAME,
        description: 'Record structured fields extracted from a surplus textile listing message.',
        input_schema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Material category, e.g. cotton, polyester, denim, yarn',
            },
            spec: { type: 'string', description: 'Spec such as GSM, count, or weave' },
            quantity: { type: 'number' },
            unit: { type: 'string', enum: [...LOT_UNITS] },
            price_per_unit: { type: 'number', description: 'Price per single unit' },
            currency: { type: 'string' },
            location: { type: 'string', description: 'City or region' },
            urgency_note: { type: 'string', description: 'e.g. "need to clear by Friday"' },
            notes: { type: 'string' },
          },
          required: [],
        },
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  })

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  )
  if (!toolUse) throw new Error('Claude did not return structured listing fields.')

  const raw = toolUse.input as Partial<Record<keyof ExtractedListing, unknown>>
  const base = { ...emptyFields, ...existingFields }

  const merged: ExtractedListing = {
    category: (raw.category as string | undefined) ?? base.category,
    spec: (raw.spec as string | undefined) ?? base.spec,
    quantity: (raw.quantity as number | undefined) ?? base.quantity,
    unit: (raw.unit as ExtractedListing['unit']) ?? base.unit,
    price_per_unit: (raw.price_per_unit as number | undefined) ?? base.price_per_unit,
    currency: (raw.currency as string | undefined) ?? base.currency,
    location: (raw.location as string | undefined) ?? base.location,
    urgency_note: (raw.urgency_note as string | undefined) ?? base.urgency_note,
    notes: (raw.notes as string | undefined) ?? base.notes,
  }

  return extractedListingSchema.parse(merged)
}

export function computeMissingFields(fields: Partial<ExtractedListing>): string[] {
  return REQUIRED_LISTING_FIELDS.filter((f) => fields[f] === null || fields[f] === undefined)
}
