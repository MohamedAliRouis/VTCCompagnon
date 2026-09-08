# Roadmap — VTC Compagnon

> Application compagnon pour chauffeurs VTC. Suivi de courses, revenus et statistiques.
> Développement itératif, feature par feature.

---

## Légende

| Icône | Signification |
|-------|---------------|
| 🟢 | Priorité haute |
| 🟡 | Priorité moyenne |
| 🔵 | Priorité basse |
| ✅ | Terminé |
| 🚧 | En cours |
| 📋 | À faire |

---

## Phase 1 — Fondations (✅ Terminé)

| Feature | Statut | Notes |
|---------|--------|-------|
| Structure projet React Native | ✅ | TypeScript, ESLint, Prettier |
| Navigation bottom tabs | ✅ | Accueil / Historique / Réglages |
| State management Zustand | ✅ | 4 stores : course, session, stats, settings |
| Widget flottant Android | ✅ | 3 états, déplaçable, chronomètre natif |
| Tableau de bord | ✅ | État actuel, activité du jour, contrôle de l'overlay |
| Persistance AsyncStorage | ✅ | Sauvegarde locale, reset minuit |
| Écrans Historique + Réglages | ✅ | Stats 7 jours, tarifs modifiables |

---

## Phase 2 — Expérience Widget (🟢 Priorité)

### 2.1 Widget Android natif (overlay)
**Objectif** : Widget toujours visible au-dessus des autres apps

| Tâche | Statut | Détails |
|-------|--------|---------|
| Permission `SYSTEM_ALERT_WINDOW` | ✅ | Demande utilisateur depuis le tableau de bord |
| Service Android natif | ✅ | Service Kotlin au premier plan |
| Communication React Native ↔ Native | ✅ | État et actions synchronisés dans les deux sens |
| Widget réduit (mini mode) | 📋 | Barre compacte avec chrono |
| Redimensionnement / position | ✅ | Position restaurée et limitée à l'écran |

**Critères d'acceptation** :
- [ ] Widget visible même si app fermée
- [x] Boutons fonctionnels dans l'overlay
- [ ] Pas de fuite mémoire sur longue durée

---

### 2.2 Alertes pause/repos
**Objectif** : Prévenir la fatigue du chauffeur

| Tâche | Statut | Détails |
|-------|--------|---------|
| Session de travail persistante | ✅ | Début, fin, pause et reprise |
| Timer de conduite continue | ✅ | Temps de service hors pauses |
| Notification "Prenez une pause" | 📋 | Après X heures (configurable) |
| Historique des pauses | 📋 | Enregistre temps de repos |
| Statistiques bien-être | 📋 | Temps de conduite vs pause par jour |

**Règles métier** :
- Alerte après 2h de conduite continue
- Recommandation pause toutes les 45 min si en course
- Pause minimale suggérée : 15 min

---

## Phase 3 — Données & Sync (🟡 Priorité)

### 3.1 Backup cloud
**Objectif** : Sauvegarde automatique des données

| Tâche | Statut | Détails |
|-------|--------|---------|
| Intégration Google Drive | 📋 | Backup quotidien automatique |
| Export manuel | 📋 | Bouton "Sauvegarder maintenant" |
| Restauration | 📋 | Récupérer données sur nouveau téléphone |
| Chiffrement | 📋 | Données chiffrées avant envoi |

**Options cloud** : Google Drive (préféré), Dropbox, ou Firebase

---

### 3.2 Multi-appareils
**Objectif** : Synchronisation téléphone ↔ tablette

| Tâche | Statut | Détails |
|-------|--------|---------|
| Compte utilisateur | 📋 | Email + mot de passe (Firebase Auth) |
| Sync temps réel | 📋 | Firestore ou Supabase |
| Résolution conflits | 📋 | Dernier écrit gagne, ou choix utilisateur |
| Mode hors ligne | 📋 | File d'attente sync quand réseau revient |

---

## Phase 4 — GPS & Précision (🟡 Priorité)

### 4.1 Distance en temps réel
**Objectif** : Afficher km parcourus pendant la course

