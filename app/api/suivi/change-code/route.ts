import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const store = await cookies()
  const session = store.get('tfs_client')?.value
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const [phone, token] = session.split(':')
  if (!phone || !token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { data: account } = await admin
    .from('customer_accounts')
    .select('phone, access_code, session_expires_at')
    .eq('phone', phone)
    .eq('session_token', token)
    .single()

  if (!account) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (account.session_expires_at && new Date(account.session_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { current_code, new_code } = body

  if (!current_code?.trim() || !new_code?.trim()) {
    return NextResponse.json({ error: 'Code actuel et nouveau code requis' }, { status: 400 })
  }

  if (account.access_code !== current_code.trim()) {
    return NextResponse.json({ error: 'Code actuel incorrect' }, { status: 400 })
  }

  const newCode = new_code.trim()
  if (!/^\d{6}$/.test(newCode)) {
    return NextResponse.json({ error: 'Le nouveau code doit contenir exactement 6 chiffres' }, { status: 400 })
  }

  await admin
    .from('customer_accounts')
    .update({ access_code: newCode })
    .eq('phone', phone)

  return NextResponse.json({ ok: true })
}
