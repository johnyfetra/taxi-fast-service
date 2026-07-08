# STORY-03 : lib/pricing.ts — Moteur de calcul de prix
**Epic** : 1 — Moteur d'estimation (serveur)  
**Priorité** : P0  
**Dépendances** : STORY-01 (types)

---

## Contexte

Le calcul du prix est **côté serveur uniquement** et **pur** (sans effets de bord). Il doit être facile à tester unitairement. Le prix client est recalculé à chaque POST /api/orders — jamais repris du corps de la requête.

---

## Formule

```
taxi / colis :  max(min_price, base_price + distance_km × price_per_km + extras)
               arrondi au multiple de 500 Ar supérieur

courses :       prix fixe = min_price (devis), affiché comme "Prix sur devis"
```

### Extras colis
- Petit : 0 Ar de supplément
- Moyen : +2 000 Ar
- Grand : +5 000 Ar
- Multiplicateur quantité : extras × quantity (ex: 2 colis moyens = +4 000 Ar)

### Durée estimée (affichée au client)
```
duration_min = ceil(osrm_duration_seconds / 60 × 1.5 / 5) × 5
              (durée OSRM × 1,5 pour le trafic Tana, arrondie aux 5 min)
```

---

## Interface TypeScript

```typescript
// lib/types.ts — à ajouter
export interface PricingRule {
  service: 'taxi' | 'colis' | 'courses'
  base_price: number
  price_per_km: number
  min_price: number
  extras: Record<string, number>
}

export interface PriceInput {
  service: 'taxi' | 'colis' | 'courses'
  distance_km: number
  details?: {
    size?: 'petit' | 'moyen' | 'grand'
    quantity?: number
  }
}

export interface PriceResult {
  price: number
  breakdown: string  // ex: "3 000 + 4,2 km × 1 500 + moyen × 2 = 10 300 → 10 500"
}
```

---

## Fichier à créer : `lib/pricing.ts`

```typescript
export function roundTo500(n: number): number { ... }

export function calculatePrice(rule: PricingRule, input: PriceInput): PriceResult { ... }

export function calculateDuration(osrmSeconds: number): number { ... }
```

---

## Tests Vitest à écrire : `lib/pricing.test.ts`

```typescript
describe('calculatePrice', () => {
  it('taxi — trajet court sous le minimum', ...)     // 2km → 5 000 Ar min
  it('taxi — trajet normal', ...)                     // 5km → 3 000 + 7 500 = 10 500 Ar
  it('taxi — arrondi aux 500', ...)                  // résultat 10 300 → 10 500
  it('colis petit × 1', ...)                          // pas d'extra
  it('colis moyen × 3', ...)                          // +2 000 × 3
  it('colis grand × 1', ...)                          // +5 000
  it('courses — toujours min_price', ...)
  it('distance_km = 0', ...)                          // edge case
})

describe('calculateDuration', () => {
  it('1200s OSRM → 30 min', ...)                     // 1200 × 1.5 / 60 = 30
  it('arrondi aux 5 min', ...)                        // 1300s → 35 min
})
```

---

## Critères d'acceptation

- Given taxi 5 km, When calculatePrice est appelé, Then le résultat est 10 500 Ar (3 000 + 5×1 500 = 10 500, déjà multiple de 500)
- Given taxi 2 km, When le calcul donne 6 000 < min_price 5 000, Then le résultat est 6 000 Ar (max appliqué correctement)
- Given colis grand × 2, 3 km, When calculatePrice est appelé, Then extras = 5 000 × 2 = 10 000 inclus
- Given tous les tests Vitest, When `npm run test` est lancé, Then 100% passent
- Given le service `courses`, When calculatePrice est appelé, Then price = min_price (3 000 Ar), breakdown = "Devis"
