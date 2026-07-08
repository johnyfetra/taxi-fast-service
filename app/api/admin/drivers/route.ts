import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { data, error } = await admin
    .from('drivers')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { name, phone, type, vehicle_id, notes } = body

  if (!name?.trim() || !phone?.trim() || !['moto', 'velo'].includes(type)) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const pin_code = Math.floor(1000 + Math.random() * 9000).toString()

  const { data, error } = await admin
    .from('drivers')
    .insert({ name: name.trim(), phone: phone.trim(), type, vehicle_id: vehicle_id || null, notes: notes?.trim() || null, pin_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
