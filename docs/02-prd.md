# BMAD — Phase PM : Product Requirements Document
## Taxi Fast Service MVP

---

## 1. Personas

### Persona A — Hery, 28 ans, client mobile
- Habite Andohatapenaka, travaille à Analakely
- Téléphone : Android mid-range 2020, connexion Orange 3G intermittente
- Budget déplacement : 2 000–5 000 Ar par trajet
- Comportement : utilise WhatsApp tous les jours, ne télécharge pas d'apps inconnues
- Besoin : savoir le prix **avant** de commander, ne pas attendre une réponse longue
- Frustration actuelle : le tarif de la moto-taxi s'improvise, InDrive minimum trop cher

### Persona B — Zo, 34 ans, admin-chauffeur (le propriétaire)
- Utilise le dashboard sur son téléphone en roulant (arrêts brefs)
- Notification WhatsApp = canal d'alerte principal
- Besoin : voir immédiatement chaque nouvelle commande avec toutes les infos (départ, arrivée, prix)
- Besoin : confirmer ou négocier en un tap, puis appeler le client
- Frustration actuelle : commandes reçues uniquement par WhatsApp direct, pas de centralisation

---

## 2. User Stories priorisées MoSCoW

### MUST HAVE (MVP)

#### Epic 1 — Commande taxi avec estimation

**US-001** — Choix du service  
*En tant que Hery, je veux choisir entre Taxi-moto, Colis et Courses pour que la suite du formulaire s'adapte.*  
**Critères :**  
- Given je suis sur /commander, When je vois les 3 options, Then chacune est une pastille tactile (min 48px) avec icône + label  
- Given j'ai sélectionné un service, When je passe à l'étape suivante, Then le formulaire n'affiche que les champs pertinents

**US-002** — Détection automatique du point de départ  
*En tant que Hery, je veux que l'app détecte ma position automatiquement pour ne pas taper mon adresse de départ.*  
**Critères :**  
- Given je tape sur « Ma position », When le navigateur demande la permission, Then un message clair explique pourquoi (en français)  
- Given la permission est accordée, When la géoloc réussit, Then l'adresse reverse-geocodée s'affiche et l'épingle se place sur la carte  
- Given la géoloc échoue ou est refusée, When je vois l'erreur, Then le champ de recherche manuelle reste disponible sans blocage

**US-003** — Saisie du point d'arrivée  
*En tant que Hery, je veux rechercher mon adresse d'arrivée avec autocomplete.*  
**Critères :**  
- Given je tape 3+ caractères dans le champ arrivée, When Photon répond, Then des suggestions s'affichent sous le champ (max 5)  
- Given Photon est indisponible, When la recherche échoue, Then je peux cliquer sur la carte pour poser l'épingle manuellement  
- Given j'ai posé les deux épingles, When je les déplace, Then les coordonnées se mettent à jour en temps réel

**US-004** — Affichage de l'estimation  
*En tant que Hery, je veux voir la distance, le temps de trajet et le tarif avant de m'engager.*  
**Critères :**  
- Given départ et arrivée sont définis, When j'appuie sur « Estimer », Then l'app appelle POST /api/estimate et affiche distance (km), durée (min), prix (Ar)  
- Given OSRM est indisponible, When le fallback haversine est utilisé, Then l'estimation s'affiche quand même (mention « estimation approx. »)  
- Given le prix est affiché, When je lis le résultat, Then le tarif est arrondi aux 500 Ar, durée arrondie aux 5 min

**US-005** — Accept / Counter-offer  
*En tant que Hery, je veux accepter le tarif ou proposer le mien.*  
**Critères :**  
- Given le tarif est affiché, When j'appuie sur « J'accepte », Then le formulaire nom+téléphone s'affiche  
- Given le tarif est affiché, When j'appuie sur « Refuser / proposer », Then un champ numérique s'affiche pour entrer mon tarif  
- Given mon tarif est saisi, When je valide, Then le formulaire nom+téléphone s'affiche avec mon contre-offre enregistrée

**US-006** — Saisie nom + téléphone et envoi  
*En tant que Hery, je veux saisir mes coordonnées pour être rappelé.*  
**Critères :**  
- Given le formulaire nom+tel est visible, When je saisis, Then le téléphone est validé en temps réel (format 03X XX XXX XX)  
- Given tous les champs sont valides, When j'envoie, Then POST /api/orders est appelé et une page de confirmation s'affiche  
- Given l'envoi réussit, When je vois la confirmation, Then le bouton WhatsApp direct est visible avec message pré-rempli

