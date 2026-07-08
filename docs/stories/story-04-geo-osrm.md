# STORY-04 : lib/geo.ts + lib/osrm.ts — Distance, durée, fallback
**Epic** : 1 — Moteur d'estimation (serveur)  
**Priorité** : P0  
**Dépendances** : STORY-01

---

## Contexte

L'app calcule distance + durée via OSRM démo. OSRM est une API tierce sans SLA — elle peut être lente ou indisponible. Un fallback haversine × 1,4 + durée = km/20kmh est **obligatoire**. La commande ne doit jamais être bloquée par une indisponibilité OSRM.

---

## `lib/geo.ts`

```typescript
export interface Coords { lat: number; lng: number }

// Distance à vol d'oiseau en km (formule haversine)
export function haversineKm(a: Coords, b: Coords): number { ... }

// Fallback complet si OSRM indisponible
export function fallbackRoute(a: Coords, b: Coords): { distance_km: number; duration_min: number } {
  const km = haversineKm(a, b) * 1.4
  const duration_min = Math.ceil(km / 20 / 5) * 5  // km/20kmh arrondi aux 5 min
  return { distance_km: Math.round(km * 10) / 10, duration_min }
}
```

---

## `lib/osrm.ts`

```typescript
const OSRM_BASE = 'https://router.project-osrm.org'
const TIMEOUT_MS = 5000

export interface RouteResult {
  distance_km: number
  duration_seconds: number  // brut OSRM, sera converti en pricing.ts
  fallback: boolean
}

export async function getRoute(origin: Coords, destination: Coords): Promise<RouteResult> {
  // 1. Construire l'URL OSRM
  // GET /route/v1/driving/{lng,lat};{lng,lat}?overview=false
  // 2. fetch avec AbortController timeout 5s
  // 3. Si succès : parser routes[0].distance (mètres → km) + routes[0].duration (secondes)
  // 4. Si timeout / erreur réseau / statut non-200 : logger le détail, retourner fallbackRoute() avec fallback: true
}
```

### URL OSRM
```
https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat}?overview=false
```
Note : OSRM attend longitude AVANT latitude.

---

## Critères d'acceptation

- Given deux coordonnées valides à Tana, When getRoute est appelé, Then distance_km et duration_seconds sont des nombres positifs
- Given OSRM répond en > 5s ou erreur réseau, When getRoute est appelé, Then le fallback haversine est retourné avec `fallback: true`
- Given deux points identiques, When haversineKm est appelé, Then le résultat est 0
- Given Analakely → Ivandry (~5 km réels), When haversineKm est appelé, Then le résultat est entre 3 et 6 km
- Given le fallback, When distance haversine est 3 km, Then distance_km retourné est 3 × 1,4 = 4,2 km
