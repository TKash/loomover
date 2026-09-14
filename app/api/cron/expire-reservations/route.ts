import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  // An unset secret must not turn into a guessable "Bearer undefined" / "Bearer " match.
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: staleClaims, error: staleError } = await supabase
    .from('claims')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('reserved_until', nowIso)
    .select('lot_id')

  if (staleError) {
    return NextResponse.json({ error: staleError.message }, { status: 500 })
  }

  const lotIds = [...new Set((staleClaims ?? []).map((c) => c.lot_id))]

  if (lotIds.length > 0) {
    const { error: revertError } = await supabase
      .from('lots')
      .update({ status: 'available' })
      .eq('status', 'reserved')
      .in('id', lotIds)

    if (revertError) {
      return NextResponse.json({ error: revertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ expiredClaims: lotIds.length })
}
