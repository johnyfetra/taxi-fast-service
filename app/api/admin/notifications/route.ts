import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { data } = await admin
    .from('notifications')
    .select('id, title, body, order_id, read, created_at')
    .eq('recipient', 'admin')
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ notifications: data ?? [] })
}

export async function PATCH() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  await admin
    .from('notifications')
    .update({ read: true })
    .eq('recipient', 'admin')
    .eq('read', false)

  return NextResponse.json({ ok: true })
}
