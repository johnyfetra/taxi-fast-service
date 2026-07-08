# STORY-06 : POST /api/estimate — Route handler estimation
**Epic** : 1 — Moteur d'estimation  
**Priorité** : P0  
**Dépendances** : STORY-03, STORY-04

---

## Contexte

Route handler Next.js App Router. Reçoit coordonnées départ/arrivée + service + détails colis. Appelle OSRM (avec fallback), lit les pricing_rules en base, calcule le prix côté serveur. Répond en JSON. Jamais de secret exposé dans la réponse.

---

## `app/api/estimate/route.ts`

### Zod schema de validation

```typescript
const EstimateSchema = z.object({
  service: z.enum(['taxi', 'colis', 'courses']),
  pickup:  z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  dropoff: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  details: z.object({
    size:     z.enum(['petit', 'moyen', 'grand']).optional(),
    quantity: z.number().int().min(1).max(10).optional(),
  }).optional(),
})
```

### Logique

```
1. Lire le body JSON → valider avec EstimateSchema → 400 si échec
2. Si service === 'courses' → retourner { price: null, label: 'Prix sur devis', distance_km: null, duration_min: null }
3. getRoute(pickup, dropoff) — inclut fallback automatique
4. Lire pricing_rules[service] depuis Supabase (admin client, pas de cache côté serveur intentionnel)
5. calculatePrice(rule, { service, distance_km, details })
6. calculateDuration(osrmSeconds) — ou fallback si route.fallback
7. Retourner { distance_km, duration_min, price, fallback }
```

### Réponse 200

```typescript
{
  distance_km:  number | null,
  duration_min: number | null,
  price:        number | null,
  fallback:     boolean,
  label?:       'Prix sur devis'
}
```

### Gestion d'erreurs

- 400 : validation Zod → `{ error: "Données invalides", details: [...] }`
- 500 : tout autre cas → `{ error: "Erreur de calcul, veuillez réessayer" }` (pas de stack trace)

---

## Critères d'acceptation

- Given body valide taxi avec coordonnées Tana, When POST /api/estimate, Then 200 avec price > 0, distance_km > 0, duration_min > 0
- Given body invalide (service manquant), When POST /api/estimate, Then 400 avec message d'erreur en français
- Given OSRM indisponible (simulé), When POST /api/estimate, Then 200 avec fallback:true et estimation haversine
- Given service=courses, When POST /api/estimate, Then 200 avec `{ label: "Prix sur devis", price: null }`
- Given prix modifié en base, When POST /api/estimate est appelé, Then nouveau prix est utilisé (pas de cache stale)
