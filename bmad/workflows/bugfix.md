# Workflow — Correction de bug TFS

---

## Étape 1 — Documenter le bug

Questions clés :
- Reproductible en local (`http://localhost:3000`) ?
- Quel portail ? (client / conducteur / admin)
- Erreur côté client (UI) ou serveur (API / Supabase) ?
- Logs : console navigateur ? logs Vercel ?

---

## Étape 2 — Identifier la cause

```bash
# Logs locaux
npm run dev
# → Console navigateur
# → Terminal Next.js

# Logs Vercel (prod)
vercel logs
```

Si erreur Supabase → vérifier RLS + logs Supabase dashboard.
Si erreur API → vérifier la route dans `app/api/`.
Si erreur UI → vérifier le composant React.

---

## Étape 3 — Branche fix

```bash
git checkout -b fix/<nom-du-bug>
```

---

## Étape 4 — Corriger

```
"En mode Developer, corrige ce bug : [description + fichier suspect]"
```

Vérifier :
- Le bug est corrigé
- Pas de régression sur les autres portails
- Business rules respectées (prix serveur, fallbacks, WhatsApp non-bloquant)

---

## Étape 5 — PR

```bash
git commit -m "fix: [description]"
git push -u origin fix/<nom-du-bug>
```
