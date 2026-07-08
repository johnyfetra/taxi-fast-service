import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const VehicleSchema = z.object({
  type: z.enum(['moto', 'velo']),
  label: z.string().min(1).max(60),
  plate: z.string().max(30).optional(),
  status: z.enum(['disponible', 'en_course', 'maintenance', 'hors_service']).optional(),
  notes: z.string().max(200).optional(),
})

async function guard() {
  const supabase = await createClient()
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session ? createAdminClient() : null
}

export async function GET() {
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data, error } = await admin.from('vehicles').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = VehicleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const { data, error } = await admin.from('vehicles').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
