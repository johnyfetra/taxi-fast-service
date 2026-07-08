# BMAD — Phase Analyst
## Taxi Fast Service MVP

---

## 1. Brief reformulé

**Qui** : Un opérateur solo (taxi-moto + livreur vélo) basé à Antananarivo, Madagascar.
**Quoi** : Une web-app mobile-first (pas d'app store) qui capte les commandes, calcule un tarif en temps réel et orchestre la négociation prix/confirmation via WhatsApp — sans aucun paiement en ligne.
**Pourquoi maintenant** : InDrive vient de s'installer à Tana (mai 2025) avec un plancher tarifaire de 10 000 Ar. Aucune app ne combine taxi-moto + livraison vélo dans une interface légère, sans installation, accessible sur connexion 3G.
**Comment** : Landing + module de commande (géoloc → carte → estimation → accept/counter) + dashboard admin realtime. Stack 100 % gratuite au démarrage (Next.js/Vercel free + Supabase free).
**Contraintes dures** :
- Zéro budget initial
- Flotte = 1 moto + 1 vélo (scalabilité hors périmètre MVP)
- Pas de paiement en ligne ni de compte client
- L'écran final ne confirme pas la course — un humain (appel/WhatsApp) confirme toujours
- Connexions 3G lentes, écrans 360 px

---

## 2. Hypothèses et questions ouvertes (max 5)

| # | Hypothèse / Question | Risque | Décision par défaut |
|---|---|---|---|
| H1 | Photon géocode correctement les quartiers de Tana (Analakely, Ivandry, Andohatapenaka…) | Moyen — noms de quartiers en malgache peu indexés | Implémenter l'épingle déplaçable comme source de vérité, autocomplete en fallback |
| H2 | OSRM calcule des routes valides dans Tana malgré la faible couverture OSM locale | Élevé — données OSM incomplètes pour Tana | Fallback haversine × 1,4, durée = km / 20 kmh obligatoire dès le départ |
| H3 | WhatsApp Cloud API template `nouvelle_commande` est approuvé rapidement par Meta | Moyen — délai 1–3 jours ouvrable | Dashboard realtime = canal principal ; WhatsApp = bonus, pas bloquant |
| H4 | Un seul admin (le propriétaire) utilise le dashboard depuis un mobile en course | Faible — confirmé dans le brief | Mobile-first même pour /admin, auth email/password simple |
| H5 | Vercel Hobby ToS (usage commercial interdit) sera toléré au démarrage — plan de bascule si trafic réel | Élevé à terme | Documenter le plan B (Cloudflare Pages) dès le README |

---

## 3. Analyse concurrentielle — marché VTC Antananarivo

### InDrive (international, arrivé mai 2025)
- Voiture uniquement, aucune moto ni livraison.
- Modèle : le client propose son prix, le chauffeur accepte ou contre-propose — friction élevée.
- **Plancher 10 000 Ar** = inaccessible pour les courses courtes (500–3 000 Ar de la moto-taxi).
- App native iOS/Android obligatoire ; incompatibilités signalées sur vieux Android à Tana.
- **Opportunité** : tout le segment court < 10 000 Ar leur échappe structurellement.

### PIQLA (anciennement "Pikla" dans le langage courant)
- "Pikla" = terme malgache pour taxi individuel, PIQLA en est le pendant digital.
- Flotte électrique, app native, partenariat Galana Madagascar.
- Voiture uniquement, **zéro moto, zéro livraison**.
- Positionnement premium/vert — prix plancher plus élevé que la moto-taxi.
- **Opportunité** : leur segment différent ; aucune concurrence directe sur la moto.

### Misy (le plus complet des apps locales)
- Seul concurrent avec une **catégorie moto** ; aussi : voiture, van, bajaj, taxi-be.
- Prix fixe affiché avant réservation, mobile money intégré, 24/7.
- **Pas de livraison/colis**, moto = feature secondaire dans une app car-first.
- App native = friction d'installation.
- **Opportunité** : se différencier sur la livraison (vélo/colis) et sur le zéro-friction (web, pas d'app).

### e-VTC by Esanandro
- Premium cars uniquement (4 000–5 000 Ar/km), WiFi, tablette.
- Multi-canal (web + téléphone + social) — bonne pratique à copier.
- Aucune moto, aucune livraison.

### Bilan — position différenciante de Taxi Fast Service

| Avantage | Détail |
|---|---|
| Prix | 1 000–3 000 Ar/km — segment hors portée de tous les apps actuels |
| Zéro installation | Mobile-web = accessible même sur vieux Android, sans data plan pour l'app store |
| Moto + vélo + livraison | Combinaison introuvable dans une seule interface digitale à Tana |
| Estimation instantanée | Affichage immédiat distance/durée/prix — réduit l'incertitude vs négociation InDrive |
| Légèreté | Page < 200 KB chargée, pas de JS lourd — déterminant sur 3G |
| Confirmation humaine | Paradoxalement rassurant dans un marché à faible confiance digitale |
