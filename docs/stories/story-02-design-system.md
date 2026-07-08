# STORY-02 : Design System — Tokens + Composants UI
**Epic** : 0 — Fondations  
**Priorité** : P0  
**Dépendances** : STORY-01

---

## Contexte

Charte graphique : blanc dominant (#FFFFFF), rouge accent (#D81F26), noir (#0D0D0F), gris très clair (#F7F7F8).  
Logo : "TAXI" rectangle rouge + "Fast" italique rouge sur bande noire + chronomètre.  
Slogan : "Rapide, Sûr, Confortable".  
Typographie : Inter (system fallback), titres marketing en `font-bold italic` classe Tailwind.  
Mobile-first strict : tout parfait à 360px. Boutons min 48px de haut.

---

## Composants à créer

### `/components/ui/Button.tsx`
```typescript
// Variantes : primary (rouge), secondary (contour), ghost
// Taille : sm | md | lg (lg = min-h-12)
// Props : variant, size, loading, disabled + tous HTMLButtonElement props
```

### `/components/ui/Input.tsx`
```typescript
// Label visible, message d'erreur, état disabled
// Border rouge si error, border-gray-300 sinon
// Accessibilité : htmlFor/id, aria-describedby sur l'erreur
```

### `/components/ui/Badge.tsx`
```typescript
// Couleurs par statut :
// client_accepted → gris
// client_countered → rouge
// confirmed → bleu
// in_progress → orange
// done → vert
// cancelled → gris foncé
```

### `/components/ui/Card.tsx`
```typescript
// Fond blanc, border gris léger, rounded-xl, shadow-sm
// Padding responsive
```

### `/components/ui/Stepper.tsx`
```typescript
// n étapes numérotées, étape courante en rouge, passées en noir check
// Mobile : linear horizontal scroll si > 4 étapes
```

---

## CSS global (`app/globals.css`)

```css
/* Variables custom */
:root {
  --brand-red: #D81F26;
  --brand-black: #0D0D0F;
  --brand-white: #FFFFFF;
  --brand-gray: #F7F7F8;
}

/* Focus ring accessible */
*:focus-visible {
  outline: 2px solid var(--brand-red);
  outline-offset: 2px;
}

/* Titres marketing */
.heading-marketing {
  @apply font-bold italic tracking-tight;
}
```

---

## Critères d'acceptation

- Given le composant Button est rendu, When il a `variant="primary"`, Then fond rouge #D81F26, texte blanc, hauteur min 48px, border-radius 12px
- Given le composant Button est rendu, When `loading={true}`, Then un spinner s'affiche et le bouton est `disabled`
- Given le composant Input est rendu avec une erreur, When le message d'erreur est affiché, Then il a `role="alert"` et l'input a `aria-describedby` pointant vers lui
- Given le composant Badge est rendu avec `status="client_countered"`, When affiché, Then fond rouge, texte blanc
- Given un écran 360px, When tous les composants sont rendus, Then aucun overflow horizontal

---

## Notes d'implémentation

- Ne pas utiliser de librairie UI lourde (no shadcn pour le MVP, no MUI)
- Tailwind `clsx` ou `cn()` helper pour les classes conditionnelles
- Tous les composants sont des Server Components sauf si `onClick` ou state — dans ce cas `'use client'`
- Exporter depuis `/components/ui/index.ts`
