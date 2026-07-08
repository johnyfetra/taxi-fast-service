import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PatchSchema = z.object({
  status: z.enum(['disponible', 'en_course', 'maintenance', 'hors_service']).optional(),
  label: z.string().min(1).max(60).optional(),
  plate: z.string().max(30).optional(),
  notes: z.string().max(200).optional(),
})

async function guard() {
  const supabase = await createClient()
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session ? createAdminClient() : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const { data, error } = await admin.from('vehicles').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await guard()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { error } = await admin.from('vehicles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
