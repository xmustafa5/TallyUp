# Mobile App Migration Plan

**Status (2026-04-18): Phases 1–7 implemented.** The current app lives in [mobile-app/](mobile-app/) with:

- `(auth)/` — login, register, auth guard
- `(onboarding)/` — welcome, setup, gap-periods, summary
- `(tabs)/(home|today|makeup|more)/` — dashboard, prayer tracker, makeup, settings/calendar/schedule/gap-periods CRUD
- API services, hooks, stores copied from frontend and wired to `EXPO_PUBLIC_API_URL`
- Icons/splash in `assets/`, plugins configured in `app.json`

**Remaining (Phase 8):** end-to-end golden-path test on a physical device/simulator (register → onboarding → dashboard → today → makeup → more → settings).

---

## Original migration plan (for reference)

Migrate from `mobile/` to `mobile-app/` incrementally. Each phase is testable on the phone via QR scan.

---

## Phase 1: Expo Router + Empty Tabs

Get Expo Router working with 4 empty tabs visible on phone.

- [x] Install: expo-router, expo-linking, expo-constants, react-native-safe-area-context, react-native-screens, react-native-gesture-handler, @expo/vector-icons
- [x] Update app.json (name: Qatha, scheme, plugins: expo-router)
- [x] Update tsconfig.json (add @/ alias)
- [x] Create babel.config.js
- [x] Switch package.json main to "expo-router/entry"
- [x] Delete App.tsx
- [x] Create app/_layout.tsx (basic Stack, no auth)
- [x] Create app/(tabs)/_layout.tsx (4 tabs: Home, Today, Makeup, More)
- [x] Create app/(tabs)/(home)/_layout.tsx + index.tsx
- [x] Create app/(tabs)/(today)/_layout.tsx + index.tsx
- [x] Create app/(tabs)/(makeup)/_layout.tsx + index.tsx
- [x] Create app/(tabs)/(more)/_layout.tsx + index.tsx

---

## Phase 2: Auth Flow

- [x] Install: axios, zustand, react-native-mmkv, zod, react-hook-form, @hookform/resolvers, expo-secure-store
- [x] Copy types/api.ts
- [x] Copy constants/theme.ts
- [x] Copy lib/mmkv.ts, lib/query-client.ts
- [x] Copy stores/auth.store.ts
- [x] Copy services/api.ts, services/auth.ts
- [x] Copy components/ui/button.tsx, components/ui/text-input.tsx
- [x] Create .env (EXPO_PUBLIC_API_URL)
- [x] Create app/(auth)/_layout.tsx
- [x] Copy app/(auth)/login.tsx
- [x] Copy app/(auth)/register.tsx
- [x] Copy components/auth/auth-guard.tsx
- [x] Update app/_layout.tsx (add AuthGuard + QueryClientProvider)

---

## Phase 3: Home Tab (Dashboard)

- [x] Install: @tanstack/react-query, react-native-reanimated, react-native-svg, expo-haptics
- [x] Copy constants/prayers.ts, constants/query-keys.ts
- [x] Copy lib/haptics.ts
- [x] Copy services/progress.ts, services/schedule.ts
- [x] Copy hooks/use-progress.ts, hooks/use-schedule.ts
- [x] Copy components/dashboard/progress-ring.tsx
- [x] Copy components/dashboard/streak-card.tsx
- [x] Copy components/dashboard/today-mini-strip.tsx
- [x] Replace app/(tabs)/(home)/index.tsx with real dashboard screen
- [x] Update app/_layout.tsx (add SafeAreaProvider, GestureHandlerRootView)

---

## Phase 4: Today Tab (Prayer Tracker)

- [x] Copy services/daily-tracker.ts
- [x] Copy hooks/use-daily-tracker.ts
- [x] Copy components/prayer/prayer-toggle-card.tsx
- [x] Copy components/prayer/weekly-strip.tsx
- [x] Replace app/(tabs)/(today)/index.tsx with real today screen

---

## Phase 5: Makeup Tab

- [x] Copy services/makeup.ts
- [x] Copy hooks/use-makeup.ts
- [x] Replace app/(tabs)/(makeup)/index.tsx with real makeup screen

---

## Phase 6: More Tab (Settings, Calendar, Gap Periods, Schedule)

- [x] Copy services/gap-periods.ts, services/profile.ts, services/settings.ts, services/notifications.ts
- [x] Copy hooks/use-gap-periods.ts, hooks/use-notifications.ts
- [x] Install: @react-native-community/datetimepicker, date-fns, expo-image
- [x] Replace app/(tabs)/(more)/index.tsx with real more menu
- [x] Copy app/(tabs)/(more)/calendar.tsx
- [x] Copy app/(tabs)/(more)/schedule.tsx
- [x] Copy app/(tabs)/(more)/settings.tsx
- [x] Copy app/(tabs)/(more)/settings/profile.tsx
- [x] Copy app/(tabs)/(more)/settings/password.tsx
- [x] Copy app/(tabs)/(more)/gap-periods/index.tsx
- [x] Copy app/(tabs)/(more)/gap-periods/create.tsx
- [x] Copy app/(tabs)/(more)/gap-periods/[id].tsx

---

## Phase 7: Onboarding Flow

- [x] Create app/(onboarding)/_layout.tsx
- [x] Copy app/(onboarding)/welcome.tsx
- [x] Copy app/(onboarding)/setup.tsx
- [x] Copy app/(onboarding)/gap-periods.tsx
- [x] Copy app/(onboarding)/summary.tsx
- [x] Update AuthGuard to redirect new users to onboarding

---

## Phase 8: Assets & Polish

- [x] Copy icons/splash from mobile/assets/
- [x] Update app.json icons/splash paths
- [ ] Final full test of all flows (on-device golden path)
