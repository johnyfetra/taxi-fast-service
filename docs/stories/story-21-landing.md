# STORY-21 : Landing page — Design blanc/rouge/noir, Lighthouse ≥ 85
**Epic** : 5 — Landing page  
**Priorité** : P1  
**Dépendances** : STORY-02

---

## Contexte

La landing est une page statique (Server Component, aucun JS client), légère et rapide sur 3G. Elle reproduit l'identité visuelle du logo (chronomètre rouge/noir, "Fast" en italique, fond blanc). Slogan : "Rapide, Sûr, Confortable". CTA rouge "Commander" → /commander.

---

## Sections (ordre vertical)

### 1. Hero
- Fond blanc
- Logo SVG en haut (exporter depuis le PNG, ou utiliser une version SVG du logo)
- Titre H1 : **"Taxi-moto & livraison express à Tana"** — bold, noir
- Sous-titre : "Prix transparent dès la commande — confirmé par appel"
- CTA bouton rouge : **"Commander maintenant"** → /commander (min 56px de haut)
- Mention discrète : "Lundi–Vendredi 8h–17h"

### 2. Nos services (3 cartes)
```
[ 🏍️ Taxi-moto ]   [ 📦 Livraison colis ]   [ 🛒 Courses ]
Déplacements       Envoi de colis petit/    Liste de courses,
rapides à Tana     moyen/grand              prix sur devis
```
Fond card : blanc, bordure grise, icône rouge, titre bold noir, description gris.  
Chaque card a un CTA "Réserver" → /commander?service=taxi (ou colis/courses).

### 3. Comment ça marche (3 étapes)
Fond gris très clair (#F7F7F8)
```
① Choisissez    ② Votre prix s'affiche     ③ On vous contacte
votre service   instantanément             pour confirmer
```
Numéros en rouge, texte noir.

### 4. Zone et horaires
```
Zone : Antananarivo (Tana)
Horaires : Lundi–Vendredi, 8h–17h
Téléphone / WhatsApp : 034 61 430 66
```

### 5. Footer noir (#0D0D0F)
- Logo petit blanc
- Téléphone : 034 61 430 66 (lien tel:)
- WhatsApp : bouton vert wa.me/261346143066
- Facebook : lien externe (placeholder)
- Copyright

---

## Exigences techniques

- **Zéro JS client** : page.tsx est un Server Component pur
- **Image logo** : `<Image>` Next.js optimisé, `priority`, format WebP
- **Pas de librairie UI lourde**
- **meta tags** : title, description, og:title, og:description, og:image

---

## Critères d'acceptation

- Given la landing sur Chrome mobile 360px, When je charge la page, Then Lighthouse Performance ≥ 85, Accessibility ≥ 90
- Given le CTA "Commander maintenant", When je tape dessus, Then je suis redirigé vers /commander
- Given le footer, When je tape sur le numéro de téléphone, Then `tel:+261346143066` s'ouvre
- Given le footer, When je tape sur le bouton WhatsApp, Then `https://wa.me/261346143066` s'ouvre
- Given la section services, When je tape "Réserver" sur la card Colis, Then j'arrive sur /commander?service=colis
- Given la page, When je l'inspecte, Then aucun `<script>` client non-Next n'est présent dans le HTML
