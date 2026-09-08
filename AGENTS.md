# AGENTS.md — VTC Compagnon

## Project Overview
React Native 0.87.1 app for VTC (chauffeur) drivers. Single-screen floating widget for tracking course state (REPOS → PICKUP → EN_COURSE → RETOUR), time, and estimated revenue. No backend — all data stored locally via AsyncStorage.

## Critical Setup Requirement
**`android/local.properties` must exist with SDK path** or builds fail:
```
sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk
```
This file is gitignored (contains machine-specific path).

## Commands
| Task | Command |
|------|---------|
| Start Metro bundler | `npm start` |
| Build & deploy to Android | `npm run android` |
| Run tests | `npm test` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |

## Testing
- Framework: Jest with `@react-native/jest-preset`
- Test files: `__tests__/**/*.test.ts?(x)` or `*.test.ts?(x)` anywhere
- No test coverage configured yet

## Architecture Notes
- **Single file app**: `App.tsx` contains all logic (~730 lines). No navigation, no screens, no components folder.
- **State**: React hooks only (`useState`, `useEffect`). No Redux/MobX.
- **Persistence**: AsyncStorage with keys `@vtc_*`. Auto-reset stats at midnight.
- **Styling**: Inline `StyleSheet.create`, no external theme file.

## Key Implementation Details
- **Draggable widget**: Uses `Animated.ValueXY` + `PanResponder` (not a true overlay — renders inside app window).
- **Course state machine**: 4 states, transitions driven by button taps (not automatic GPS detection).
- **Revenue calculation**: `2.50€ + (0.35€ × minutes)` — configurable in `TARIFS` constant.
- **Data survival**: Course state saved on app background; restored and time-recalculated on relaunch.

## Known Limitations / Future Work
- No true system overlay (requires native Android permission + module).
- No GPS/distance tracking (planned).
- No cloud backup (planned).
- iOS configured but not primary target (Android-first for VTC market).

## Code Style
- TypeScript strict (via `@react-native/typescript-config`).
- ESLint: `@react-native` preset (`.eslintrc.js` extends it).
- Prettier: 2.8.8 (configured in `package.json`, no standalone config file).
