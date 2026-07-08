# STORY-15 : POST /api/orders + lib/whatsapp.ts — Création commande + notification
**Epic** : 3 — Backend commandes  
**Priorité** : P0  
**Dépendances** : STORY-03, STORY-04, STORY-06

---

## Contexte

Route handler pour créer une commande. Le prix est **recalculé côté serveur** (ne jamais faire confiance au prix envoyé par le client). Un honeypot et un rate limit IP protègent contre les abus. La notification WhatsApp est fire-and-forget — un échec WhatsApp ne doit jamais faire échouer la commande.

---

## `lib/whatsapp.ts`

```typescript
const WA_API = 'https://graph.facebook.com/v19.0'

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
  status: string
}

// Fire-and-forget — ne throw jamais
export async function notifyAdmin(order: OrderNotificationData): Promise<void>
```

### Template WhatsApp à créer dans Meta Business Manager

```
Nom : nouvelle_commande
Langue : fr
Catégorie : UTILITY

Corps (exemple) :
🚀 Nouvelle commande Taxi Fast Service

Service : {{1}}
Client : {{2}} — {{3}}
Départ : {{4}}
Arrivée : {{5}}
Distance : {{6}} km | {{7}} min

Tarif proposé : {{8}} Ar
{{9}}
```

Variables : service, nom, téléphone, départ, arrivée, distance, durée, prix_proposé, contre_offre_ou_vide

---

## `app/api/orders/route.ts`

### Zod schema

```typescript
const OrderSchema = z.object({
  service:       z.enum(['taxi', 'colis', 'courses']),
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().regex(/^03[0-9] [0-9]{2} [0-9]{3} [0-9]{2}$/),
  pickup:  z.object({ label: z.string(), lat: z.number(), lng: z.number(), geolocated: z.boolean() }),
  dropoff: z.object({ label: z.string(), lat: z.number(), lng: z.number() }).optional(),
  decision: z.discriminatedUnion('type', [
    z.object({ type: z.literal('accepted') }),
    z.object({ type: z.literal('counter'), counter_offer: z.number().int().min(500).max(500000) }),
  ]),
  details: z.object({
    size:        z.enum(['petit', 'moyen', 'grand']).optional(),
    quantity:    z.number().int().min(1).max(10).optional(),
    description: z.string().max(500).optional(),
    quartier:    z.string().max(100).optional(),
  }).optional(),
  honeypot: z.string().max(0),
})
```

### Logique

```
1. Valider Zod → 400 si invalide
2. Si honeypot non vide → return 200 { id: 'fake-uuid' } (silencieux, sans créer la commande)
3. Rate limit : lire IP depuis x-forwarded-for ou x-real-ip
   → 3 commandes max dans la dernière heure par IP
   → si dépassé : 429 { error: "Trop de demandes, réessayez dans une heure" }
4. Si service !== 'courses' et dropoff défini :
   → getRoute(pickup, dropoff) pour recalculer
   → getPricingRule(service) depuis Supabase
   → calculatePrice(rule, { service, distance_km, details })
5. Construire l'objet ordre :
   - status = decision.type === 'accepted' ? 'client_accepted' : 'client_countered'
   - counter_offer = decision.counter_offer ?? null
   - price_offered = prix recalculé serveur (pas celui du client)
6. INSERT dans orders via Supabase admin client
7. try { await notifyAdmin(order) } catch { console.error('WhatsApp failed', e) }
   // Ne jamais faire échouer la commande si WhatsApp fail
8. Return 200 { id: order.id }
```

### Rate limit (in-memory, acceptable au MVP)

```typescript
// lib/rateLimit.ts
const ipMap = new Map<string, number[]>() // IP → timestamps

export function checkRateLimit(ip: string, windowMs = 3600_000, max = 3): boolean {
  const now = Date.now()
  const timestamps = (ipMap.get(ip) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= max) return false
  ipMap.set(ip, [...timestamps, now])
  return true
}
```

---

## Critères d'acceptation

- Given commande taxi valide avec `decision: { type: 'accepted' }`, When POST /api/orders, Then 200 { id: uuid } et commande en base avec statut `client_accepted`
- Given commande avec counter_offer 3000, When POST /api/orders, Then statut `client_countered`, counter_offer = 3000 en base
- Given honeypot rempli, When POST /api/orders, Then 200 retourné (silencieux) mais aucune ligne insérée en base
- Given 4 commandes du même IP en 1h, When la 4e arrive, Then 429 retourné
- Given WhatsApp API lance une exception, When POST /api/orders, Then la commande est quand même créée (200 retourné)
- Given le client envoie un prix différent de l'estimation, When POST /api/orders, Then le prix en base est celui recalculé côté serveur
