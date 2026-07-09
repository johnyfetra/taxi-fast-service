# BMAD — Taxi Fast Service

**B**reakthrough **M**ethod for **A**gile AI-**D**riven Development

Adapté pour le projet TFS — app web taxi-moto + livraison à Antananarivo.

---

## Principe

BMAD structure l'utilisation de l'IA en activant des **agents spécialisés** selon la phase de travail.

```
BESOIN → Analyst → Architect → Developer → Reviewer → QA → PR
```

---

## Comment activer un agent

Dans ta conversation avec Claude, préfixe ta demande par :

```
"En mode [Analyst|Architect|Developer|Reviewer|QA|Bugfix], ..."
```

Exemples :
```
"En mode Analyst, le client veut voir sa commande en temps réel"
"En mode Architect, conçois la page GPS conducteur"
"En mode Developer, implémente le deeplink Google Maps dans la fiche commande"
"En mode Reviewer, relis les fichiers que je viens de modifier"
```

---

## Agents disponibles

| Agent | Rôle | Quand l'utiliser |
|---|---|---|
| **Analyst** | Clarifier les besoins | Avant de commencer une feature |
| **Architect** | Concevoir la structure | Après l'analyse, avant le code |
| **Developer** | Implémenter | Phase de code |
| **Reviewer** | Relire le code | Avant chaque commit/PR |
| **QA** | Tester et valider | Après l'implémentation |

Définitions complètes dans `agents/`.

---

## Workflows disponibles

| Workflow | Usage |
|---|---|
| `workflows/new-feature.md` | De la spec à la PR pour une nouvelle feature |
| `workflows/bugfix.md` | Identifier → corriger → vérifier |
| `workflows/pr-review.md` | Checklist avant push |

---

## Portails de l'app

| URL | Qui | Auth |
|---|---|---|
| `/commander` | Client | Aucune |
| `/suivi` | Client | Phone + code 6 chiffres |
| `/chauffeur` | Conducteur | Phone + PIN 4 chiffres |
| `/admin` | Admin | Supabase Auth |
