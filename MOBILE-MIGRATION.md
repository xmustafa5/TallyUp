# Mobile App Migration Plan

Migrate from `mobile/` to `mobile-app/` incrementally. Each phase is testable on the phone via QR scan.

---

## Phase 1: Expo Router + Empty Tabs

Get Expo Router working with 4 empty tabs visible on phone.

- [ ] Install: expo-router, expo-linking, expo-constants, react-native-safe-area-context, react-native-screens, react-native-gesture-handler, @expo/vector-icons
- [ ] Update app.json (name: Qatha, scheme, plugins: expo-router)
- [ ] Update tsconfig.json (add @/ alias)
- [ ] Create babel.config.js
- [ ] Switch package.json main to "expo-router/entry"
- [ ] Delete App.tsx
- [ ] Create app/_layout.tsx (basic Stack, no auth)
- [ ] Create app/(tabs)/_layout.tsx (4 tabs: Home, Today, Makeup, More)
- [ ] Create app/(tabs)/(home)/_layout.tsx + index.tsx (just "Dashboard" text)
- [ ] Create app/(tabs)/(today)/_layout.tsx + index.tsx (just "Today" text)
- [ ] Create app/(tabs)/(makeup)/_layout.tsx + index.tsx (just "Makeup" text)
- [ ] Create app/(tabs)/(more)/_layout.tsx + index.tsx (just "More" text)

**Test:** Scan QR -> see 4 tabs with placeholder text. Tap each tab.

---

## Phase 2: Auth Flow

Add login/register screens with real API calls.

- [ ] Install: axios, zustand, react-native-mmkv, zod, react-hook-form, @hookform/resolvers, expo-secure-store
- [ ] Copy types/api.ts
- [ ] Copy constants/theme.ts
- [ ] Copy lib/mmkv.ts, lib/query-client.ts
- [ ] Copy stores/auth.store.ts
- [ ] Copy services/api.ts, services/auth.ts
- [ ] Copy components/ui/button.tsx, components/ui/text-input.tsx
- [ ] Create .env (EXPO_PUBLIC_API_URL)
- [ ] Create app/(auth)/_layout.tsx
- [ ] Copy app/(auth)/login.tsx
- [ ] Copy app/(auth)/register.tsx
- [ ] Copy components/auth/auth-guard.tsx
- [ ] Update app/_layout.tsx (add AuthGuard + QueryClientProvider)

**Test:** Scan QR -> see login screen. Register/login -> redirected to tabs.

---

## Phase 3: Home Tab (Dashboard)

Show real dashboard data after login.

- [ ] Install: @tanstack/react-query, react-native-reanimated, react-native-svg, expo-haptics
- [ ] Copy constants/prayers.ts, constants/query-keys.ts
- [ ] Copy lib/haptics.ts
- [ ] Copy services/progress.ts, services/schedule.ts
- [ ] Copy hooks/use-progress.ts, hooks/use-schedule.ts
- [ ] Copy components/dashboard/progress-ring.tsx
- [ ] Copy components/dashboard/streak-card.tsx
- [ ] Copy components/dashboard/today-mini-strip.tsx
- [ ] Replace app/(tabs)/(home)/index.tsx with real dashboard screen
- [ ] Update app/_layout.tsx (add SafeAreaProvider, GestureHandlerRootView)

**Test:** Login -> Dashboard shows progress ring, streak card, today status.

---

## Phase 4: Today Tab (Prayer Tracker)

Toggle daily prayers on/off.

- [ ] Copy services/daily-tracker.ts
- [ ] Copy hooks/use-daily-tracker.ts
- [ ] Copy components/prayer/prayer-toggle-card.tsx
- [ ] Copy components/prayer/weekly-strip.tsx
- [ ] Replace app/(tabs)/(today)/index.tsx with real today screen

**Test:** Today tab -> see 5 prayer cards. Toggle prayers. See weekly strip.

---

## Phase 5: Makeup Tab

Log makeup prayers and view stats.

- [ ] Copy services/makeup.ts
- [ ] Copy hooks/use-makeup.ts
- [ ] Replace app/(tabs)/(makeup)/index.tsx with real makeup screen

**Test:** Makeup tab -> log prayers, see stats per prayer type.

---

## Phase 6: More Tab (Settings, Calendar, Gap Periods, Schedule)

All remaining screens.

- [ ] Copy services/gap-periods.ts, services/profile.ts, services/settings.ts, services/notifications.ts
- [ ] Copy hooks/use-gap-periods.ts, hooks/use-notifications.ts
- [ ] Install: @react-native-community/datetimepicker, date-fns, expo-image
- [ ] Replace app/(tabs)/(more)/index.tsx with real more menu
- [ ] Copy app/(tabs)/(more)/calendar.tsx
- [ ] Copy app/(tabs)/(more)/schedule.tsx
- [ ] Copy app/(tabs)/(more)/settings.tsx
- [ ] Copy app/(tabs)/(more)/settings/profile.tsx
- [ ] Copy app/(tabs)/(more)/settings/password.tsx
- [ ] Copy app/(tabs)/(more)/gap-periods/index.tsx
- [ ] Copy app/(tabs)/(more)/gap-periods/create.tsx
- [ ] Copy app/(tabs)/(more)/gap-periods/[id].tsx

**Test:** More tab -> navigate to calendar, schedule, gap periods, settings. All CRUD works.

---

## Phase 7: Onboarding Flow

First-time user setup.

- [ ] Create app/(onboarding)/_layout.tsx
- [ ] Copy app/(onboarding)/welcome.tsx
- [ ] Copy app/(onboarding)/setup.tsx
- [ ] Copy app/(onboarding)/gap-periods.tsx
- [ ] Copy app/(onboarding)/summary.tsx
- [ ] Update AuthGuard to redirect new users to onboarding

**Test:** Register new account -> onboarding flow -> lands on dashboard.

---

## Phase 8: Assets & Polish

- [ ] Copy icons/splash from mobile/assets/
- [ ] Update app.json icons/splash paths
- [ ] Final full test of all flows
