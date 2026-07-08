const WA_BASE = 'https://graph.facebook.com/v19.0'

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
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN
  const recipient = process.env.WHATSAPP_RECIPIENT_NUMBER

  if (!phoneNumberId || !token || !recipient) {
    console.warn('[whatsapp] Env vars manquantes, notification ignorée')
    return
  }

  const counterLine =
    order.counterOffer != null
      ? `Contre-offre client : ${order.counterOffer.toLocaleString('fr-MG')} Ar`
      : `Tarif accepté : ${(order.priceOffered ?? 0).toLocaleString('fr-MG')} Ar`

  const body = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: 'nouvelle_commande',
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.service.toUpperCase() },
            { type: 'text', text: order.customerName },
            { type: 'text', text: order.customerPhone },
            { type: 'text', text: order.pickupLabel },
            { type: 'text', text: order.dropoffLabel || 'N/A' },
            { type: 'text', text: order.distanceKm?.toString() ?? 'N/A' },
            { type: 'text', text: order.durationMin?.toString() ?? 'N/A' },
            { type: 'text', text: (order.priceOffered ?? 0).toLocaleString('fr-MG') },
            { type: 'text', text: counterLine },
          ],
        },
      ],
    },
  }

  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API ${res.status}: ${err}`)
  }
}
