-- ============================================================
-- Taxi Fast Service — Schéma SQL Supabase
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Table des tarifs
create table if not exists pricing_rules (
  service      text primary key check (service in ('taxi','colis','courses')),
  base_price   int  not null,
  price_per_km int  not null,
  min_price    int  not null,
  extras       jsonb not null default '{}'
);

-- 2. Seed des tarifs initiaux
insert into pricing_rules (service, base_price, price_per_km, min_price, extras) values
  ('taxi',    3000, 1500, 5000, '{}'),
  ('colis',   2000, 1200, 4000, '{"moyen": 2000, "grand": 5000}'),
  ('courses',    0,    0, 3000, '{}')
on conflict (service) do nothing;

-- 3. Table des commandes
create table if not exists orders (
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
                 check (status in (
                   'client_accepted',
                   'client_countered',
                   'confirmed',
                   'in_progress',
                   'done',
                   'cancelled'
                 )),
  created_at     timestamptz not null default now()
);

-- 4. Index de performance
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_status_idx on orders(status);

-- 5. Row Level Security
alter table orders         enable row level security;
alter table pricing_rules  enable row level security;

-- L'API server utilise service_role (bypass RLS) — pas besoin de policy INSERT/public
-- L'admin authentifié peut lire et modifier

create policy "admin_select_orders" on orders
  for select
  using (auth.role() = 'authenticated');

create policy "admin_update_orders" on orders
  for update
  using (auth.role() = 'authenticated');

create policy "admin_select_pricing" on pricing_rules
  for select
  using (auth.role() = 'authenticated');

create policy "admin_update_pricing" on pricing_rules
  for update
  using (auth.role() = 'authenticated');

-- 6. Realtime — publier la table orders pour le dashboard
drop publication if exists supabase_realtime;
create publication supabase_realtime for table orders;

-- ============================================================
-- VÉRIFICATION
-- SELECT * FROM pricing_rules;
-- → 3 lignes attendues : taxi, colis, courses
-- ============================================================
