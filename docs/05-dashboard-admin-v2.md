# BMAD — Phase PM + Architect + PO : Dashboard Admin V2
## Taxi Fast Service — Spécifications complètes

---

## Préambule

Ce document couvre l'évolution majeure du dashboard admin TFS au-delà du MVP (STORY-01 à STORY-24). Le MVP a livré : authentification Supabase, liste commandes realtime, éditeur de tarifs. Ce document spécifie la V2 : vue commandes enrichie, CRM clients, analytics visuel, gestion de flotte, optimisation de trajets et intégration du logo TFS.

**Charte graphique** : Blanc `#FFFFFF`, Rouge `#D81F26`, Noir `#0D0D0F`  
**Stack cible** : Next.js 16 / Tailwind v4 / Supabase / Leaflet / OSRM / Photon

---

## A. Analyse des besoins

### A.1 Personas

#### Persona B (existant) — Zo, 34 ans, admin-chauffeur

- Utilise le dashboard sur son téléphone en roulant (arrêts brefs, viewport 360–430px)
- Notification WhatsApp = canal d'alerte principal
- **Nouveaux besoins V2** : suivre son CA quotidien/mensuel, visualiser l'enchaînement des livraisons, gérer son parc de véhicules
- Frustration actuelle V2 : ne sait pas combien il a gagné ce mois, doit recalculer manuellement les tournées de livraison

#### Persona C (nouveau) — Zo en mode gestionnaire

- Même personne, mais en mode backoffice (le soir, tablette ou PC)
- Viewport 768–1440px, temps disponible pour analyser
- Besoin : lire les graphiques de performance, exporter les données clients, visualiser les tournées sur carte

#### Persona D (futur) — Livreur vélo (employé ou sous-traitant)

- N'a pas accès au dashboard complet, uniquement à la vue tournée du jour
- Hors périmètre V2 strict mais le modèle de données doit l'anticiper (colonne `assigned_to` dans `orders`)

---

### A.2 Décomposition en User Stories — MoSCoW V2

#### MUST HAVE

---

**US-101 — Vue commandes enrichie avec filtres avancés**

*En tant que Zo, je veux filtrer les commandes par service, statut et période pour retrouver rapidement n'importe quelle commande.*

