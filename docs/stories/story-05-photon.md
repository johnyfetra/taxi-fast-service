# STORY-05 : lib/photon.ts — Geocoding + Reverse geocoding
**Epic** : 1 — Moteur d'estimation  
**Priorité** : P0  
**Dépendances** : STORY-01

---

## Contexte

Photon (photon.komoot.io) est une API de geocoding gratuite basée sur OSM, sans clé API. On l'utilise pour :
1. **Autocomplete** : l'utilisateur tape un nom de lieu → liste de suggestions
2. **Reverse geocoding** : coordonnées GPS → adresse lisible

Elle n'a pas de SLA et peut être lente sur des noms de quartiers malgaches peu indexés. Les fallbacks sont :
- Autocomplete : si Photon échoue, le champ reste vide (l'utilisateur peut placer l'épingle sur la carte)
- Reverse : si Photon échoue, afficher les coordonnées formatées en degrés décimaux

---

## `lib/photon.ts`

```typescript
const PHOTON_BASE = 'https://photon.komoot.io'
const TIMEOUT_MS = 5000

export interface PhotonFeature {
  label: string      // Nom formaté ex: "Analakely, Antananarivo"
  lat: number
  lng: number
}

// Autocomplete — retourne [] si erreur, jamais throw
export async function searchAddress(query: string, lang?: string): Promise<PhotonFeature[]>
// URL: /api?q={query}&limit=5&lang=fr&bbox=47.4,−19.0,47.7,−18.7
// bbox = bounding box Antananarivo pour réduire les faux positifs

// Reverse geocoding — retourne label ou coordonnées si erreur
export async function reverseGeocode(lat: number, lng: number): Promise<PhotonFeature | null>
// URL: /reverse?lat={lat}&lon={lng}&limit=1&lang=fr
```

### Parsing de la réponse Photon
```typescript
// features[i].properties.name + features[i].properties.city + country
// Construire label = `${name}, ${city}` ou fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
```

### bbox Antananarivo
```
lon_min=47.4, lat_min=-19.0, lon_max=47.7, lat_max=-18.7
```

---

## Critères d'acceptation

- Given la query "Analakely", When searchAddress est appelé, Then au moins un résultat avec lat/lng dans la bbox Tana est retourné
- Given Photon timeout, When searchAddress est appelé, Then `[]` est retourné (pas de throw)
- Given des coordonnées Tana valides, When reverseGeocode est appelé, Then un label non-vide est retourné
- Given Photon timeout sur reverse, When reverseGeocode est appelé, Then `null` est retourné
- Given la query est vide (""), When searchAddress est appelé, Then `[]` est retourné sans appel réseau
