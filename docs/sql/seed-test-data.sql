-- ============================================================
-- TFS — Données de test
-- Antananarivo, Madagascar — 2026-07-08
-- ============================================================

-- CONDUCTEURS
insert into drivers (name, phone, type, status, notes) values
  ('Haja Rakoto',           '034 12 345 67', 'moto', 'disponible',  'Zone centre-ville et nord'),
  ('Tojo Ramiandrisoa',     '033 98 765 43', 'moto', 'en_course',   'Expérimenté livraison express'),
  ('Feno Razafindrakoto',   '034 56 789 01', 'velo', 'disponible',  'Zone Analakely / Isoraka'),
  ('Mamy Andriamaro',       '032 11 222 33', 'moto', 'hors_ligne',  null),
  ('Lala Rasolofonjatovo',  '034 77 888 99', 'moto', 'disponible',  'Disponible matin uniquement')
on conflict do nothing;

-- COMMANDES DE TEST (aujourd'hui, statuts actifs)
insert into orders (
  service, customer_name, customer_phone,
  pickup, dropoff,
  distance_km, duration_min,
  price_offered, details, status, created_at
) values

-- 1. Taxi — Analakely → Ivandry
(
  'taxi', 'Nirina Rakotobe', '034 22 111 00',
  '{"label":"Analakely, Place de la Démocratie","lat":-18.9137,"lng":47.5361}',
  '{"label":"Ivandry, Cité des 67 Ha","lat":-18.8900,"lng":47.5417}',
  3.2, 10, 7800,
  '{"pickup_schedule":"now"}',
  'confirmed',
  now() - interval '45 minutes'
),

-- 2. Taxi — Mahamasina → Ankorondrano (planifié)
(
  'taxi', 'Voahangy Andriantsoa', '033 55 444 22',
  '{"label":"Mahamasina, Stade Municipal","lat":-18.9200,"lng":47.5300}',
  '{"label":"Ankorondrano, Hypermarché Score","lat":-18.8950,"lng":47.5450}',
  4.1, 13, 9150,
  '{"pickup_schedule":"later","pickup_datetime":"2026-07-08T09:30:00"}',
  'client_accepted',
  now() - interval '2 hours'
),

-- 3. Colis petit — Tsaralalana → Behoririka
(
  'colis', 'Jean-Louis Rabemanantsoa', '034 88 776 55',
  '{"label":"Tsaralalana, Rue Pasteur","lat":-18.9050,"lng":47.5410}',
  '{"label":"Behoririka, Près du Parc Tsarasaotra","lat":-18.9150,"lng":47.5280}',
  2.4, 8, 4880,
  '{"size":"petit","quantity":1,"type_colis":"document","pickup_schedule":"now"}',
  'confirmed',
  now() - interval '30 minutes'
),

-- 4. Colis moyen — Ambohijatovo → Androndra
(
  'colis', 'Sahondra Ravalomanana', '032 44 333 11',
  '{"label":"Ambohijatovo, Annexe","lat":-18.9100,"lng":47.5330}',
  '{"label":"Androndra, Quartier résidentiel","lat":-18.8700,"lng":47.5500}',
  5.6, 17, 10720,
  '{"size":"moyen","quantity":1,"type_colis":"vetements","pickup_schedule":"now"}',
  'in_progress',
  now() - interval '1 hour'
),

-- 5. Colis grand — Isoraka → Ankadifotsy
(
  'colis', 'Patrick Andriamalala', '034 99 001 23',
  '{"label":"Isoraka, Avenue de l''Independance","lat":-18.9000,"lng":47.5290}',
  '{"label":"Ankadifotsy, Marché","lat":-18.9300,"lng":47.5250}',
  4.8, 15, 11760,
  '{"size":"grand","quantity":2,"type_colis":"electromenager","pickup_schedule":"later","pickup_datetime":"2026-07-08T10:00:00"}',
  'client_accepted',
  now() - interval '3 hours'
),

-- 6. Courses — Andohalo
(
  'courses', 'Marie-Claire Rakoto', '033 77 654 32',
  '{"label":"Andohalo, Cathédrale","lat":-18.9180,"lng":47.5350}',
  null,
  null, null, null,
  '{"description":"2 baguettes, 1L lait, tomates, oignons, savon Savon","quartier":"Analakely","type_courses":"epicerie"}',
  'confirmed',
  now() - interval '20 minutes'
),

-- 7. Taxi — Ambanidia → Tana Masoandro (planifié matin)
(
  'taxi', 'Rivo Randriamahazosoa', '034 11 987 65',
  '{"label":"Ambanidia, Lycée Français","lat":-18.9230,"lng":47.5420}',
  '{"label":"Tana Masoandro, Zone franche","lat":-18.8800,"lng":47.5600}',
  6.3, 19, 12450,
  '{"pickup_schedule":"later","pickup_datetime":"2026-07-08T08:00:00"}',
  'confirmed',
  now() - interval '4 hours'
),

-- 8. Colis petit — Ambohidahy → Anosy
(
  'colis', 'Hery Ramarolahy', '032 22 100 88',
  '{"label":"Ambohidahy, près CHU","lat":-18.9050,"lng":47.5380}',
  '{"label":"Anosy, Lac Anosy","lat":-18.9250,"lng":47.5350}',
  2.1, 7, 4520,
  '{"size":"petit","quantity":1,"type_colis":"medicaments","pickup_schedule":"now"}',
  'client_accepted',
  now() - interval '15 minutes'
);
