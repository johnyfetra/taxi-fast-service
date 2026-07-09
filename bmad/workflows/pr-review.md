# Workflow — PR Review TFS

Checklist à passer avant tout push sur `main`.

---

## 1. Code

```bash
npx tsc --noEmit          # Pas d'erreurs TypeScript
npm run test              # Tests Vitest passent
npm run build             # Build Next.js OK
```

---

## 2. Review manuelle

```
"En mode Reviewer, relis ce diff : [fichiers modifiés]"
```

Points critiques :
- [ ] Aucune clé secrète dans le code client
- [ ] Prix calculé côté serveur uniquement
- [ ] WhatsApp non-bloquant (try/catch)
- [ ] Fallbacks OSRM → haversine présents
- [ ] RLS Supabase respecté
- [ ] Mobile-first, 3G-compatible

---

## 3. Test navigateur

- [ ] `/commander` : flow complet de commande
- [ ] Portail(s) impacté(s) par la feature
- [ ] Responsive mobile (DevTools → iPhone SE)

---

## 4. Commit et push

```bash
git status                          # Vérifier les fichiers
git add [fichiers concernés]        # Pas de .env !
git commit -m "feat|fix|chore: [description]"
git push -u origin feature/<nom>
```

---

## 5. PR sur GitHub

- Titre clair : `feat: GPS deeplink conducteur`
- Description : ce qui change + comment tester
- Branche cible : `main`
