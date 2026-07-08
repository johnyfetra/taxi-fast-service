import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdminEvent, notifyClient } from '@/lib/whatsapp'

interface NotifPayload {
  recipient: string   // 'admin' or client phone
  title: string
  body?: string
  order_id?: string
}

async function pushNotification(payload: NotifPayload): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return
  await admin.from('notifications').insert({
    recipient: payload.recipient,
    title: payload.title,
    body: payload.body ?? null,
    order_id: payload.order_id ?? null,
  }).then(({ error }) => {
    if (error) console.error('[notify] insert:', error.message)
  })
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function notifyAdminAll(title: string, body: string, orderId?: string): Promise<void> {
  await Promise.allSettled([
    pushNotification({ recipient: 'admin', title, body, order_id: orderId }),
    notifyAdminEvent(`${title}\n${body}`),
  ])
}

// ── Client ─────────────────────────────────────────────────────────────────

export async function notifyClientAll(phone: string, title: string, body: string, orderId?: string): Promise<void> {
  await Promise.allSettled([
    pushNotification({ recipient: phone, title, body, order_id: orderId }),
    notifyClient(phone, `${title}\n${body}`),
  ])
}
