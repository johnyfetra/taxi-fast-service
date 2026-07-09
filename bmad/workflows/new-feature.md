# Workflow — Nouvelle feature TFS

De la spec à la PR pour toute nouvelle fonctionnalité.

---

## Phase 1 — Analyse (Agent : Analyst)

**But :** Clarifier le besoin avant de toucher au code.

```
"En mode Analyst, analyse cette demande : [description]"
```

Livrables :
- User story complète
- États UI identifiés (loading, empty, error, success)
- Impact sur les portails (client / conducteur / admin)

---

## Phase 2 — Architecture (Agent : Architect)

**But :** Définir la structure technique avant de coder.

```
"En mode Architect, conçois la structure pour : [story]"
```

Livrables :
- Fichiers à créer / modifier
- Routes API nécessaires
- Changements Supabase (table / champs / RLS)

---

## Phase 3 — Implémentation (Agent : Developer)

**But :** Coder en respectant les conventions TFS.

```
"En mode Developer, implémente : [task]"
```

Checklist avant commit :
```bash
npx tsc --noEmit
npm run test
npm run build
# Tester : http://localhost:3000
```

---

## Phase 4 — Review (Agent : Reviewer)

**But :** Valider avant la PR.

```
"En mode Reviewer, relis ces fichiers : [liste]"
```

---

## Phase 5 — QA (Agent : QA)

```
"En mode QA, valide cette feature : [description]"
```

---

## Phase 6 — PR

```bash
git add [fichiers concernés]
git commit -m "feat: [description]"
git push -u origin feature/<nom>
```
