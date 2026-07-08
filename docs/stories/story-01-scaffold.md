# STORY-01 : Scaffold Next.js + Supabase + Env
**Epic** : 0 — Fondations  
**Priorité** : P0  
**Dépendances** : aucune

---

## Contexte

Projet greenfield. On initialise le monorepo Next.js 14 App Router avec TypeScript strict, Tailwind CSS, et on connecte Supabase (projet free). On crée le schéma SQL, le seed des tarifs, et on fournit le .env.example.

---

## Tâches

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias=@/*`
2. Installer dépendances :  
   `npm i @supabase/supabase-js @supabase/ssr zod`  
   `npm i -D vitest @vitejs/plugin-react`
3. Configurer `tsconfig.json` : `"strict": true`, path alias `@/*`
4. Configurer `tailwind.config.ts` : couleurs custom `brand-red`, `brand-black`, `brand-white`, `brand-gray`
5. Créer `/lib/supabase/client.ts`, `/lib/supabase/server.ts`, `/lib/supabase/admin.ts`
6. Créer `.env.example` avec toutes les variables requises
7. Exécuter le SQL de création + seed dans Supabase (console SQL ou migration)
8. Vérifier la connexion Supabase depuis une route test

---

## Fichiers à créer / modifier

- `tailwind.config.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/types.ts`
- `.env.example`
- `docs/sql/schema.sql` (schéma SQL complet + seed + RLS)

---

## .env.example à créer

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WHATSAPP_TOKEN=EAAx...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_RECIPIENT_NUMBER=261346143066
```

---

## tailwind.config.ts — couleurs à définir

```typescript
colors: {
  brand: {
    red:   '#D81F26',
    black: '#0D0D0F',
    white: '#FFFFFF',
    gray:  '#F7F7F8',
  }
}
```

---

## Critères d'acceptation

- Given le projet est cloné et `.env.local` rempli, When `npm run dev` est lancé, Then la page d'accueil Next.js s'affiche sans erreur
- Given le schéma SQL est exécuté, When on interroge `pricing_rules`, Then 3 lignes sont présentes (taxi, colis, courses)
- Given la RLS est activée, When on tente un SELECT sur `orders` sans auth, Then 0 lignes retournées (pas d'erreur, juste vide)
- Given `.env.example`, When un dev suit le README, Then il peut configurer son environnement sans aide

---

## Notes d'implémentation

- `lib/supabase/client.ts` → `createBrowserClient` (@supabase/ssr)
- `lib/supabase/server.ts` → `createServerClient` avec cookies Next.js
- `lib/supabase/admin.ts` → `createClient(url, SERVICE_ROLE_KEY)` — uniquement pour les route handlers, jamais exposé côté client
- `lib/types.ts` doit contenir : `Order`, `PricingRule`, `ServiceType`, `OrderStatus`
