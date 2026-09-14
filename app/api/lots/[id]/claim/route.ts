import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimLot, getLotById, LotAlreadyClaimedError } from '@/lib/lots/queries'
import { sendWhatsAppMessage } from '@/lib/whatsapp/twilio'
import { formatPrice, waLink } from '@/lib/format'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Complete your profile before claiming a lot.' }, { status: 403 })
  }

  const lot = await getLotById(supabase, id)
  if (lot.status !== 'available') {
    return NextResponse.json({ error: 'This lot is no longer available.' }, { status: 409 })
  }
  if (lot.seller_id === user.id) {
    return NextResponse.json({ error: "You can't claim your own lot." }, { status: 400 })
  }

  try {
    await claimLot(supabase, createAdminClient(), id, user.id)
  } catch (err) {
    if (err instanceof LotAlreadyClaimedError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to claim lot.' },
      { status: 500 }
    )
  }

  if (lot.profiles?.whatsapp_number) {
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('full_name, company_name, whatsapp_number')
      .eq('id', user.id)
      .maybeSingle()

    const buyerName = buyerProfile?.full_name || 'A buyer'
    const buyerContact = buyerProfile?.whatsapp_number
      ? `\n${waLink(buyerProfile.whatsapp_number)}`
      : ''

    const message =
      `${buyerName}${buyerProfile?.company_name ? ` (${buyerProfile.company_name})` : ''} ` +
      `is interested in your ${lot.category} lot (${lot.quantity} ${lot.unit}, ` +
      `${formatPrice(lot.price_per_unit, lot.currency, lot.unit)}). ` +
      `Reserved for 48h -- reach out to close the deal.${buyerContact}`

    await sendWhatsAppMessage(lot.profiles.whatsapp_number, message)
  }

  return NextResponse.json({ success: true })
}
