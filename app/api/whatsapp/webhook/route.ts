import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  extractListingFields,
  computeMissingFields,
  type ExtractedListing,
} from '@/lib/claude/extract-listing'
import { parseInboundMessage } from '@/lib/whatsapp/parse-inbound'
import { validateTwilioSignature, downloadTwilioMedia } from '@/lib/whatsapp/twilio'
import { MAX_LOT_PHOTOS } from '@/lib/constants'
import type { Database } from '@/types/database.types'

type Draft = Database['public']['Tables']['pending_listing_drafts']['Row']
type AdminClient = ReturnType<typeof createAdminClient>

const FIELD_PROMPTS: Record<string, string> = {
  category: 'the material (e.g. cotton, polyester, denim, yarn)',
  quantity: 'the quantity available',
  unit: 'the unit -- meters, kg, pieces, yards, or rolls',
  price_per_unit: 'the price per unit',
}

const YES_PATTERN = /^(yes|y|confirm|correct|ok|okay)\b/i
const CANCEL_PATTERN = /^(cancel|stop|no listing)\b/i

function reply(message: string) {
  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(message)
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function summarize(fields: ExtractedListing) {
  const bits = [
    fields.category,
    fields.spec,
    fields.quantity && fields.unit ? `${fields.quantity} ${fields.unit}` : null,
    fields.price_per_unit ? `Rs ${fields.price_per_unit}/${fields.unit ?? 'unit'}` : null,
    fields.location,
    fields.urgency_note,
  ].filter(Boolean)
  return bits.join(', ')
}

function askForMissing(missing: string[], fields: ExtractedListing) {
  const known = summarize(fields)
  const prefix = known ? `Got it -- ${known}. ` : ''
  const asks = missing.map((f) => FIELD_PROMPTS[f]).join(' and ')
  return `${prefix}Just need ${asks}.`
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const params = new URLSearchParams(rawBody)
  const signature = request.headers.get('x-twilio-signature') || ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`

  if (!validateTwilioSignature(signature, url, Object.fromEntries(params))) {
    return new NextResponse('Invalid signature', { status: 403 })
  }

  const inbound = parseInboundMessage(params)
  if (!inbound.from) {
    return new NextResponse('Missing sender', { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: draft } = await supabase
    .from('pending_listing_drafts')
    .select('*')
    .eq('whatsapp_number', inbound.from)
    .in('status', ['collecting', 'awaiting_confirmation'])
    .maybeSingle()

  // Photos can arrive attached to any message regardless of conversation stage.
  let photoUrls: string[] = draft?.photo_urls ?? []
  if (inbound.mediaUrls.length > 0 && draft) {
    photoUrls = await storeMedia(supabase, draft.id, photoUrls, inbound.mediaUrls)
    await supabase.from('pending_listing_drafts').update({ photo_urls: photoUrls }).eq('id', draft.id)
  }

  // Photo-only message on an existing draft: acknowledge, resend current status.
  if (!inbound.body && draft) {
    const parsedFields = draft.parsed_fields as unknown as ExtractedListing
    const missing = computeMissingFields(parsedFields)
    const msg =
      draft.status === 'awaiting_confirmation'
        ? `Photo added. ${draft.last_bot_message}`
        : `Photo added. ${askForMissing(missing, parsedFields)}`
    return reply(msg)
  }

  if (!inbound.body) {
    return reply(
      'Hi! Send your surplus lot details, e.g. "2000m cotton 120gsm surat range, 90 rs, ' +
        'need to clear by Friday", and I\'ll set up the listing.'
    )
  }

  try {
    if (!draft) {
      return await startNewDraft(supabase, inbound.from, inbound.body)
    }

    const existingFields = draft.parsed_fields as unknown as ExtractedListing

    if (draft.status === 'awaiting_confirmation') {
      return await handleAwaitingConfirmation(supabase, draft, existingFields, photoUrls, inbound.body)
    }

    return await continueCollecting(supabase, draft, existingFields, inbound.body)
  } catch (err) {
    console.error('WhatsApp webhook processing failed', err)
    return reply("Sorry, something went wrong processing that. Please try again in a bit.")
  }
}

async function startNewDraft(supabase: AdminClient, whatsappNumber: string, body: string) {
  const extracted = await extractListingFields({ newMessage: body })
  const missing = computeMissingFields(extracted)

  if (missing.length === 0) {
    const summaryMsg = `Got it -- ${summarize(extracted)}. Reply YES to post this listing, or send a correction.`
    await supabase.from('pending_listing_drafts').insert({
      whatsapp_number: whatsappNumber,
      raw_messages: [body],
      parsed_fields: extracted,
      missing_fields: [],
      status: 'awaiting_confirmation',
      last_bot_message: summaryMsg,
    })
    return reply(summaryMsg)
  }

  const askMsg = askForMissing(missing, extracted)
  await supabase.from('pending_listing_drafts').insert({
    whatsapp_number: whatsappNumber,
    raw_messages: [body],
    parsed_fields: extracted,
    missing_fields: missing,
    status: 'collecting',
    last_bot_message: askMsg,
  })
  return reply(askMsg)
}

async function continueCollecting(
  supabase: AdminClient,
  draft: Draft,
  existingFields: ExtractedListing,
  body: string
) {
  const extracted = await extractListingFields({ newMessage: body, existingFields })
  const missing = computeMissingFields(extracted)
  const rawMessages = [...(draft.raw_messages as string[]), body]

  if (missing.length === 0) {
    const summaryMsg = `Got it -- ${summarize(extracted)}. Reply YES to post this listing, or send a correction.`
    await supabase
      .from('pending_listing_drafts')
      .update({
        parsed_fields: extracted,
        missing_fields: [],
        status: 'awaiting_confirmation',
        raw_messages: rawMessages,
        last_bot_message: summaryMsg,
      })
      .eq('id', draft.id)
    return reply(summaryMsg)
  }

  const askMsg = askForMissing(missing, extracted)
  await supabase
    .from('pending_listing_drafts')
    .update({
      parsed_fields: extracted,
      missing_fields: missing,
      raw_messages: rawMessages,
      last_bot_message: askMsg,
    })
    .eq('id', draft.id)
  return reply(askMsg)
}

async function handleAwaitingConfirmation(
  supabase: AdminClient,
  draft: Draft,
  existingFields: ExtractedListing,
  photoUrls: string[],
  body: string
) {
  if (CANCEL_PATTERN.test(body)) {
    await supabase.from('pending_listing_drafts').update({ status: 'abandoned' }).eq('id', draft.id)
    return reply('No problem, cancelled that listing.')
  }

  if (YES_PATTERN.test(body)) {
    const lot = await publishDraft(supabase, draft, existingFields, photoUrls)
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/lots/${lot.id}`
    return reply(`Posted! Buyers can now see it here: ${link}`)
  }

  // Anything else is treated as a correction.
  const corrected = await extractListingFields({ newMessage: body, existingFields })
  const missing = computeMissingFields(corrected)
  const rawMessages = [...(draft.raw_messages as string[]), body]

  if (missing.length > 0) {
    const askMsg = askForMissing(missing, corrected)
    await supabase
      .from('pending_listing_drafts')
      .update({
        parsed_fields: corrected,
        missing_fields: missing,
        status: 'collecting',
        raw_messages: rawMessages,
        last_bot_message: askMsg,
      })
      .eq('id', draft.id)
    return reply(askMsg)
  }

  const confirmMsg = `Updated -- ${summarize(corrected)}. Reply YES to post, or send another correction.`
  await supabase
    .from('pending_listing_drafts')
    .update({
      parsed_fields: corrected,
      missing_fields: [],
      raw_messages: rawMessages,
      last_bot_message: confirmMsg,
    })
    .eq('id', draft.id)
  return reply(confirmMsg)
}