**Critères d'acceptation :**
- Given je suis sur /admin, When je sélectionne le filtre "Colis", Then seules les commandes de type colis s'affichent
- Given je sélectionne une plage de dates (picker), When je valide, Then les commandes hors plage disparaissent
- Given je tape un nom ou un numéro dans la barre de recherche, When je saisis 3+ caractères, Then les commandes correspondantes sont filtrées en temps réel (côté client, pas d'appel API)
- Given la liste filtrée, When j'exporte en CSV, Then le fichier contient les colonnes : id, service, client, téléphone, départ, arrivée, distance, prix, statut, date
- Given une commande en statut `done`, When je la vois dans la liste, Then son prix final est affiché (price_offered ou counter_offer selon acceptation)

---

**US-102 — CRM clients : liste et fiche**

*En tant que Zo, je veux voir la liste de tous mes clients avec leur historique de commandes pour mieux les servir et identifier les réguliers.*

**Critères d'acceptation :**
- Given je suis sur /admin/clients, When la page charge, Then une liste de clients dédupliqués par numéro de téléphone s'affiche, triée par nombre de commandes décroissant
- Given un client dans la liste, When je tape dessus, Then une fiche détaillée s'ouvre avec : nom, téléphone, date premier contact, nombre total de commandes, CA total généré, liste des 5 dernières commandes
- Given la fiche client, When je tape le bouton "Appeler", Then `tel:+261XXXXXXXX` s'ouvre
- Given la fiche client, When je tape le bouton "WhatsApp", Then `wa.me/261XXXXXXXX` s'ouvre avec un message vide pré-rempli au format international
- Given la liste clients, When je recherche par nom ou téléphone, Then le filtre s'applique en temps réel

---

**US-103 — Dashboard analytique : KPIs du jour**

*En tant que Zo, je veux voir en un coup d'oeil le CA du jour, le nombre de courses et livraisons, pour savoir si la journée est bonne.*

**Critères d'acceptation :**
- Given je suis sur /admin, When la page charge, Then 4 KPI cards s'affichent : CA du jour (Ar), Nb courses taxi, Nb livraisons colis, Nb devis courses
- Given les KPIs, When une nouvelle commande `done` est créée, Then le CA s'actualise en temps réel (Realtime Supabase)
- Given les KPIs, When aucune commande `done` du jour, Then "0 Ar" s'affiche (pas de spinner infini)
- Given les KPIs sur mobile (360px), When je vois les cards, Then elles sont en grille 2×2, chaque card est lisible sans overflow

---

**US-104 — Dashboard analytique : graphiques par période**

*En tant que Zo en mode gestionnaire, je veux voir des graphiques de CA et volume par jour/mois/année pour analyser mes tendances.*

**Critères d'acceptation :**
- Given je suis sur /admin/analytics, When la page charge, Then un graphique à barres affiche le CA par jour sur les 30 derniers jours
- Given le sélecteur de période, When je sélectionne "Mois", Then le graphique passe en vue mensuelle (12 derniers mois)
- Given le graphique, When je survole/tape une barre, Then une infobulle affiche : date, CA (Ar), nb commandes
- Given les graphiques, When aucune donnée pour une période, Then la barre est à 0 (pas de trou)
- Given la page analytics, When elle charge, Then les données viennent d'une route GET /api/admin/analytics avec agrégation Supabase (pas de calcul côté client sur les raw orders)

---

**US-105 — Gestion de flotte : liste véhicules**

*En tant que Zo, je veux gérer la liste de mes véhicules (motos et vélos) avec leur statut pour savoir ce qui est disponible.*

**Critères d'acceptation :**
- Given je suis sur /admin/flotte, When la page charge, Then la liste des véhicules s'affiche avec : type (moto/vélo), immatriculation, statut (disponible/en_course/maintenance/hors_service), et le nom du chauffeur assigné si applicable
- Given un véhicule, When je tape "Modifier le statut", Then un sélecteur permet de changer le statut (disponible/en_course/maintenance/hors_service)
- Given un statut modifié, When je valide, Then le PATCH /api/admin/fleet/:id est appelé et la liste se met à jour
- Given la liste flotte, When un véhicule est "en_course", Then il est affiché avec un indicateur visuel rouge/actif
- Given le bouton "Ajouter un véhicule", When je tape dessus, Then un formulaire s'ouvre : type, immatriculation, description

---

**US-106 — Optimisation de trajet pour les livraisons colis**

*En tant que Zo, je veux voir un trajet optimisé pour toutes les livraisons du jour pour réduire le temps de route de mon livreur.*

**Critères d'acceptation :**
- Given je suis sur /admin/tournee, When la page charge, Then toutes les commandes colis du jour en statut `confirmed` ou `in_progress` s'affichent
- Given la liste des colis, When je tape "Optimiser le trajet", Then l'algorithme calcule l'ordre optimal et affiche les étapes numérotées
- Given le trajet optimisé, When il est affiché, Then chaque étape montre : numéro d'ordre, adresse client, distance depuis l'étape précédente, durée estimée
- Given le trajet optimisé, When je vois les étapes, Then le total distance et durée de la tournée complète est affiché en bas
- Given la carte Leaflet, When le trajet optimisé est calculé, Then la route complète est tracée sur la carte avec les points dans l'ordre
- Given l'étape d'un colis, When je tape "Livré", Then le statut de la commande passe à `done` et le point est retiré de la carte

---

**US-107 — Logo TFS dans le dashboard et l'app principale**

*En tant que Zo, je veux que le logo TFS soit visible dans le dashboard admin et sur la landing page pour renforcer l'identité de marque.*

**Critères d'acceptation :**
- Given /admin (toutes pages), When je vois le header, Then le logo TFS (`/docs/logo.png`) est affiché à gauche du header, redimensionné à max-height 40px
- Given la landing page (/), When je vois le header, Then le logo TFS est affiché dans la section Hero
- Given le logo sur mobile (360px), When il est affiché, Then il ne provoque pas d'overflow horizontal
- Given le logo en SVG/PNG, When il est chargé, Then il utilise `next/image` avec les props `alt="Logo Taxi Fast Service"`, `priority` sur la landing

---

#### SHOULD HAVE

---

**US-108 — Assignation d'une commande à un véhicule**

*En tant que Zo, je veux assigner chaque commande confirmée à un véhicule de la flotte pour savoir qui fait quoi.*

**Critères d'acceptation :**
- Given une commande en statut `confirmed`, When je la vois dans OrderCard, Then un sélecteur "Assigner à" liste les véhicules disponibles
- Given une assignation, When je valide, Then `orders.vehicle_id` est mis à jour et le statut du véhicule passe à `en_course`
- Given un véhicule assigné à une commande `done`, When la commande passe à `done`, Then le statut du véhicule repasse à `disponible` automatiquement (trigger ou logique serveur)

---

**US-109 — Export CSV depuis le CRM**

*En tant que Zo, je veux exporter la liste clients en CSV pour la partager ou l'analyser dans un tableur.*

**Critères d'acceptation :**
- Given la page /admin/clients, When je tape "Exporter CSV", Then un fichier CSV est téléchargé avec : nom, téléphone, nb_commandes, ca_total, date_premiere_commande
- Given l'export, When il contient des caractères malgaches ou accentués, Then l'encodage est UTF-8 BOM pour compatibilité Excel

---

**US-110 — Mémo / note sur commande**

*En tant que Zo, je veux pouvoir ajouter une note interne sur une commande pour mémoriser une instruction spéciale.*

**Critères d'acceptation :**
- Given une OrderCard, When je tape "Ajouter une note", Then un champ texte s'ouvre (max 200 chars)
- Given une note sauvegardée, When je revois la commande, Then la note s'affiche sous les détails client

---

#### COULD HAVE

---

**US-111 — Notifications push PWA pour nouvelles commandes**

*En tant que Zo, je veux recevoir une notification push même si le dashboard n'est pas ouvert.*

**Critères d'acceptation :**
- Given le Service Worker est enregistré, When une commande est créée, Then une notification push s'affiche sur le téléphone (titre : "Nouvelle commande TFS", body : service + adresse)
- Given la notification, When je tape dessus, Then le dashboard s'ouvre sur la commande concernée

---

**US-112 — Vue "Aujourd'hui" simplifiée pour livreur**

*En tant que livreur, je veux voir uniquement mes livraisons du jour sans accès au CRM ni aux analytics.*

**Critères d'acceptation :**
- Given un utilisateur avec le rôle `driver`, When il accède au dashboard, Then il voit uniquement /admin/tournee filtré sur ses commandes assignées
- Given ce rôle, When il tente d'accéder à /admin/analytics ou /admin/clients, Then il est redirigé vers /admin/tournee

---

#### WON'T HAVE (V2)

- Paiement intégré / mobile money
- Tracking GPS temps réel des véhicules (nécessite app native ou beacon)
- Multi-tenant (plusieurs opérateurs TFS)
- Chat en temps réel admin ↔ client
- Gestion des congés / planning chauffeurs avancé
- Facturation PDF automatique

---

### A.3 Priorisation MoSCoW synthèse

| User Story | Priorité | Complexité | Valeur métier |
|---|---|---|---|
| US-107 : Logo TFS | MUST | S | Identité marque |
| US-101 : Vue commandes enrichie | MUST | M | Opérationnel core |
| US-103 : KPIs du jour | MUST | M | Visibilité temps réel |
| US-102 : CRM clients | MUST | M | Relation client |
| US-104 : Graphiques analytics | MUST | L | Pilotage business |
| US-105 : Gestion flotte | MUST | M | Opérationnel |
| US-106 : Optimisation trajet | MUST | XL | Différenciateur fort |
| US-108 : Assignation commande/véhicule | SHOULD | M | Coordination |
| US-109 : Export CSV CRM | SHOULD | S | Données |
| US-110 : Note sur commande | SHOULD | S | Opérationnel |
| US-111 : Push PWA | COULD | L | Confort |
| US-112 : Vue livreur | COULD | M | Multi-rôle |

---

## B. Schéma de base de données

### B.1 Nouvelles tables

#### Table `vehicles` — Flotte de véhicules

```sql
-- ============================================================
-- Table flotte de véhicules
-- ============================================================
create table if not exists vehicles (
  id              uuid        primary key default gen_random_uuid(),
  type            text        not null check (type in ('moto', 'velo')),
  label           text        not null,             -- ex: "Moto principale", "Vélo livraison"
  plate           text,                             -- immatriculation ou identifiant interne
  status          text        not null default 'disponible'
                  check (status in ('disponible', 'en_course', 'maintenance', 'hors_service')),
  notes           text,                             -- infos libres (couleur, modèle…)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed initial (flotte actuelle de Zo)
insert into vehicles (type, label, plate, status) values
  ('moto', 'Moto principale', 'MOTO-ZO-01', 'disponible'),
  ('velo', 'Vélo livraison',  'VELO-ZO-01', 'disponible')
on conflict do nothing;

-- Trigger updated_at automatique
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger vehicles_updated_at
  before update on vehicles
  for each row execute function update_updated_at_column();

-- RLS
alter table vehicles enable row level security;

create policy "admin_all_vehicles" on vehicles
  for all using (auth.role() = 'authenticated');

-- Realtime (pour refléter changements de statut en live)
-- Ajouter à la publication existante :
-- alter publication supabase_realtime add table vehicles;
```

---

#### Table `route_plans` — Tournées optimisées sauvegardées

```sql
-- ============================================================
-- Table tournées optimisées (historique + cache)
-- ============================================================
create table if not exists route_plans (
  id              uuid        primary key default gen_random_uuid(),
  planned_date    date        not null,             -- date de la tournée
  vehicle_id      uuid        references vehicles(id) on delete set null,
  order_sequence  uuid[]      not null,             -- IDs des orders dans l'ordre optimisé
  waypoints       jsonb       not null default '[]', -- [{order_id, lat, lng, label, distance_from_prev_km, duration_from_prev_min}]
  total_distance_km numeric,
  total_duration_min int,
  algorithm       text        not null default 'nearest_neighbor',
  created_at      timestamptz not null default now()
);

-- Index date pour récupérer la tournée du jour rapidement
create index if not exists route_plans_date_idx on route_plans(planned_date desc);

-- RLS
alter table route_plans enable row level security;

create policy "admin_all_route_plans" on route_plans
  for all using (auth.role() = 'authenticated');
```

---

### B.2 Colonnes ajoutées aux tables existantes

#### Table `orders` — colonnes supplémentaires

```sql
-- ============================================================
-- Migrations additives sur orders
-- (à exécuter après le schéma MVP existant)
-- ============================================================

-- Assignation à un véhicule
alter table orders
  add column if not exists vehicle_id uuid references vehicles(id) on delete set null;

-- Note interne de l'admin
alter table orders
  add column if not exists admin_note text check (length(admin_note) <= 200);

-- Heure de complétion (pour calculs de durée réelle)
alter table orders
  add column if not exists completed_at timestamptz;

-- Index pour le CRM (requêtes agrégées par client)
create index if not exists orders_customer_phone_idx on orders(customer_phone);
create index if not exists orders_vehicle_id_idx    on orders(vehicle_id);
create index if not exists orders_completed_at_idx  on orders(completed_at desc);
```

---

### B.3 Vues SQL pour les analytics

```sql
-- ============================================================
-- Vue : CA quotidien (pour graphique barres)
-- ============================================================
create or replace view v_daily_revenue as
select
  date_trunc('day', created_at)::date          as day,
  count(*)                                     as order_count,
  count(*) filter (where service = 'taxi')     as taxi_count,
  count(*) filter (where service = 'colis')    as colis_count,
  count(*) filter (where service = 'courses')  as courses_count,
  coalesce(sum(
    case
      when counter_offer is not null then counter_offer
      else price_offered
    end
  ) filter (where status = 'done'), 0)         as revenue_ar
from orders
group by date_trunc('day', created_at)::date
order by day desc;

-- ============================================================
-- Vue : CA mensuel (pour graphique 12 mois)
-- ============================================================
create or replace view v_monthly_revenue as
select
  date_trunc('month', created_at)::date        as month,
  count(*)                                     as order_count,
  coalesce(sum(
    case
      when counter_offer is not null then counter_offer
      else price_offered
    end
  ) filter (where status = 'done'), 0)         as revenue_ar
from orders
group by date_trunc('month', created_at)::date
order by month desc;

-- ============================================================
-- Vue : CRM clients agrégé
-- ============================================================
create or replace view v_customers as
select
  customer_phone,
  max(customer_name)                           as customer_name,
  count(*)                                     as total_orders,
  count(*) filter (where status = 'done')      as completed_orders,
  coalesce(sum(
    case
      when counter_offer is not null then counter_offer
      else price_offered
    end
  ) filter (where status = 'done'), 0)         as total_revenue_ar,
  min(created_at)                              as first_order_at,
  max(created_at)                              as last_order_at
from orders
group by customer_phone
order by total_orders desc;

-- RLS sur les vues (héritée des tables sources via security definer si nécessaire)
-- Alternative : appeler les vues uniquement via service_role dans les route handlers
```

---

### B.4 Index complémentaires

```sql
-- Pour les analytics par période
create index if not exists orders_created_date_idx
  on orders(date_trunc('day', created_at));

-- Pour filtrage par service dans les analytics
create index if not exists orders_service_status_idx
  on orders(service, status);
```

---

### B.5 SQL complet V2 — à exécuter après le schéma MVP

```sql
-- ============================================================
-- TFS — Migration Dashboard Admin V2
-- Exécuter dans Supabase > SQL Editor après le schéma MVP initial
-- ============================================================

-- 1. NOUVELLE TABLE : vehicles
-- [voir section B.1 ci-dessus]

-- 2. NOUVELLE TABLE : route_plans
-- [voir section B.1 ci-dessus]

-- 3. MIGRATIONS orders
alter table orders
  add column if not exists vehicle_id    uuid references vehicles(id) on delete set null,
  add column if not exists admin_note    text check (length(admin_note) <= 200),
  add column if not exists completed_at timestamptz;

-- 4. INDEX
create index if not exists orders_customer_phone_idx   on orders(customer_phone);
create index if not exists orders_vehicle_id_idx       on orders(vehicle_id);
create index if not exists orders_completed_at_idx     on orders(completed_at desc);
create index if not exists orders_created_date_idx     on orders((created_at::date));
create index if not exists orders_service_status_idx   on orders(service, status);

-- 5. VUES ANALYTICS
-- [voir section B.3 ci-dessus]

-- 6. REALTIME — ajouter vehicles
alter publication supabase_realtime add table vehicles;

-- ============================================================
-- VÉRIFICATION
-- SELECT * FROM vehicles;       → 2 lignes
-- SELECT * FROM v_daily_revenue LIMIT 7;
-- SELECT * FROM v_customers LIMIT 10;
-- ============================================================
```

---

## C. Architecture technique

### C.1 Nouvelles routes API

#### GET /api/admin/analytics

```typescript
// Paramètres query : period = 'day' | 'month' | 'year', limit = number
// Auth : session Supabase requise
// Source : vue v_daily_revenue ou v_monthly_revenue selon period
// Response :
{
  period: 'day' | 'month' | 'year',
  rows: Array<{
    label: string,          // ex: "08 juil.", "Juillet 2025"
    revenue_ar: number,
    order_count: number,
    taxi_count: number,
    colis_count: number,
    courses_count: number,
  }>,
  totals: {
    revenue_ar: number,
    order_count: number,
  }
}
```

---

#### GET /api/admin/customers

```typescript
// Paramètres query : search = string, limit = number, offset = number
// Auth : session Supabase requise
// Source : vue v_customers
// Response :
{
  customers: Array<{
    customer_phone: string,
    customer_name: string,
    total_orders: number,
    completed_orders: number,
    total_revenue_ar: number,
    first_order_at: string,
    last_order_at: string,
  }>,
  total: number,
}
```

---

#### GET /api/admin/customers/[phone]/orders

```typescript
// Auth : session requise
// Retourne les 20 dernières commandes du client identifié par son téléphone
// Response : { orders: Order[] }
```

---

#### GET /api/admin/fleet

```typescript
// Auth : session requise
// Response : { vehicles: Vehicle[] }
```

#### POST /api/admin/fleet

```typescript
// Auth : session requise
// Body Zod : { type: 'moto'|'velo', label: string, plate?: string, notes?: string }
// Insère un nouveau véhicule
// Response : { vehicle: Vehicle }
```

#### PATCH /api/admin/fleet/[id]

```typescript
// Auth : session requise
// Body Zod : { status?: VehicleStatus, label?: string, plate?: string, notes?: string }
// Response : { vehicle: Vehicle }
```

---

#### POST /api/admin/route-optimize

```typescript
// Auth : session requise
// Body : { order_ids: string[], vehicle_id?: string, depot: { lat: number, lng: number } }
// Logique : algorithme Nearest Neighbor (voir section C.2)
// Appel OSRM pour chaque segment du trajet optimisé
// Sauvegarde en route_plans si requested (save: boolean)
// Response :
{
  sequence: Array<{
    order_id: string,
    customer_name: string,
    address_label: string,
    lat: number,
    lng: number,
    distance_from_prev_km: number,
    duration_from_prev_min: number,
    cumulative_distance_km: number,
    cumulative_duration_min: number,
  }>,
  total_distance_km: number,
  total_duration_min: number,
  depot: { lat: number, lng: number },
}
```

---

#### GET /api/admin/kpis

```typescript
// Auth : session requise
// Source : requête directe sur orders (aujourd'hui)
// Optimisé : une seule requête SQL avec COUNT et SUM conditionnels
// Response :
{
  today: {
    revenue_ar: number,
    taxi_count: number,
    colis_count: number,
    courses_count: number,
    active_count: number,    // statuts client_accepted + client_countered + confirmed + in_progress
  }
}
```

---

#### PATCH /api/admin/orders/[id] — extension

```typescript
// Étend la route PATCH existante avec les nouveaux champs
// Body Zod étendu :
{
  status?: z.enum(['confirmed','in_progress','done','cancelled']),
  vehicle_id?: z.string().uuid().nullable(),
  admin_note?: z.string().max(200).nullable(),
  completed_at?: z.string().datetime().nullable(),  // auto-set si status → 'done'
}
// Si status === 'done' et completed_at absent → set completed_at = now() côté serveur
// Si vehicle_id est assigné → vérifier que le véhicule existe (FK check naturel)
```

---

### C.2 Algorithme d'optimisation de trajet

#### Contexte et choix algorithmique

Le problème est un TSP (Travelling Salesman Problem) avec dépôt fixe (la position actuelle du livreur). Pour N livraisons avec N < 20 (réaliste pour TFS), l'algorithme **Nearest Neighbor** (NN) donne une solution à ~20 % de l'optimal en O(N²), suffisant pour ce contexte.

Le TSP exact (algorithme de Held-Karp) serait O(N² × 2^N) — prohibitif dès N > 20. Le NN est le bon compromis pour une flotte solo.

#### Pseudocode de l'algorithme

```
function nearestNeighbor(depot, stops):
  unvisited = stops.copy()
  current = depot
  route = [depot]
  
  while unvisited is not empty:
    nearest = argmin(distance(current, stop) for stop in unvisited)
    route.append(nearest)
    unvisited.remove(nearest)
    current = nearest
  
  return route
```

#### Distance utilisée : matrice OSRM

Pour chaque paire (i, j) de points, on appelle l'API OSRM `/table` pour obtenir la matrice de durées réelles (trafic Tana, pas haversine). Fallback haversine × 1.4 si OSRM indisponible.

```typescript
// lib/routeOptimizer.ts

import { haversine } from './geo'
import { getOsrmDuration } from './osrm'

interface Stop {
  order_id: string
  lat: number
  lng: number
  label: string
}

interface Depot {
  lat: number
  lng: number
}

interface RouteStep {
  order_id: string | null  // null = dépôt
  lat: number
  lng: number
  label: string
  distance_from_prev_km: number
  duration_from_prev_min: number
  cumulative_distance_km: number
  cumulative_duration_min: number
}

export async function optimizeRoute(
  depot: Depot,
  stops: Stop[]
): Promise<{ sequence: RouteStep[], total_distance_km: number, total_duration_min: number }> {
  
  if (stops.length === 0) {
    return { sequence: [], total_distance_km: 0, total_duration_min: 0 }
  }
  
  // 1. Construire la matrice OSRM (ou fallback haversine)
  const allPoints = [depot, ...stops]
  const matrix = await buildDistanceMatrix(allPoints)
  
  // 2. Nearest Neighbor depuis le dépôt (index 0)
  const orderedIndices = nearestNeighborTSP(matrix, startIndex: 0, n: allPoints.length)
  
  // 3. Construire la réponse avec détails par étape
  let cumDist = 0
  let cumDur = 0
  const sequence: RouteStep[] = []
  
  for (let i = 1; i < orderedIndices.length; i++) {
    const fromIdx = orderedIndices[i - 1]
    const toIdx = orderedIndices[i]
    const stop = allPoints[toIdx] as Stop
    
    const { dist_km, dur_min } = matrix[fromIdx][toIdx]
    cumDist += dist_km
    cumDur += dur_min
    
    sequence.push({
      order_id: stop.order_id,
      lat: stop.lat,
      lng: stop.lng,
      label: stop.label,
      distance_from_prev_km: Math.round(dist_km * 10) / 10,
      duration_from_prev_min: Math.round(dur_min),
      cumulative_distance_km: Math.round(cumDist * 10) / 10,
      cumulative_duration_min: Math.round(cumDur),
    })
  }
  
  return {
    sequence,
    total_distance_km: Math.round(cumDist * 10) / 10,
    total_duration_min: Math.round(cumDur),
  }
}

async function buildDistanceMatrix(points) {
  // Tenter OSRM /table pour toute la matrice en un appel
  // OSRM /table?sources=0,1,2...&destinations=0,1,2...
  // Fallback : calculer haversine pour chaque paire
}

function nearestNeighborTSP(matrix, startIndex, n) {
  const visited = new Set([startIndex])
  const path = [startIndex]
  let current = startIndex
  
  while (visited.size < n) {
    let nearest = -1
    let minDur = Infinity
    
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && matrix[current][j].dur_min < minDur) {
        minDur = matrix[current][j].dur_min
        nearest = j
      }
    }
    
    visited.add(nearest)
    path.push(nearest)
    current = nearest
  }
  
  return path
}
```

#### Intégration OSRM `/table`

```
GET https://router.project-osrm.org/table/v1/driving/{lng1},{lat1};{lng2},{lat2};...
    ?sources=0,1,2&destinations=0,1,2&annotations=duration,distance
```

Retourne une matrice N×N de durées (secondes) et distances (mètres). Un seul appel HTTP pour toute la matrice = optimal pour N < 20.

**Fallback** si OSRM timeout (5s) : utiliser haversine × 1.4 pour les distances et distance / (20km/h) pour les durées.

---

### C.3 Sources de données pour les analytics

| Donnée | Source | Justification |
|---|---|---|
| KPIs du jour (4 compteurs) | Route handler GET /api/admin/kpis → requête SQL directe | Temps réel, légère, une seule requête |
| Graphique 30 jours | Route handler → vue `v_daily_revenue` | Agrégation en base, pas de calcul JS |
| Graphique 12 mois | Route handler → vue `v_monthly_revenue` | Idem, vue SQL précalculée |
| Liste clients | Route handler → vue `v_customers` | Vue SQL, pagination côté serveur |
| Flotte statuts | Supabase Realtime sur `vehicles` | Changements en temps réel |
| Optimisation trajet | Route handler POST → lib/routeOptimizer.ts | Calcul serveur (OSRM + NN) |

**Pas d'agrégation côté client** : les raw orders ne sont jamais téléchargés en masse pour calculer des stats — tout passe par les vues SQL ou les route handlers.

---

### C.4 Structure des composants React

```
/app
  admin/
    (protected)/
      layout.tsx              # MODIFIÉ : ajouter logo TFS dans le header
      page.tsx                # MODIFIÉ : ajouter KPI cards + liens nav vers nouvelles sections
      tarifs/
        page.tsx              # INCHANGÉ
      clients/
        page.tsx              # NOUVEAU : liste CRM
        [phone]/
          page.tsx            # NOUVEAU : fiche client
      analytics/
        page.tsx              # NOUVEAU : graphiques
      flotte/
        page.tsx              # NOUVEAU : liste véhicules
      tournee/
        page.tsx              # NOUVEAU : optimisation trajet
  api/
    admin/
      analytics/route.ts      # NOUVEAU : GET analytics agrégés
      customers/route.ts      # NOUVEAU : GET liste clients
      customers/[phone]/orders/route.ts  # NOUVEAU
      fleet/route.ts          # NOUVEAU : GET + POST véhicules
      fleet/[id]/route.ts     # NOUVEAU : PATCH véhicule
      kpis/route.ts           # NOUVEAU : GET KPIs du jour
      route-optimize/route.ts # NOUVEAU : POST optimisation

/components
  admin/
    OrderCard.tsx             # MODIFIÉ : + assignation véhicule + note
    OrdersList.tsx            # NOUVEAU : liste avec filtres avancés + export CSV
    KpiCards.tsx              # NOUVEAU : grille 4 KPIs
    RevenueChart.tsx          # NOUVEAU : graphique barres CA (vanilla canvas ou SVG)
    CustomerList.tsx          # NOUVEAU : liste CRM avec recherche
    CustomerCard.tsx          # NOUVEAU : fiche client expandable
    FleetList.tsx             # NOUVEAU : liste véhicules + statut
    VehicleCard.tsx           # NOUVEAU : card véhicule avec sélecteur statut
    TourneeView.tsx           # NOUVEAU : liste étapes + carte Leaflet
    TourneeMap.tsx            # NOUVEAU : carte Leaflet avec polyline tournée
    AdminHeader.tsx           # NOUVEAU : header avec logo + nav tabs
    AdminNav.tsx              # NOUVEAU : navigation tabs mobile-friendly

/lib
  routeOptimizer.ts           # NOUVEAU : algorithme NN + appel OSRM/table
  types.ts                    # MODIFIÉ : + Vehicle, RoutePlan, Customer, KpiData types
```

---

### C.5 Graphiques analytics — implémentation sans dépendance externe

Pour rester dans la contrainte "stack légère", les graphiques sont implémentés en **SVG pur** (pas de Chart.js, pas de Recharts). Une barre = un `<rect>` SVG calculé côté client à partir des données. Ceci évite ~200 KB de bundle supplémentaire.

```typescript
// components/admin/RevenueChart.tsx
// Reçoit rows: { label, revenue_ar }[]
// Calcule max = Math.max(...rows.map(r => r.revenue_ar))
// Pour chaque row : height = (revenue_ar / max) * CHART_HEIGHT
// Render : <svg> + <g> pour chaque barre + <text> pour labels
// Couleur : brand-red (#D81F26) pour les barres
// Tooltip : state hover sur rect → affiche infobulle positionnée
// Responsive : viewBox + preserveAspectRatio="xMidYMid meet"
```

---

### C.6 Navigation dashboard V2

Le dashboard actuel est une page unique. La V2 introduit une navigation par onglets (tabs) mobile-friendly en bas de l'écran (bottom navigation pattern) :

```
[ Commandes ] [ Clients ] [ Analytics ] [ Flotte ] [ Tournée ]
```

Sur desktop (≥ 768px) : sidebar gauche avec les mêmes onglets.

---

## D. Plan d'implémentation

### D.1 Stories ordonnées (STORY-25 et suivantes)

---

#### EPIC 7 — Logo et navigation V2

| Story | Description | Complexité | Dépendances |
|---|---|---|---|
| **STORY-25** | Logo TFS dans le dashboard et la landing | S | STORY-17, STORY-21 |
| **STORY-26** | Navigation admin V2 (tabs + AdminHeader) | M | STORY-25 |

---

#### EPIC 8 — Vue commandes enrichie

| Story | Description | Complexité | Dépendances |
|---|---|---|---|
| **STORY-27** | Filtres avancés et barre de recherche sur la liste commandes | M | STORY-18 |
| **STORY-28** | Export CSV commandes filtrées | S | STORY-27 |
| **STORY-29** | Note admin sur commande (PATCH étendu) | S | STORY-19 |

---

#### EPIC 9 — KPIs et Analytics

| Story | Description | Complexité | Dépendances |
|---|---|---|---|
| **STORY-30** | Route GET /api/admin/kpis + vues SQL (v_daily_revenue, v_monthly_revenue, v_customers) | M | STORY-01 (schéma) |
| **STORY-31** | KpiCards sur la page dashboard principal | M | STORY-30 |
| **STORY-32** | Page /admin/analytics + RevenueChart SVG (30 jours) | L | STORY-30, STORY-26 |
| **STORY-33** | Sélecteur période (jour/mois/année) sur analytics | M | STORY-32 |

---

#### EPIC 10 — CRM Clients

| Story | Description | Complexité | Dépendances |
|---|---|---|---|
| **STORY-34** | Route GET /api/admin/customers + vue v_customers | M | STORY-01 (schéma) |
| **STORY-35** | Page /admin/clients — liste avec recherche | M | STORY-34, STORY-26 |
| **STORY-36** | Fiche client /admin/clients/[phone] avec historique | M | STORY-35 |
| **STORY-37** | Export CSV clients | S | STORY-35 |

---

#### EPIC 11 — Gestion de flotte

| Story | Description | Complexité | Dépendances |
|---|---|---|---|
| **STORY-38** | Schéma SQL table vehicles + migration orders (vehicle_id, admin_note, completed_at) | M | STORY-01 |
| **STORY-39** | Routes API fleet (GET, POST, PATCH /api/admin/fleet) | M | STORY-38 |
| **STORY-40** | Page /admin/flotte — liste + modification statut | M | STORY-39, STORY-26 |
| **STORY-41** | Assignation commande → véhicule depuis OrderCard | M | STORY-38, STORY-39 |

---

#### EPIC 12 — Optimisation de trajet

| Story | Description | Complexité | Dépendances |
|---|---|---|---|
| **STORY-42** | lib/routeOptimizer.ts — algorithme NN + matrice OSRM /table + fallback haversine | XL | STORY-04 (lib/osrm.ts) |
| **STORY-43** | Route POST /api/admin/route-optimize + table route_plans | L | STORY-42, STORY-38 |
| **STORY-44** | Page /admin/tournee — liste colis du jour + bouton "Optimiser" | L | STORY-43, STORY-26 |
| **STORY-45** | TourneeMap — carte Leaflet avec polyline trajet optimisé | L | STORY-44, STORY-08 (LeafletMap) |
| **STORY-46** | Action "Livré" sur étape de tournée (PATCH status → done) | M | STORY-45 |

---

### D.2 Estimation de complexité — détail

| Taille | Critère | Stories |
|---|---|---|
| S (2–4h) | Composant unique, route simple, pas de nouvel algo | STORY-25, STORY-28, STORY-29, STORY-37 |
| M (1j) | Nouvelle page + route + composants standards | STORY-26, STORY-27, STORY-30, STORY-31, STORY-34, STORY-35, STORY-36, STORY-38, STORY-39, STORY-40, STORY-41, STORY-46 |
| L (2j) | Intégration complexe, état avancé, ou algo non trivial | STORY-32, STORY-33, STORY-43, STORY-44, STORY-45 |
| XL (3j) | Algorithme nouveau + intégration API externe + tests | STORY-42 |

**Total estimé : ~22 jours de développement** en implémentation séquentielle. En parallèle (epics 8+9 et 10+11 simultanés), réduit à ~14 jours.

---

### D.3 Chemin critique

```
STORY-25 (Logo) → STORY-26 (Nav)
      │
      ├── STORY-27 → STORY-28 → STORY-29     [Epic 8 : Commandes]
      │
      ├── STORY-38 (SQL migration)
      │       ├── STORY-30 (vues SQL + KPIs API) → STORY-31 → STORY-32 → STORY-33
      │       ├── STORY-34 → STORY-35 → STORY-36 → STORY-37   [Epic 10 : CRM]
      │       ├── STORY-39 → STORY-40 → STORY-41               [Epic 11 : Flotte]
      │       └── STORY-42 → STORY-43 → STORY-44 → STORY-45 → STORY-46  [Epic 12 : Trajet]
```

**Chemin critique réel** : STORY-38 (migration SQL) est le prerequis de toutes les epics 9, 10, 11, 12. À faire en premier après STORY-25/26.

**Parallélisme possible** :
- Epic 8 (commandes) est indépendant et peut démarrer dès STORY-26
- Epic 9 KPIs et Epic 10 CRM peuvent se développer en parallèle après STORY-38
- Epic 11 et Epic 12 peuvent se développer en parallèle après STORY-38

---

### D.4 Définition of Done — V2

Une story V2 est "done" quand :
1. Le code est fonctionnel et sans erreur TypeScript strict
2. Les critères d'acceptation de la user story sont satisfaits
3. La page est responsive : 360px (mobile Zo en course) et 1024px (desktop backoffice)
4. Les routes API sont protégées par auth guard Supabase
5. Aucune donnée sensible (clés, tokens) dans le code ou les réponses API
6. Lighthouse mobile ≥ 80 (les graphiques SVG peuvent légèrement impacter le score)

---

## E. Maquettes textuelles (ASCII)

### E.1 Layout dashboard principal V2

```
┌─────────────────────────────────────────────────────────┐
│  [LOGO TFS]          Taxi Fast Service      [Déconnex.] │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 48 500 Ar│ │  12 🏍️  │ │   8 📦  │ │   3 🛒  │  │
│  │  CA jour │ │  Courses │ │ Livraisons│ │  Devis  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Commandes du jour    [Actives (5)] [Toutes]           │
│  🔍 Rechercher...    [Taxi ▼] [Statut ▼]  [Export CSV] │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏍️ TAXI · Confirmée           14:32            │   │
│  │ Analakely → Ivandry · 3.2km · 18min            │   │
│  │ Hery Rakoto · 034 61 234 56                     │   │
│  │ Prix : 7 500 Ar · Moto principale assignée      │   │
│  │ [En course ▶] [Terminé ✓] [📞] [WhatsApp]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📦 COLIS · Contre-offre ⚠️      13:15          │   │
│  │ Analakely → Andohatapenaka · 4.1km              │   │
│  │ Lanto Ravelo · 033 12 456 78                    │   │
│  │ Proposé: 6 000 Ar  ◀▶  Contre: 5 000 Ar        │   │
│  │ [Confirmer ✓] [Annuler ✗] [📞] [WhatsApp]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Commandes] [Clients] [Analytics] [Flotte] [Tournée]  │
└─────────────────────────────────────────────────────────┘
```

---

### E.2 Vue analytics / KPIs

```
┌─────────────────────────────────────────────────────────┐
│  ← Analytics                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Aujourd'hui] [30 jours] [12 mois]                    │
│                                                         │
│  CA — 30 derniers jours                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                          ▐▌       │  │
│  │                              ▐▌  ▐▌   ▐▌▐▌ ▐▌    │  │
│  │             ▐▌  ▐▌  ▐▌  ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌    │  │
│  │  ▐▌  ▐▌ ▐▌ ▐▌▐▌ ▐▌▐▌▐▌▐▌ ▐▌▐▌ ▐▌▐▌▐▌▐▌▐▌▐▌▐▌    │  │
│  │──────────────────────────────────────────────────│  │
│  │  9/6  10/6  11/6  ...                  8/7       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  CA total 30j    │  │  Nb commandes    │            │
│  │  312 500 Ar      │  │  87 commandes    │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  Répartition par service (30j)                          │
│  🏍️ Taxi    ████████████████░░░░░░  52%  45 courses    │
│  📦 Colis   ████████░░░░░░░░░░░░░░  31%  27 livraisons │
│  🛒 Courses ██░░░░░░░░░░░░░░░░░░░░  17%  15 devis      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Commandes] [Clients] [Analytics] [Flotte] [Tournée]  │
└─────────────────────────────────────────────────────────┘
```

---

### E.3 Vue CRM clients

```
┌─────────────────────────────────────────────────────────┐
│  ← Clients                            [Export CSV]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 Rechercher par nom ou téléphone...                  │
│                                                         │
│  24 clients · triés par nb commandes                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Hery Rakoto       034 61 234 56                 │   │
│  │ 12 commandes · 87 500 Ar CA · Client depuis 12j │   │
│  │ Dernière : Taxi Analakely→Ivandry (hier)         │   │
│  │                           [📞] [WhatsApp] [→]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Lanto Ravelo      033 12 456 78                 │   │
│  │ 8 commandes · 52 000 Ar CA · Client depuis 23j  │   │
│  │ Dernière : Colis Andohatapenaka (aujourd'hui)    │   │
│  │                           [📞] [WhatsApp] [→]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Nirina Solo       032 98 765 43                 │   │
│  │ 3 commandes · 18 000 Ar CA · Client depuis 45j  │   │
│  │ Dernière : Courses Ivandry (il y a 3 jours)     │   │
│  │                           [📞] [WhatsApp] [→]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Commandes] [Clients] [Analytics] [Flotte] [Tournée]  │
└─────────────────────────────────────────────────────────┘
```

---

### E.4 Vue gestion de flotte

```
┌─────────────────────────────────────────────────────────┐
│  ← Flotte                           [+ Ajouter]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  2 véhicules                                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏍️  Moto principale         MOTO-ZO-01          │   │
│  │                                                  │   │
│  │  Statut : ● EN COURSE                           │   │
│  │  Assigné à : Commande #4f2a... (Taxi · 14:32)   │   │
│  │                                                  │   │
│  │  [Disponible] [En course ✓] [Maintenance]        │   │
│  │  [Hors service]                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🚲  Vélo livraison           VELO-ZO-01         │   │
│  │                                                  │   │
│  │  Statut : ○ DISPONIBLE                          │   │
│  │  Aucune commande assignée                        │   │
│  │                                                  │   │
│  │  [Disponible ✓] [En course] [Maintenance]        │   │
│  │  [Hors service]                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Formulaire d'ajout (plié par défaut) :                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [+ Ajouter un véhicule]                         │   │
│  │   Type : [Moto ◉] [Vélo ○]                      │   │
│  │   Nom : ________________                         │   │
│  │   Immat. : ________________                      │   │
│  │                               [Enregistrer]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Commandes] [Clients] [Analytics] [Flotte] [Tournée]  │
└─────────────────────────────────────────────────────────┘
```

---

### E.5 Vue optimisation de trajet

```
┌─────────────────────────────────────────────────────────┐
│  ← Tournée du 08/07/2026                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  8 colis confirmés aujourd'hui                          │
│                                                         │
│  Dépôt : [Ma position actuelle ⊕]                      │
│  Véhicule : [Vélo livraison ▼]                         │
│                                                [Optimiser ▶]
│                                                         │
│  ┌─────────────── CARTE LEAFLET ──────────────────┐   │
│  │                                                 │   │
│  │    ⊕ Départ                                    │   │
│  │     \                                          │   │
│  │      ① ──── ② ──── ③                          │   │
│  │                     \                          │   │
│  │                      ④ ──── ⑤                │   │
│  │                                                 │   │
│  │  [Trajet optimisé — polyline rouge sur OSM]    │   │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  Total tournée : 18.4 km · ~52 min                     │
│                                                         │
│  ① → Lanto Ravelo · Andohatapenaka                     │
│     1.2 km · 7 min depuis départ                       │
│     [Livré ✓]                                          │
│                                                         │
│  ② → Nirina Solo · Analakely                           │
│     2.8 km · 12 min depuis ①  (cumul: 4.0km · 19min)  │
│     [Livré ✓]                                          │
│                                                         │
│  ③ → Jean Randria · Ivandry                            │
│     3.1 km · 15 min depuis ②  (cumul: 7.1km · 34min)  │
│     [Livré ✓]                                          │
│                                                         │
│  ④ → Marie Rabe · Ampefiloha                           │
│     2.4 km · 11 min depuis ③  (cumul: 9.5km · 45min)  │
│     [Marquer comme livré]                              │
│                                                         │
│  ⑤ → Fara Raveloson · Behoririka                       │
│     4.2 km · 18 min depuis ④  (cumul: 13.7km · 63min) │
│     [Marquer comme livré]                              │
│                                                         │
│  [Sauvegarder la tournée]  [Exporter WhatsApp]         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Commandes] [Clients] [Analytics] [Flotte] [Tournée]  │
└─────────────────────────────────────────────────────────┘
```

---

## F. Décisions d'architecture — ADR V2

### ADR-004 : Graphiques en SVG pur — pas de bibliothèque charting

**Contexte** : Le dashboard a besoin de graphiques à barres pour les analytics.  
**Décision** : SVG pur avec React, pas de Chart.js, Recharts ou D3.  
**Raisons** :
- Maintien de la contrainte de légèreté (page < 200 KB chargée)
- Chart.js min = ~220 KB gzip ; Recharts = ~150 KB gzip — inacceptable sur 3G
- Les besoins sont simples (barres, pas de courbes complexes, pas d'animations avancées)
- SVG est rendu côté client sans hydratation lourde

**Compromis acceptés** :
- Le développement initial prend plus de temps qu'avec une librairie
- L'accessibilité des graphiques SVG doit être gérée manuellement (title, aria-label)
- Animations limitées (pas d'entrée fluide des barres)

---

### ADR-005 : Nearest Neighbor TSP plutôt que brute-force ou ILP

**Contexte** : L'optimisation de tournée doit fonctionner en < 2 secondes pour N < 20 points.  
**Décision** : Algorithme Nearest Neighbor avec matrice de durées OSRM.  
**Raisons** :
- TSP exact (Held-Karp) est O(N² × 2^N) — infaisable sur Edge Runtime Vercel pour N > 15
- NN donne ~80–90 % de l'optimal pour N < 20, suffisant pour une opération solo
- La matrice OSRM `/table` est un seul appel HTTP vs N(N-1)/2 appels individuels
- Le temps de réponse restera sous 3s même sur la connexion 3G de Zo

**Compromis acceptés** :
- Solution non-optimale à ~20 % en théorie (en pratique imperceptible pour Zo)
- OSRM demo API sans SLA — fallback haversine obligatoire (identique à l'existant)

---

### ADR-006 : Vue SQL pour les analytics plutôt que calcul côté serveur

**Contexte** : Les analytics nécessitent des agrégations sur potentiellement des milliers de commandes.  
**Décision** : Vues SQL PostgreSQL (`v_daily_revenue`, `v_monthly_revenue`, `v_customers`) appelées depuis les route handlers.  
**Raisons** :
- PostgreSQL est optimisé pour les GROUP BY / COUNT / SUM — les faire en JS serait inefficace
- Les vues sont précalculées à chaque appel (pas de materialized view nécessaire à ce stade)
- Évite de télécharger les raw orders côté client pour calculer des stats
- Supabase free tier : les requêtes analytiques restent légères sur une centaine de commandes

**Compromis acceptés** :
- Les vues doivent être mises à jour si le schéma `orders` change
- Performance à surveiller si le volume dépasse 10 000 commandes (envisager materialized views)

---

### ADR-007 : Bottom navigation tabs (mobile) + sidebar (desktop)

**Contexte** : Le dashboard V2 a 5 sections vs 1 actuellement. Navigation nécessaire.  
**Décision** : Bottom navigation bar sur mobile (≤ 768px), sidebar fixe sur desktop (> 768px).  
**Raisons** :
- Bottom nav = pattern natif mobile, accessible au pouce — clé pour Zo qui utilise le téléphone en roulant
- Sidebar sur desktop = standard backoffice — adapté au mode gestionnaire (Persona C)
- Pas de hamburger menu = navigation toujours visible = moins de taps

**Compromis acceptés** :
- La bottom nav occupe ~60px en bas de chaque page — l'espace utile est réduit
- Les icônes doivent être claires sans labels longs (contrainte d'espace)

---

## G. Checklist de migration — ordre d'exécution pour le développeur

```
[ ] 1. Exécuter le SQL de migration V2 dans Supabase (section B.5)
        → Vérifier : vehicles (2 lignes), v_daily_revenue retourne des données, v_customers ok
[ ] 2. STORY-25 : Copier /docs/logo.png dans /public/logo.png
        → Ajouter logo dans AdminLayout + Landing Hero
[ ] 3. STORY-26 : Créer AdminHeader + AdminNav (bottom tabs)
        → Tester 360px + 1024px
[ ] 4. STORY-30 : Route GET /api/admin/kpis + vues SQL
        → Tester avec des données de test
[ ] 5. STORY-31 : KpiCards sur page principale
        → Realtime via canal Supabase existant 'orders-admin'
[ ] 6. STORY-27 : Filtres avancés commandes (indépendant, peut se faire en parallèle)
[ ] 7. STORY-38 : Appliquer migration orders (vehicle_id, admin_note, completed_at)
[ ] 8. STORY-39 + STORY-40 : API Fleet + Page flotte
[ ] 9. STORY-34 + STORY-35 + STORY-36 : CRM (peut être parallèle avec flotte)
[ ] 10. STORY-32 + STORY-33 : Analytics graphiques
[ ] 11. STORY-42 : lib/routeOptimizer.ts (le plus complexe — prévoir 1 session dédiée)
[ ] 12. STORY-43 + STORY-44 + STORY-45 + STORY-46 : Tournée complète
[ ] 13. STORY-28, STORY-29, STORY-37, STORY-41 : Fonctionnalités SHOULD (parallélisables)
```

---

*Document BMAD V2 — Taxi Fast Service — Rédigé le 2026-07-08*  
*Continuité avec docs/01-analyst.md, 02-prd.md, 03-architecture.md, 04-po-backlog.md*  
*Prochaine étape : exécuter la checklist G, commencer par STORY-25 (Logo)*
