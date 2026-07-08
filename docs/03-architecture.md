# BMAD — Phase Architect
## Taxi Fast Service MVP

---

## 1. Diagramme des composants

```
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel (free, Hobby)                        │
│                                                                   │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  / (landing) │  │  /commander      │  │  /admin            │  │
│  │  Static RSC  │  │  Client + SSR    │  │  Client + Supabase │  │
│  └─────────────┘  │  ─────────────── │  │  Auth guard        │  │
│                   │  <CommanderForm/> │  │  ──────────────── │  │
│                   │  <LeafletMap/>    │  │  <OrdersList/>     │  │
│                   │  (dynamic import) │  │  <PricingEditor/>  │  │
│                   └──────────────────┘  └────────────────────┘  │
│                                                                   │
│  Route Handlers (all server, all Zod-validated)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │POST /api/   │  │POST /api/   │  │PATCH /api/orders/:id     │ │
│  │estimate     │  │orders       │  │(admin auth required)     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────────────────────┘ │
│         │                │                                        │
│  ┌──────▼──────┐  ┌──────▼───────────────┐                      │
│  │ lib/geo.ts  │  │ lib/pricing.ts (pure) │                      │
│  │ lib/osrm.ts │  │ lib/whatsapp.ts       │                      │
│  │ lib/photon  │  │ lib/supabase/         │                      │
│  └─────────────┘  └──────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
         │                        │                    │
         ▼                        ▼                    ▼
   Photon (Komoot)          OSRM demo            Supabase (free)
   geocoding/reverse        routing              Postgres + Auth
   no key, no SLA           no SLA, fallback     + Realtime
                                                      │
                                                      ▼
                                              WhatsApp Cloud API
                                              (Meta, template)
```

---

## 2. Structure de fichiers

```
/app
  layout.tsx                  # RootLayout, Inter font, metadata
  page.tsx                    # Landing (statique)
  commander/
    page.tsx                  # Commande SSR shell
    CommanderClient.tsx       # 'use client' — stepper form
  admin/
    layout.tsx                # Auth guard (Supabase session)
    page.tsx                  # Dashboard realtime
    tarifs/
      page.tsx                # Pricing editor
  api/
    estimate/route.ts         # POST — calcul prix serveur
    orders/route.ts           # POST — création commande
    orders/[id]/route.ts      # PATCH — changement statut

/components
  ui/                         # Primitives (Button, Input, Badge…)
  landing/
    Hero.tsx
    ServiceCards.tsx
    HowItWorks.tsx
    Footer.tsx
  commander/
    ServiceSelector.tsx
    MapWithPins.tsx           # dynamic import dans CommanderClient
    AddressSearch.tsx
    EstimateCard.tsx
    PriceDecision.tsx         # accept / counter UI
    ContactForm.tsx
    ConfirmationScreen.tsx
  admin/
    OrderCard.tsx
    OrdersList.tsx
    PricingEditor.tsx
    NotificationSound.tsx

/lib
  types.ts                    # Types partagés (Order, PricingRule…)
  pricing.ts                  # Calcul prix pur (testé unitairement)
  geo.ts                      # haversine, coordonnées utils
  osrm.ts                     # appel OSRM + fallback haversine
  photon.ts                   # geocoding + reverse geocoding
  whatsapp.ts                 # send template message (fire-forget)
  supabase/
    client.ts                 # createBrowserClient
    server.ts                 # createServerClient (cookies)
    admin.ts                  # createClient(SERVICE_ROLE_KEY)
  validation.ts               # Zod schemas (OrderInput, etc.)
  rateLimit.ts                # 3 commandes/h/IP (in-memory Map)

/public
  logo.svg
  notification.mp3            # Son alerte dashboard

.env.local                    # (gitignored)
.env.example                  # Template fourni
```

---

## 3. Contrats API définitifs

### POST /api/estimate

**Request body (Zod)**
```typescript
{
  service: z.enum(['taxi', 'colis', 'courses']),
  pickup: z.object({ lat: z.number(), lng: z.number() }),
  dropoff: z.object({ lat: z.number(), lng: z.number() }),
  details: z.object({
    size: z.enum(['petit', 'moyen', 'grand']).optional(),
    quantity: z.number().int().min(1).max(10).optional(),
  }).optional(),
}
```

**Response 200**
```typescript
{
  distance_km: number,       // ex: 4.2
  duration_min: number,      // OSRM × 1.5, arrondi aux 5 min
  price: number,             // Ar, arrondi aux 500
  fallback: boolean,         // true si haversine utilisé
}
```

**Erreurs**
- 400 : corps invalide (Zod error)
- 500 : erreur interne (ne révèle pas le détail)

---

### POST /api/orders

**Request body (Zod)**
```typescript
{
  service: z.enum(['taxi', 'colis', 'courses']),
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().regex(/^03[0-9] [0-9]{2} [0-9]{3} [0-9]{2}$/),
  pickup: z.object({ label: z.string(), lat: z.number(), lng: z.number(), geolocated: z.boolean() }),
  dropoff: z.object({ label: z.string(), lat: z.number(), lng: z.number() }).optional(),
  decision: z.union([
    z.object({ accepted: z.literal(true) }),
    z.object({ counter_offer: z.number().int().min(500) }),
  ]),
  details: z.object({
    size: z.enum(['petit', 'moyen', 'grand']).optional(),
    quantity: z.number().int().min(1).max(10).optional(),
    description: z.string().max(500).optional(),
    quartier: z.string().max(100).optional(),
  }).optional(),
  honeypot: z.string().max(0),   // doit être vide
}
```

