# STORY-17 : Auth Supabase + /admin layout guard
**Epic** : 4 — Dashboard admin  
**Priorité** : P0  
**Dépendances** : STORY-01

---

## Contexte

Un seul compte admin (email/password). Supabase Auth gère les sessions. Le layout /admin vérifie la session côté serveur et redirige vers /admin/login si non authentifié. Mobile-first : la page de login est parfaite sur 360px.

---

## Fichiers à créer

### `app/admin/login/page.tsx`
- Formulaire email + password
- Appel `supabase.auth.signInWithPassword()`
- Erreur : "Email ou mot de passe incorrect" (message générique)
- Redirect vers /admin après succès
- Bouton "Se connecter" : rouge, min 48px

### `app/admin/layout.tsx`
```typescript
// Server Component
// 1. Lire la session via createServerClient + cookies
// 2. Si pas de session → redirect('/admin/login')
// 3. Sinon → render children
```

### `app/admin/page.tsx`
- Shell du dashboard (sera complété en STORY-18)

---

## Variables d'env utilisées
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Critères d'acceptation

- Given je visite /admin sans session, When la page charge, Then je suis redirigé vers /admin/login
- Given je suis sur /admin/login avec les bonnes credentials, When je me connecte, Then je suis redirigé vers /admin
- Given mauvaises credentials, When la tentative échoue, Then "Email ou mot de passe incorrect" s'affiche (pas de stack trace)
- Given je suis connecté, When je visite /admin, Then la page s'affiche (pas de redirect loop)
- Given le bouton "Se connecter", When il est rendu, Then min-height 48px, fond rouge #D81F26

---

## Note sécurité

Ne jamais log les credentials. La session est gérée par Supabase via cookie httpOnly — ne pas stocker de token dans localStorage.
