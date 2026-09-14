import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { LotInsert, LotWithSeller } from './types'
import { CLAIM_WINDOW_HOURS } from '@/lib/constants'

type Client = SupabaseClient<Database>

export async function getFeed(
  supabase: Client,
  filters: { category?: string; location?: string } = {}
) {
  let query = supabase
    .from('lots')
    .select('*, profiles(full_name, company_name, whatsapp_number)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.location) query = query.ilike('location', `%${filters.location}%`)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as LotWithSeller[]
}

export async function getLotById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from('lots')
    .select('*, profiles(full_name, company_name, whatsapp_number)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as LotWithSeller
}

export async function createLot(supabase: Client, lot: LotInsert) {
  const { data, error } = await supabase.from('lots').insert(lot).select().single()
  if (error) throw error
  return data
}

export async function getMyListings(supabase: Client, sellerId: string) {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMyClaims(supabase: Client, buyerId: string) {
  const { data, error } = await supabase
    .from('claims')
    .select('*, lots(*)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export class LotAlreadyClaimedError extends Error {
  constructor() {
    super('This lot was just claimed by someone else.')
    this.name = 'LotAlreadyClaimedError'
  }
}

// Claims a lot for a buyer and flips it to 'reserved'. Relies on two DB-level
// guards to stay correct under concurrent requests: the partial unique index
// `one_active_claim_per_lot` (rejects a second pending claim on the same lot)
// and the `.eq('status', 'available')` filter on the lots update (a no-op
// update means someone else's claim already won the race).
//
// The lots UPDATE must run through the admin (service-role) client: RLS's
// `lots_update_own` policy only lets a lot's seller update it, but claiming
// requires the buyer to flip someone else's lot to 'reserved'. The caller
// (the claim API route) has already authorized this specific transition --
// auth checked, lot status checked, self-claim excluded -- before we get here.
export async function claimLot(
  supabase: Client,
  admin: Client,
  lotId: string,
  buyerId: string
) {
  const reservedUntil = new Date(Date.now() + CLAIM_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { error: claimError } = await supabase.from('claims').insert({
    lot_id: lotId,
    buyer_id: buyerId,
    status: 'pending',
    reserved_until: reservedUntil,
  })

  if (claimError) {
    if (claimError.code === '23505') throw new LotAlreadyClaimedError()
    throw claimError
  }

  const { data: updated, error: updateError } = await admin
    .from('lots')
    .update({ status: 'reserved' })
    .eq('id', lotId)
    .eq('status', 'available')
    .select()
    .maybeSingle()

  if (updateError) throw updateError
  if (!updated) throw new LotAlreadyClaimedError()

  return updated
}