| Tâche | Statut | Détails |
|-------|--------|---------|
| Permission GPS fine | 📋 | `ACCESS_FINE_LOCATION` |
| Tracking en arrière-plan | 📋 | Foreground service Android |
| Calcul distance | 📋 | Haversine ou API Google |
| Affichage widget | 📋 | Distance + temps + revenu |
| Historique trajet | 📋 | Liste points GPS (optionnel) |

**Impact batterie** : Optimisation nécessaire (intervalle 10s, pas continu)

---

### 4.2 Calcul revenu amélioré
**Objectif** : Revenu = base + temps + distance

| Tâche | Statut | Détails |
|-------|--------|---------|
| Formule tarifaire complète | 📋 | `priseEnCharge + (min × €/min) + (km × €/km)` |
| Tarifs par zone | 📋 | Paris centre vs banlieue (optionnel) |
| Majoration nuit | 📋 | +X% entre 22h et 6h (configurable) |
| Majoration dimanche/jour férié | 📋 | Optionnel |

---

## Phase 5 — Monétisation (🔵 Priorité)

### 5.1 Modèle Freemium
**Suggestion** : Version gratuite limitée, Premium complète

| Gratuit | Premium |
|---------|---------|
| 10 courses / jour max | Courses illimitées |
| Historique 7 jours | Historique illimité |
| Widget basique | Widget personnalisable |
| Backup local | Backup cloud auto |
| — | Statistiques avancées |
| — | Export PDF comptable |
| — | Support prioritaire |

**Prix suggéré** : 4,99€/mois ou 49,99€/an

### 5.2 Implémentation
| Tâche | Statut | Détails |
|-------|--------|---------|
| Achats intégrés (Google Play) | 📋 | `react-native-iap` |
| Écran "Passer Premium" | 📋 | Avantages clairement listés |
| Restauration achats | 📋 | Sur nouveau téléphone |
| Période d'essai | 📋 | 7 jours gratuits |

---

## Phase 6 — Polish & Divers (🔵 Priorité)

| Feature | Statut | Notes |
|---------|--------|-------|
| Thème clair complet | 📋 | Adaptation couleurs, contrastes |
| Animations transitions | 📋 | Entre états du widget |
| Sons / vibrations | 📋 | Feedback actions importantes |
| Support iOS | 📋 | Test complet, adaptation permissions |
| Widget iOS (WidgetKit) | 📋 | Équivalent overlay iOS |

---

## Planning indicatif

| Sprint | Durée | Contenu |
|--------|-------|---------|
| Sprint 1 | 2 sem | Widget overlay natif |
| Sprint 2 | 1 sem | Alertes pause/repos |
| Sprint 3 | 2 sem | Backup cloud |
| Sprint 4 | 2 sem | GPS + distance |
| Sprint 5 | 1 sem | Calcul revenu amélioré |
| Sprint 6 | 2 sem | Multi-appareils |
| Sprint 7 | 2 sem | Monétisation Freemium |
| Sprint 8 | 1 sem | Polish, bugs, tests |

**Total estimé** : ~3 mois pour version complète

---

## Décisions techniques à valider

| Question | Options | Recommandation |
|----------|---------|----------------|
| Backend multi-appareils | Firebase vs Supabase vs custom | **Firebase** (gratuit, rapide à intégrer) |
| GPS en background | `react-native-geolocation-service` vs natif | **Lib existante** d'abord, natif si besoin |
| Overlay Android | Kotlin natif vs `react-native-overlay` | **Natif** pour fiabilité |
| Paiements | Google Play Billing uniquement vs Stripe | **Google Play** (standard store) |

---

## Métriques de succès

| Indicateur | Cible |
|------------|-------|
| Temps de démarrage app | < 2 secondes |
| Consommation batterie (GPS) | < 5% / heure |
| Crash rate | < 0,1% |
| Note Play Store | ≥ 4,5 / 5 |
| Rétention J30 | > 40% |

---

*Dernière mise à jour : 08/09/2026*
