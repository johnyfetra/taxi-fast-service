# STORY-18 : Dashboard admin — OrdersList realtime
**Epic** : 4 — Dashboard admin  
**Priorité** : P0  
**Dépendances** : STORY-15, STORY-17

---

## Contexte

Le dashboard affiche les commandes du jour en temps réel via Supabase Realtime. Quand une nouvelle commande arrive, elle apparaît instantanément + son de notification. Les commandes `client_countered` sont en rouge avec la contre-offre bien visible. Mobile-first : utilisé sur un téléphone en course.

---

## Composants à créer

### `app/admin/page.tsx`

```typescript
// 'use client' (subscriptions Realtime)
// 1. Charger les commandes du jour à l'init (SELECT * FROM orders WHERE created_at >= today ORDER BY created_at DESC)
// 2. Souscrire à supabase.channel('orders').on('postgres_changes', { event: 'INSERT' }, handler)
// 3. Quand INSERT reçu → prepend à la liste + jouer le son de notification
// 4. Cleanup de la subscription au unmount
```

### `components/admin/OrderCard.tsx`

```typescript
interface OrderCardProps {
  order: Order
  onStatusChange: (id: string, status: OrderStatus) => void
}
```

**Affichage par ordre de priorité :**
1. Service + statut badge
2. Si `client_countered` : afficher côte à côte "Proposé : X Ar" (gris) vs "Contre-offre : Y Ar" (rouge bold)
3. Départ → Arrivée
4. Distance + Durée
5. Nom client + Téléphone
6. Boutons action : Confirmer / En course / Terminé / Annuler + Appeler (tel:) + WhatsApp (wa.me)

### `components/admin/NotificationSound.tsx`

```typescript
// 'use client'
// Jouer /public/notification.mp3 via new Audio() quand triggered
// Gérer l'autoplay policy (les navigateurs bloquent l'audio sans interaction utilisateur)
// Solution : jouer le son uniquement après la première interaction (click) de l'utilisateur sur la page
```

---

## Actions sur commande (`PATCH /api/orders/[id]`)

```typescript
// app/api/orders/[id]/route.ts
// Auth guard : vérifier session Supabase
// Zod : { status: z.enum(['confirmed', 'in_progress', 'done', 'cancelled']) }
// UPDATE orders SET status = $1 WHERE id = $2
// Return { id, status }
```

---

## Critères d'acceptation

- Given le dashboard est ouvert, When une nouvelle commande est créée, Then elle apparaît sans refresh dans les 2 secondes
- Given une commande `client_countered` est dans la liste, When je la vois, Then la contre-offre est en rouge bold, le tarif proposé est en gris à côté
- Given je tape "Confirmer" sur une commande, When le PATCH réussit, Then le badge passe à "Confirmée" immédiatement dans l'UI
- Given le bouton "Appeler", When je tape dessus, Then `tel:+2610346143066` est ouvert
- Given le dashboard sur viewport 360px, When je scrolle, Then aucun overflow horizontal, chaque OrderCard est lisible
- Given je ne suis pas connecté, When j'appelle PATCH /api/orders/:id, Then 401 est retourné

---

## Son de notification

Télécharger un son court (< 50 KB, format mp3) et le placer dans `/public/notification.mp3`.  
Suggestion : bell notification, 0.5 seconde.