async function storeMedia(
  supabase: AdminClient,
  draftId: string,
  existingUrls: string[],
  mediaUrls: { url: string; contentType: string }[]
): Promise<string[]> {
  let urls = existingUrls
  const slots = MAX_LOT_PHOTOS - urls.length

  for (const media of mediaUrls.slice(0, slots)) {
    try {
      const { buffer, contentType } = await downloadTwilioMedia(media.url)
      const ext = contentType.split('/')[1] || 'jpg'
      const path = `whatsapp/${draftId}-${urls.length + 1}.${ext}`
      await supabase.storage.from('lot-photos').upload(path, buffer, { contentType, upsert: true })
      const { data } = supabase.storage.from('lot-photos').getPublicUrl(path)
      urls = [...urls, data.publicUrl]
    } catch (err) {
      console.error('Failed to store WhatsApp media', err)
    }
  }

  return urls
}

async function publishDraft(
  supabase: AdminClient,
  draft: Draft,
  fields: ExtractedListing,
  photoUrls: string[]
) {
  let profileId: string

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', draft.whatsapp_number)
    .maybeSingle()

  if (existingProfile) {
    profileId = existingProfile.id
  } else {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      phone: draft.whatsapp_number,
      phone_confirm: true,
    })
    if (authError || !authUser.user) {
      throw authError ?? new Error('Failed to provision seller identity.')
    }

    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        whatsapp_number: draft.whatsapp_number,
        role: 'seller',
      })
      .select('id')
      .single()
    if (profileError) throw profileError
    profileId = newProfile.id
  }

  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .insert({
      seller_id: profileId,
      category: fields.category!,
      spec: fields.spec,
      quantity: fields.quantity!,
      unit: fields.unit!,
      price_per_unit: fields.price_per_unit!,
      currency: fields.currency,
      location: fields.location,
      notes: fields.notes,
      urgency_note: fields.urgency_note,
      photo_urls: photoUrls,
      source: 'whatsapp',
    })
    .select()
    .single()

  if (lotError) throw lotError

  await supabase.from('pending_listing_drafts').update({ status: 'confirmed' }).eq('id', draft.id)

  return lot
}
