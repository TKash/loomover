import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLot } from '@/lib/lots/queries'
import { createLotSchema } from '@/lib/lots/schema'

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Complete your profile before posting a lot.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createLotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const lot = await createLot(supabase, {
      ...parsed.data,
      seller_id: user.id,
      source: 'web',
    })
    return NextResponse.json({ lot }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create lot.' },
      { status: 500 }
    )
  }
}
