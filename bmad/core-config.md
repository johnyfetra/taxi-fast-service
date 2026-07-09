# BMAD Core Config — Taxi Fast Service

## Projet

- **Nom** : Taxi Fast Service (TFS)
- **Type** : App web MVP taxi-moto + livraison (Antananarivo, Madagascar)
- **Repo** : `/Users/macbook/Project/tfs`
- **Branche principale** : `main`

## Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Style | Tailwind CSS v4 |
| Base de données | Supabase (PostgreSQL + Realtime + RLS) |
| Cartes | Leaflet + OpenStreetMap |
| Geocoding | Photon (fallback : épingle carte) |
| Routing | OSRM (fallback : haversine × 1.4) |
| Notifications | WhatsApp Cloud API (fire-and-forget) |
| Tests | Vitest |
| Déploiement | Vercel |

## Charte graphique

- Blanc `#FFFFFF` · Rouge `#D81F26` · Noir `#0D0D0F`
- Police : sobre, lisible sur 3G, mobile-first

## Business rules critiques

- La commande ne confirme **JAMAIS** automatiquement — confirmation humaine par appel/WhatsApp
- Prix calculé **côté serveur** uniquement (jamais faire confiance au client)
- Fallbacks : OSRM → haversine × 1.4 ; Photon → épingle carte ; WhatsApp → ne bloque jamais la commande
- Rate limit : 3 commandes/h/IP
- Tel admin : +261 34 61 430 66

## Portails

| Route | Portail | Auth |
|---|---|---|
| `/commander` | Commande publique | Aucune |
| `/suivi/login` + `/suivi` | Suivi client | Phone + code 6 chiffres |
| `/chauffeur/login` + `/chauffeur` | App conducteur | Phone + PIN 4 chiffres |
| `/admin` | Back-office | Supabase Auth email/password |

## Supabase

- Project ID : `rmyvfqcqzzgewejtoqkm`
- URL : `https://rmyvfqcqzzgewejtoqkm.supabase.co`
- Region : eu-west-1

## Agents disponibles

| Agent | Fichier | Usage |
|---|---|---|
| Analyst | `agents/analyst.md` | Analyser une feature, rédiger les specs |
| Architect | `agents/architect.md` | Concevoir la structure technique |
| Developer | `agents/developer.md` | Implémenter une feature |
| Reviewer | `agents/reviewer.md` | Relire et valider le code |
| QA | `agents/qa.md` | Tester et rédiger les cas de test |

## Workflows disponibles

| Workflow | Usage |
|---|---|
| `workflows/new-feature.md` | Nouvelle feature de bout en bout |
| `workflows/bugfix.md` | Correction de bug |
| `workflows/pr-review.md` | Checklist avant PR |

## Environnement local

- App : `http://localhost:3000`
- Admin : `http://localhost:3000/admin/login`
- Login admin : `fetrajohny05@gmail.com` / `TFS@admin2026!`
- Démarrage : `npm run dev`