**Logique serveur**
1. Valider Zod → 400 si échec
2. Vérifier honeypot vide → 422 si rempli (silencieux côté client)
3. Vérifier rate limit (3/h/IP) → 429 si dépassé
4. Recalculer le prix (ne jamais faire confiance au client)
5. Insérer en base via Supabase service role
6. Fire-and-forget WhatsApp notify (try/catch, erreur loguée uniquement)
7. Return `{ id: uuid }`

**Response 200**
```typescript
{ id: string }
```

---

### PATCH /api/orders/[id]

**Auth** : session Supabase valide (cookie) requise → 401 sinon

**Request body (Zod)**
```typescript
{
  status: z.enum(['confirmed', 'in_progress', 'done', 'cancelled']),
}
```

**Response 200** : `{ id, status }`

---

## 4. Schéma SQL final + RLS policies

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- Table tarifs
create table pricing_rules (
  service      text primary key check (service in ('taxi','colis','courses')),
  base_price   int  not null,
  price_per_km int  not null,
  min_price    int  not null,
  extras       jsonb not null default '{}'
);

-- Seed
insert into pricing_rules values
  ('taxi',   3000, 1500, 5000, '{}'),
  ('colis',  2000, 1200, 4000, '{"moyen": 2000, "grand": 5000}'),
  ('courses',    0,    0, 3000, '{}');

-- Table commandes
create table orders (
  id             uuid        primary key default gen_random_uuid(),
  service        text        not null check (service in ('taxi','colis','courses')),
  customer_name  text        not null,
  customer_phone text        not null,
  pickup         jsonb,
  dropoff        jsonb,
  distance_km    numeric,
  duration_min   int,
  price_offered  int,
  counter_offer  int,
  details        jsonb       not null default '{}',
  status         text        not null default 'client_accepted'
                 check (status in
                   ('client_accepted','client_countered',
                    'confirmed','in_progress','done','cancelled')),
  created_at     timestamptz not null default now()
);

-- Index perf
create index orders_created_at_idx on orders(created_at desc);
create index orders_status_idx on orders(status);

-- RLS
alter table orders         enable row level security;
alter table pricing_rules  enable row level security;

-- Aucune lecture publique sur orders
-- API server utilise service_role (bypass RLS) — OK

-- Admin authentifié peut tout lire/écrire
create policy "admin_select_orders" on orders
  for select using (auth.role() = 'authenticated');

create policy "admin_update_orders" on orders
  for update using (auth.role() = 'authenticated');

create policy "admin_select_pricing" on pricing_rules
  for select using (auth.role() = 'authenticated');

create policy "admin_update_pricing" on pricing_rules
  for update using (auth.role() = 'authenticated');

-- Realtime publication (pour le dashboard)
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table orders;
commit;
```

---

## 5. ADR — Architecture Decision Records

### ADR-001 : Leaflet + OSM plutôt que Google Maps

**Contexte** : La carte est centrale au produit (géoloc, épingles, visualisation du trajet).  
**Décision** : Leaflet + react-leaflet avec tuiles OpenStreetMap.  
**Raisons** :
- Budget zéro : Google Maps = 28 000 chargements/mois gratuits puis ~7 USD/1 000
- OSM couvre Antananarivo de façon acceptable pour notre usage
- react-leaflet est mature, tree-shakeable, < 40 KB gzip

**Compromis acceptés** :
- Pas de Street View ni de suggestions d'itinéraires style Google
- Qualité des tuiles OSM peut varier dans les quartiers périphériques de Tana
- Leaflet charge uniquement côté client (dynamic import obligatoire)

---

### ADR-002 : Négociation de prix par décision client (accept/counter) plutôt que par chat

**Contexte** : Le propriétaire veut un prix proposé par l'app mais garder la confirmation humaine.  
**Décision** : Deux boutons (Accepter / Refuser+proposer) au lieu d'un chat en temps réel.  
**Raisons** :
- Simplifie le flux : pas de WebSocket bi-directionnel côté client
- Différencie clairement de InDrive (qui force une négociation longue) — ici l'app propose un prix juste, le client dit oui ou non
- La confirmation finale reste humaine (appel/WhatsApp) — pas besoin d'un protocole de chat
- Réduit la surface de développement MVP

**Compromis acceptés** :
- Le client ne voit pas la contre-réponse de l'admin en temps réel (il attend un appel)
- Certains clients pourraient vouloir négocier davantage — couvert par le bouton WhatsApp direct

---

### ADR-003 : WhatsApp Cloud API (Meta officielle) pour les notifications admin

**Contexte** : L'admin utilise WhatsApp toute la journée ; il faut l'alerter sur son téléphone sans app dashboard ouverte.  
**Décision** : WhatsApp Cloud API avec template pré-approuvé, en fire-and-forget.  
**Raisons** :
- L'admin a déjà un numéro WhatsApp Business (+261 34 61 430 66)
- Quota gratuit Meta couvre les premiers mois
- Alternative (Twilio, Vonage) = coût immédiat ; alternative (SMS) = pas natif à Madagascar

**Compromis acceptés** :
- Template doit être approuvé par Meta (délai 1–3 jours) → dashboard realtime = canal principal pendant cette période
- Si WhatsApp échoue (quota dépassé, erreur réseau), la commande est quand même créée — log serveur uniquement, pas d'alerte client
- Coût marginal quand le quota gratuit est épuisé (~0,05–0,12 USD/message selon tarification Meta)
