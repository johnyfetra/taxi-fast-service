import { NextRequest, NextResponse } from 'next/server'

function normalizePhone(p: string): string {
  return p.trim().replace(/\s/g, '').replace(/^\+261/, '0')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { phone } = body
  if (!phone?.trim()) return NextResponse.json({ error: 'phone requis' }, { status: 400 })

  const adminPhone = process.env.ADMIN_PHONE ?? ''
  const adminEmail = process.env.ADMIN_EMAIL ?? ''

  if (!adminPhone || !adminEmail) {
    return NextResponse.json({ error: 'Aucun compte admin avec ce numéro' }, { status: 404 })
  }

  const inputNorm = normalizePhone(phone)
  const adminNorm = normalizePhone(adminPhone)

  if (inputNorm !== adminNorm) {
    return NextResponse.json({ error: 'Aucun compte admin avec ce numéro' }, { status: 404 })
  }

  return NextResponse.json({ email: adminEmail })
}
