# BMAD — Phase PO : Backlog ordonné
## Taxi Fast Service MVP

---

## Chemin critique (ordre d'implémentation)

Le chemin critique est la story "estimation + accept/refuse" (US-002 à US-006).
Toute l'architecture serveur (pricing, geo, osrm, whatsapp) doit précéder le front.

---

## Epics et stories ordonnées

### EPIC 0 — Fondations (infra, typage, BDD)
*Doit précéder toutes les autres stories.*

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-01** : Scaffold Next.js + Supabase + env | Init projet, .env.example, Supabase projet+schema SQL+seed, RLS | P0 |
| **STORY-02** : Design system tokens + composants UI | Tailwind config (couleurs, police), Button, Input, Badge, composants primitifs | P0 |

---

### EPIC 1 — Moteur d'estimation (serveur)
*Core business logic, testée unitairement avant tout front.*

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-03** : lib/pricing.ts | Formule prix, arrondi 500 Ar, extras colis, tests Vitest | P0 |
| **STORY-04** : lib/geo.ts + lib/osrm.ts | Haversine, appel OSRM, fallback auto, timeout 5s | P0 |
| **STORY-05** : lib/photon.ts | Geocoding autocomplete, reverse geocoding, timeout 5s, fallback | P0 |
| **STORY-06** : POST /api/estimate | Route handler, Zod validation, appel pricing+geo, réponse | P0 |

---

### EPIC 2 — Module de commande (front + intégration)

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-07** : Page /commander — stepper + ServiceSelector | Stepper 4 étapes, ServiceSelector 3 pastilles | P0 |
| **STORY-08** : Carte Leaflet + géoloc + épingles | dynamic import, bouton Ma position, markers draggables, OSM tiles | P0 |
| **STORY-09** : Recherche d'adresse (Photon autocomplete) | Composant AddressSearch, debounce 300ms, fallback épingle | P0 |
| **STORY-10** : Affichage estimation (appel /api/estimate) | EstimateCard, loading state, fallback "estimation approx." | P0 |
| **STORY-11** : PriceDecision + ContactForm + envoi | Boutons accept/counter, champ tarif, validation tel, POST /api/orders | P0 |
| **STORY-12** : ConfirmationScreen + bouton WhatsApp | Écran final, message wa.me pré-rempli, bouton Appeler | P0 |
| **STORY-13** : Options colis (taille + quantité) | Pastilles taille, stepper quantité, intégration dans l'estimation | P1 |
| **STORY-14** : Formulaire courses (devis) | Champs quartier + description libre, pas d'estimation auto | P1 |

---

### EPIC 3 — Backend commandes + notifications

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-15** : lib/whatsapp.ts + POST /api/orders | Création commande, recalcul prix serveur, rate limit, honeypot, notify WhatsApp fire-forget | P0 |
| **STORY-16** : PATCH /api/orders/[id] | Changement statut, auth guard, Zod | P1 |

---

### EPIC 4 — Dashboard admin

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-17** : Auth Supabase + /admin layout guard | Email/password login, session cookie, redirect si non auth | P0 |
| **STORY-18** : OrdersList realtime | Supabase Realtime subscription, son notification, badges statut, rouge si countered | P0 |
| **STORY-19** : Actions sur commande | Boutons Confirmer/En course/Terminé/Annuler, Appeler, WhatsApp | P1 |
| **STORY-20** : Onglet Tarifs (pricing_rules editor) | Formulaire édition tarifs, PATCH Supabase, validation | P1 |

---

### EPIC 5 — Landing page

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-21** : Landing complète | Hero, ServiceCards, HowItWorks, HorairesZone, Footer, Lighthouse ≥ 85 | P1 |

---

### EPIC 6 — Qualité + déploiement

| Story | Tâches | Priorité |
|---|---|---|
| **STORY-22** : Tests Vitest pricing + validation tel | Tests unitaires lib/pricing.ts + regex téléphone | P0 |
| **STORY-23** : README + .env.example + seed SQL | Documentation complète, déploiement reproductible | P1 |
| **STORY-24** : Audit Lighthouse + accessibilité | Labels, contraste AA, navigation clavier, score mobile ≥ 85 | P1 |

---

## Ordre d'exécution recommandé

```
STORY-01 → STORY-02
    ↓
STORY-03 → STORY-04 → STORY-05 → STORY-06  (parallélisables)
STORY-22  (tests, parallèle avec STORY-03)
    ↓
STORY-07 → STORY-08 → STORY-09 → STORY-10 → STORY-11 → STORY-12
STORY-15 (parallèle avec STORY-11)
    ↓
STORY-13, STORY-14  (parallélisables)
STORY-16            (parallèle)
    ↓
STORY-17 → STORY-18 → STORY-19 → STORY-20
    ↓
STORY-21
    ↓
STORY-23 → STORY-24
```

**Stories P0 = MVP viable** (commande taxi complète, dashboard basique, notifications)  
**Stories P1 = MVP complet** (colis, courses, tarifs, landing, README)
