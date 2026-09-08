# VTC Compagnon

Application mobile compagnon pour chauffeurs VTC. Suivi de courses, calcul de revenus et statistiques — 100% locale, sans backend.

![React Native](https://img.shields.io/badge/React_Native-0.87.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Fonctionnalités

| Feature | Description |
|---------|-------------|
| **Widget flottant** | Suivi de course draggable avec 4 états (Repos → Pickup → En course → Retour) |
| **Chronomètre** | Temps écoulé en temps réel |
| **Calcul revenus** | Estimation basée sur tarifs personnalisables (prise en charge + €/min) |
| **Statistiques** | Courses du jour, historique 7 jours, moyennes |
| **Persistance** | Données sauvegardées localement (AsyncStorage), restauration après fermeture |
| **Réglages** | Tarifs modifiables, thème, notifications |

---

## Prérequis

- Node.js ≥ 22.11
- Android SDK (via Android Studio)
- Java 17+

### Configuration SDK Android

Créer `android/local.properties` avec le chemin de votre SDK :

```properties
sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk
```

> Ce fichier est gitignored (spécifique à chaque machine).

---

## Installation

```bash
# Cloner le repo
git clone https://github.com/MohamedAliRouis/VTCCompagnon.git
cd VTCCompagnon

# Installer les dépendances
npm install

# Lancer Metro bundler (terminal 1)
npm start

# Build et déploiement Android (terminal 2)
npm run android
```

---

## Structure du projet

```
src/
├── components/
│   ├── Widget/           # Widget flottant (Badge, Chrono, Actions)
│   └── Stats/            # Modal statistiques
├── screens/
│   ├── HomeScreen.tsx    # Accueil avec widget
│   ├── HistoryScreen.tsx # Historique détaillé
│   └── SettingsScreen.tsx# Réglages
├── store/                # Zustand (state management)
│   ├── courseStore.ts    # État course active
│   ├── statsStore.ts     # Statistiques jour + historique
│   └── settingsStore.ts  # Préférences utilisateur
├── types/                # Types TypeScript
├── utils/
│   ├── formatters.ts     # formatTemps, formatArgent, dates
│   └── storage.ts        # Helpers AsyncStorage
└── constants/            # Tarifs, clés storage, couleurs
```

---

## Utilisation

### Widget (Accueil)

| État | Action | Résultat |
|------|--------|----------|
| 🟣 **Repos** | ▶ DÉMARRER | Passe à Pickup |
| 🟠 **Pickup** | CLIENT MONTÉ | Passe à En course |
| 🟢 **En course** | ARRIVÉE | Enregistre stats → Retour |
| 🔵 **Retour** | TERMINER | Retour Repos |

**Appui long** sur le widget ou tap sur "Aujourd'hui" → Modal statistiques détaillées.

### Historique

- Vue du jour en cours
- Totaux 7 derniers jours
- Détail par jour

### Réglages

- Modifier tarifs (prise en charge, €/min)
- Activer/désactiver notifications
- Thème sombre/clair (WIP)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | React Native 0.87.1 |
| Langage | TypeScript (strict) |
| Navigation | React Navigation (bottom tabs) |
| State | Zustand |
| Stockage | AsyncStorage |
| Tests | Jest + React Test Renderer |
| Lint | ESLint (@react-native) |

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm start` | Lance Metro bundler |
| `npm run android` | Build + déploie sur Android |
| `npm run ios` | Build + déploie sur iOS (non testé) |
| `npm test` | Lance les tests Jest |
| `npm run lint` | Vérifie le code ESLint |
| `npx tsc --noEmit` | Vérifie les types TypeScript |

---

## Workflow Git

| Branche | Usage |
|---------|-------|
| `main` | Code stable, releases |
| `develop` | Intégration continue |
| `feature/*` | Nouvelles fonctionnalités |

### Contribuer

```bash
# Nouvelle feature
git checkout -b feature/ma-feature develop

# Développer, tester...

# Merger dans develop
git checkout develop
git merge feature/ma-feature
git push origin develop

# Quand stable → PR vers main
```

---

## Roadmap

- [ ] GPS + distance parcourue
- [ ] Graphiques revenus (charts)
- [ ] Export CSV/PDF
- [ ] Mode hors ligne complet
- [ ] Notifications course détectée
- [ ] Thème clair complet
- [ ] iOS support

---

## Licence

MIT — Voir [LICENSE](LICENSE)

---

## Auteur

**Mohamed Ali Rouis** — [GitHub](https://github.com/MohamedAliRouis)
