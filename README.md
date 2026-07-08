# Taxi Fast Service — MVP Web App

Taxi-moto & livraison express à Antananarivo (Madagascar). Landing page + module de commande avec estimation instantanée + dashboard admin realtime.

## Stack

- **Next.js 16** (App Router, TypeScript strict)
- **Tailwind CSS v4** — thème blanc/rouge (#D81F26)/noir (#0D0D0F)
- **Supabase** — Postgres, Auth, Realtime (free tier)
- **Leaflet + OpenStreetMap** — carte sans clé API
- **Photon (Komoot)** — géocodage sans clé
- **OSRM démo** — distance + durée (fallback haversine)
- **WhatsApp Cloud API (Meta)** — notifications admin

---

## Setup local

### 1. Prérequis

- Node.js >= 20
- Un projet Supabase free (supabase.com)

### 2. Cloner et installer

```bash
git clone <repo>
cd tfs
npm install
```

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Remplissez `.env.local` avec vos valeurs Supabase et WhatsApp (voir `.env.example`).

### 4. Schema SQL Supabase

Dans Supabase > **SQL Editor**, exécutez `docs/sql/schema.sql`.

Ce script crée :
- `pricing_rules` (tarifs avec seed)
- `orders` (commandes)
- RLS policies (lecture/écriture admin uniquement)
- Publication Realtime pour `orders`

### 5. Compte admin

Dans Supabase > **Authentication > Users**, créez un utilisateur email/password.

### 6. Son de notification admin

```bash
# Exemple — remplacez par votre fichier MP3 < 50 KB
curl -o public/notification.mp3 https://www.soundjay.com/buttons/beep-01a.mp3
```

### 7. Lancer en développement

```bash
npm run dev
# http://localhost:3000
```

---

## Tests

```bash
npm test            # 17 tests unitaires (pricing + validation)
npm run test:watch  # mode watch
```

---

## WhatsApp Cloud API

1. App Meta sur developers.facebook.com avec produit **WhatsApp**
2. Notez **Phone Number ID** + générez un token d'accès permanent
3. Créez le template `nouvelle_commande` (langue: `fr`, catégorie: `UTILITY`) avec 9 variables `{{1}}`…`{{9}}`
4. Attendez l'approbation Meta (1-3 jours ouvrables)
5. Renseignez `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_RECIPIENT_NUMBER` dans `.env.local`

> Si WhatsApp n'est pas configuré, la commande est quand même créée. Le dashboard realtime est le canal principal.

---

## Deploiement Vercel

```bash
git push origin main
```

1. vercel.com > New Project > importer le repo
2. Framework : Next.js (auto-detecte)
3. Settings > Environment Variables : ajouter toutes les variables de `.env.example`
4. Deploy

**Attention** : Vercel Hobby interdit l'usage commercial (ToS). Plan B : Cloudflare Pages ou Vercel Pro.

### Supabase free — ping hebdomadaire

Supabase free se met en pause après ~7 jours sans activite. Ajoutez un cron GitHub Actions :

```yaml
# .github/workflows/ping-supabase.yml
name: Ping Supabase
on:
  schedule:
    - cron: '0 8 * * 1'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s "${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}/rest/v1/" > /dev/null
```

---

## Structure

```
app/
  page.tsx                  Landing page (statique)
  commander/                Module de commande
  admin/                    Dashboard admin
  api/
    estimate/               POST - calcul tarif serveur
    orders/                 POST - creation commande
    orders/[id]/            PATCH - changement statut
    auth/signout/           POST - deconnexion

lib/
  types.ts                  Types partages
  pricing.ts                Calcul de prix (teste)
  geo.ts                    Haversine + fallback
  osrm.ts                   Client OSRM avec fallback
  photon.ts                 Geocodage Photon
  whatsapp.ts               Notification WhatsApp admin
  rateLimit.ts              Rate limiting IP
  validation.ts             Schemas Zod
  supabase/                 Clients browser/server/admin

docs/
  sql/schema.sql            Schema SQL + seed + RLS
  stories/                  Story files BMAD
  01-analyst.md             Analyse concurrentielle
  02-prd.md                 PRD + stories MoSCoW
  03-architecture.md        Architecture + ADR
  04-po-backlog.md          Backlog ordonne
```

---

## Contact

**Tel / WhatsApp** : 034 61 430 66
**Zone** : Antananarivo (Tana)
**Horaires** : Lundi-Vendredi 8h-17h
