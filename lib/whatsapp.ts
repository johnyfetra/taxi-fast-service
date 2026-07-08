const WA_BASE = 'https://graph.facebook.com/v19.0'

function toWAPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.startsWith('+261')) return cleaned.slice(1)
  if (cleaned.startsWith('261'))  return cleaned
  if (cleaned.startsWith('0'))    return '261' + cleaned.slice(1)
  return cleaned
}

async function sendWAText(to: string, message: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN
  if (!phoneNumberId || !token) return

  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toWAPhone(to),
      type: 'text',
      text: { body: message },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[whatsapp] send failed to ${to}:`, err)
  }
}

// ── Admin notifications ────────────────────────────────────────────────────

export interface OrderNotificationData {
  id: string
  service: string
  customerName: string
  customerPhone: string
  pickupLabel: string
  dropoffLabel: string
  distanceKm: number | null
  durationMin: number | null
  priceOffered: number | null
  counterOffer: number | null
}

export async function notifyAdmin(order: OrderNotificationData): Promise<void> {
  const recipient = process.env.WHATSAPP_RECIPIENT_NUMBER
  if (!recipient) { console.warn('[whatsapp] WHATSAPP_RECIPIENT_NUMBER manquant'); return }

  const svc = order.service.toUpperCase()
  const price = order.priceOffered ? `${order.priceOffered.toLocaleString('fr-MG')} Ar` : 'N/A'
  const dist = order.distanceKm ? `${order.distanceKm} km` : ''

  const lines = [
    `🆕 NOUVELLE COMMANDE — ${svc}`,
    `👤 ${order.customerName} · ${order.customerPhone}`,
    `📍 ${order.pickupLabel}`,
    order.dropoffLabel ? `🏁 ${order.dropoffLabel}` : null,
    dist ? `📏 ${dist}` : null,
    `💰 ${price}`,
    `🔗 #${order.id.slice(0, 8)}`,
  ].filter(Boolean).join('\n')

  await sendWAText(recipient, lines).catch(e => console.error('[whatsapp] notifyAdmin:', e))
}

export async function notifyAdminEvent(message: string): Promise<void> {
  const recipient = process.env.WHATSAPP_RECIPIENT_NUMBER
  if (!recipient) return
  await sendWAText(recipient, message).catch(e => console.error('[whatsapp] notifyAdminEvent:', e))
}

// ── Client notifications ───────────────────────────────────────────────────

export async function notifyClient(phone: string, message: string): Promise<void> {
  await sendWAText(phone, message).catch(e => console.error('[whatsapp] notifyClient:', e))
}
