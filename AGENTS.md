# AGENTS.md — VTC Compagnon

## Project Overview
React Native 0.87.1 Android-first app for VTC drivers. It tracks the manual course flow `REPOS -> PICKUP -> EN_COURSE -> REPOS`, time, and estimated revenue. There is no backend yet.

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
- `App.tsx` owns the bottom-tab navigator; screens live in `src/screens/`.
- Zustand stores in `src/store/` own course, stats, and settings state.
- AsyncStorage helpers are in `src/utils/storage.ts`; app keys use the `@vtc_*` prefix.
- The system overlay is native Android code under `android/app/src/main/java/com/vtccompagnon/overlay/` and is manually registered in `MainApplication.kt`.

## Key Implementation Details
- **The native overlay is the only course control UI**; `HomeScreen` is a read-only dashboard plus overlay show/hide control. Do not reintroduce duplicate course buttons on the home screen.
- **Course state machine**: 3 states, transitions driven by button taps; there is no automatic GPS detection.
- **Revenue calculation**: `2.50€ + (0.35€ × minutes)` — configurable in `TARIFS` constant.
- **Overlay timing**: the native foreground service calculates elapsed time and revenue so it keeps updating while React Native is backgrounded.
- **Global wiring**: `App.tsx` must mount `useCourseTimer()` and `useWidgetOverlay(true)`; screen-level calls use `useWidgetOverlay()` without native event listeners.
- **Overlay position**: native `SharedPreferences` persist `WindowManager.LayoutParams.x/y`; do not move this state to AsyncStorage.

## Known Limitations / Future Work
- No GPS/distance tracking (planned).
- No cloud backup (planned).
- iOS configured but not primary target (Android-first for VTC market).

## Code Style
- TypeScript strict (via `@react-native/typescript-config`).
- ESLint: `@react-native` preset (`.eslintrc.js` extends it).
- Prettier: 2.8.8 (configured in `package.json`, no standalone config file).