#### Epic 2 — Commande colis

**US-007** — Options colis  
*En tant que Hery, je veux préciser la taille et le nombre de colis.*  
**Critères :**  
- Given j'ai sélectionné « Colis », When je suis sur l'étape détails, Then 3 pastilles de taille (petit/moyen/grand) et un stepper nombre (1–10) sont visibles  
- Given j'ai choisi taille + nombre, When l'estimation est calculée, Then l'extra de taille est inclus dans le prix serveur

#### Epic 3 — Commande courses (devis)

**US-008** — Formulaire devis  
*En tant que Hery, je veux décrire mes courses pour recevoir un devis.*  
**Critères :**  
- Given j'ai sélectionné « Courses », When je remplis le formulaire, Then seuls le quartier, une description libre et mes coordonnées sont demandés  
- Given j'envoie le formulaire, When la commande est créée, Then le statut est `client_accepted` et l'admin voit « Prix sur devis »

#### Epic 4 — Dashboard admin

**US-009** — Authentification admin  
*En tant que Zo, je veux me connecter de façon sécurisée au dashboard.*  
**Critères :**  
- Given je visite /admin sans être connecté, When je suis redirigé, Then je vois le formulaire email/password Supabase Auth  
- Given je me connecte avec de mauvaises credentials, When la tentative échoue, Then un message d'erreur clair s'affiche (pas de stack trace)

**US-010** — Liste commandes realtime  
*En tant que Zo, je veux voir les nouvelles commandes apparaître instantanément.*  
**Critères :**  
- Given je suis sur le dashboard, When une nouvelle commande arrive, Then elle apparaît sans refresh + son de notification  
- Given une commande a le statut `client_countered`, When je la vois, Then elle est en rouge avec la contre-offre ET le tarif proposé bien visibles côte à côte

**US-011** — Actions sur commande  
*En tant que Zo, je veux changer le statut d'une commande en un tap.*  
**Critères :**  
- Given je vois une commande, When je tape « Confirmer », Then PATCH /api/orders/:id est appelé et le statut passe à `confirmed`  
- Given je vois une commande, When je tape le bouton téléphone, Then `tel:+2610346143066` s'ouvre  
- Given je vois une commande, When je tape le bouton WhatsApp, Then `wa.me/261...` s'ouvre avec les infos pré-remplies

**US-012** — Notification admin (dashboard + WhatsApp)  
*En tant que Zo, je veux être notifié immédiatement sur mon téléphone à chaque commande.*  
**Critères :**  
- Given une commande est créée, When POST /api/orders réussit, Then Supabase Realtime pousse la commande au dashboard  
- Given WhatsApp API est configurée, When la commande est créée, Then le message template est envoyé (fire-and-forget)  
- Given WhatsApp échoue, When l'erreur est catchée, Then la commande est quand même créée et l'erreur est loguée côté serveur uniquement

**US-013** — Gestion des tarifs  
*En tant que Zo, je veux modifier les tarifs depuis le dashboard sans redéploiement.*  
**Critères :**  
- Given je suis sur l'onglet Tarifs, When je modifie un prix, Then un PATCH en base Supabase est fait et le nouveau tarif s'applique aux commandes suivantes  
- Given le tarif est modifié, When un client fait une estimation, Then le nouveau tarif est utilisé côté serveur

---

### SHOULD HAVE (post-MVP immédiat)

- US-014 : Historique commandes (filtre date, export CSV)
- US-015 : Notifications push PWA pour le dashboard (fallback si WhatsApp hors quota)
- US-016 : Page tarifs publique sur le site

### COULD HAVE

- US-017 : Stats journalières (revenus estimés, nb courses, nb livraisons)
- US-018 : Avis clients après course (lien SMS)

### WON'T HAVE (hors périmètre MVP)

- Paiement en ligne / mobile money
- Comptes clients / historique personnel
- App native (iOS/Android)
- Tracking GPS temps réel
- Multi-chauffeurs / gestion flotte

---

## 3. Périmètre MVP strict

Le MVP est terminé quand US-001 à US-013 sont livrées, validées par les critères ci-dessus, et que la Definition of Done globale (Lighthouse ≥ 85, RLS vérifié, README complet) est atteinte.
