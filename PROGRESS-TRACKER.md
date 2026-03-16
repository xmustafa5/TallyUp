# Qatha Progress Tracker

Mark tasks `- [x]` as they are completed. See `DEVELOPMENT-PLAN.md` for full details on each task.

---

## Phase 1: Foundation & Authentication

### 1A: Database Schema

- [x] Design and write Prisma schema with all models (User, GapPeriod, PrayerBalance, MakeupLog, DailyTracker, Streak)
- [x] Define enums (PrayerType, AuthProvider, InputMethod, MakeupSource)
- [x] Add indexes and unique constraints
- [ ] Push schema to database (`docker compose restart app`) -- Docker not running

### 1B: Auth Domain (Backend)

- [x] Install auth dependencies (@fastify/jwt, bcrypt)
- [x] Add auth env variables (JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN)
- [x] Create User entity with toResponse()
- [x] Create Email and Password value objects
- [x] Create UserRepository interface
- [x] Create auth.service.ts (validation logic)
- [x] Create PrismaUserRepository implementation
- [x] Create auth plugin (JWT verify, authenticate hook)
- [x] Create auth routes (register, login, refresh, me)
- [x] Create TypeBox schemas with full Swagger docs
- [x] Add "Auth" Swagger tag
- [x] Write auth tests (unit + integration)

### 1C: Frontend Foundation

- [x] Install UI libraries (shadcn/ui init, lucide-react)
- [x] Install data libraries (axios, @tanstack/react-query)
- [x] Install form libraries (react-hook-form, zod, @hookform/resolvers)
- [x] Install state/i18n (zustand, next-intl)
- [x] Install utilities (date-fns, clsx, tailwind-merge)
- [x] Set up directory structure (components/, services/, hooks/, stores/, types/, lib/, constants/)
- [x] Configure Axios instance with JWT interceptor
- [x] Configure TanStack Query client
- [x] Create Zustand auth store (user, tokens, persist)
- [x] Build root layout (providers, fonts, metadata)
- [x] Build login page
- [x] Build register page
- [x] Build auth guard component
- [ ] Set up next-intl (middleware, en.json, ar.json)

### 1D: Profile Setup (F-01)

- [x] Create profile domain backend (GET /profile, PUT /profile)
- [x] Create profile TypeBox schemas + Swagger docs
- [x] Build setup page (birthdate picker, puberty age)
- [ ] Implement onboarding flow redirect logic

---

## Phase 2: Core Calculator Engine (F-02, F-03)

### 2A: Gap Period Domain (Backend)

- [x] Create GapPeriod entity with validation
- [x] Create DateRange value object with overlap detection
- [x] Create prayer-calculator.service.ts (days calc, overlap merging, age-to-date)
- [x] Create GapPeriodRepository interface + Prisma implementation
- [x] Create gap period routes (CRUD + calculate + balance)
- [x] Create TypeBox schemas + Swagger docs
- [x] Implement PrayerBalance recalculation on gap period changes
- [x] Add "Gap Periods" Swagger tag
- [x] Write prayer calculator tests (30 tests: overlap, dates, ages, DateRange)
- [x] Write gap period route tests (23 tests: auth, CRUD, calculate, balance, overlap merging)

### 2B: Gap Period & Calculator UI (Frontend)

- [x] Create gap-periods API service with TypeScript interfaces
- [x] Create React Query hooks (useGapPeriods, useCreateGapPeriod, useUpdateGapPeriod, useDeleteGapPeriod, useCalculation, usePrayerBalance)
- [x] Build gap periods list page with cards, empty state, delete confirmation
- [x] Build create gap period form (DATE_RANGE/AGE_RANGE toggle, zod validation)
- [x] Build edit gap period page (pre-populated, date-only editing)
- [x] Build calculation summary component (totals, per-type breakdown, merged periods)
- [x] Build prayer balance component (progress bar, per-type counts)
- [x] Update dashboard with prayer balance summary and quick links
- [ ] Integrate into onboarding flow

---

## Phase 3: Prayer Tracking (F-04, F-06)

### 3A: Makeup + Daily Tracker (Backend)

- [x] Create MakeupLog entity with fromPrisma(), toResponse()
- [x] Create makeup.service.ts (logMakeupPrayer, getStats)
- [x] Create MakeupLogRepository interface + Prisma implementation
- [x] Create makeup routes (POST /, DELETE /:id, GET /history, GET /stats)
- [x] Create makeup TypeBox schemas + Swagger docs
- [x] Add "Makeup" Swagger tag
- [x] Write makeup tests (15 tests: entity, service)
- [x] Create DailyTracker entity with getMissedPrayers(), getCompletedCount()
- [x] Create daily-tracker.service.ts (getTodayUTC, determineMissedPrayers, shouldUpdateStreak)
- [x] Create finalization.service.ts (finalizeTracker with MakeupLog creation + balance recalc)
- [x] Create DailyTrackerRepository interface + Prisma implementation
- [x] Create daily tracker routes (GET /today, GET /:date, PATCH /:date, POST /:date/finalize, GET /week, GET /streak)
- [x] Create daily tracker TypeBox schemas + Swagger docs
- [x] Add "Daily Tracker" Swagger tag
- [x] Create BullMQ daily finalization job (midnight UTC cron)
- [x] Write daily tracker tests (23 tests: entity, service, streak logic)

### 3B: Makeup Todo + Daily Tracker UI (Frontend)

- [x] Create makeup API service + TypeScript interfaces
- [x] Create daily-tracker API service + TypeScript interfaces
- [x] Create use-makeup React Query hooks (history, log, undo, stats)
- [x] Create use-daily-tracker React Query hooks (today, date, mark, finalize, week, streak)
- [x] Build daily tracker page (5 prayer cards, weekly view, streak display, finalize button)
- [x] Build makeup page (per-type stats with progress bars, quick-log buttons, history with undo)
- [x] Create prayer-card component (toggleable with loading state)
- [x] Create streak-display component
- [x] Update dashboard with Daily Tracker and Makeup quick links

---

## Phase 4: Dashboard & Calendar (F-07, F-05)

### 4A: Progress Domain (Backend)

- [x] Create progress.service.ts (calculateDashboard, calculateCalendarMonth, getMilestone)
- [x] Create progress routes (GET /progress, GET /progress/calendar/:year/:month, GET /progress/streaks)
- [x] Create TypeBox schemas + Swagger docs
- [x] Add "Progress" Swagger tag
- [x] Write progress service tests (24 tests: dashboard aggregation, calendar month, milestones)

### 4B: Dashboard + Calendar UI (Frontend)

- [x] Create progress API service + TypeScript interfaces
- [x] Create use-progress React Query hooks (useDashboard, useCalendarMonth, useStreaks)
- [x] Build dashboard page (progress circle, stats, today status, streak, milestone banner, quick actions)
- [x] Build calendar page (monthly grid, navigation, color-coded days, day detail modal)
- [x] Build app shell layout (mobile bottom nav + desktop sidebar, 5 nav items)
- [x] Create progress-circle component (SVG circular indicator)
- [x] Create today-status component (inline 5-prayer row)
- [x] Create milestone-banner component
- [x] Create calendar-grid and day-detail-modal components
- [x] Add motivational milestone messages (10/25/50/75/90/100%)

---

## Phase 5: Polish & MVP Launch

### 5A: i18n + RTL

- [x] Complete en.json translations (all sections)
- [x] Complete ar.json translations (all sections)
- [x] RTL layout adjustments (html dir attribute, sidebar border)
- [x] Language switcher component (cookie-based locale toggle)
- [x] Prayer names in Arabic + English
- [x] Arabic font setup (IBM Plex Sans Arabic via next/font)
- [x] next-intl configuration (request config, locale cookies, NextIntlClientProvider)
- [x] Nav labels using useTranslations

### 5B: Settings Page

- [x] Build settings page (profile edit, change password, language, delete account, sign out)
- [x] Backend: PUT /auth/change-password (password verification + update)
- [x] Backend: DELETE /auth/account (password confirmation + cascade delete)
- [x] TypeBox schemas + Swagger docs for both endpoints

### 5C: Redis Caching

- [x] CacheService utility class (get, set, invalidate, invalidateExact)
- [x] Cache key constants and TTL configuration
- [x] Cache dashboard data (30s TTL)
- [x] Cache prayer balance (60s TTL)
- [x] Cache calendar month data (120s TTL)
- [x] Cache invalidation on mutations (gap-period, makeup, daily-tracker routes)
- [x] Frontend TanStack Query staleTime tuning (dashboard 15s, calendar 60s, balance 30s)

### 5D: UI Polish

- [x] Toast notification system (ToastProvider + useToast hook)
- [x] Loading skeletons for all pages (dashboard, gap-periods, daily-tracker, makeup, calendar)
- [x] Skeleton components (Skeleton, SkeletonCard, SkeletonLine, SkeletonCircle)
- [x] Error boundary component (class-based with retry)
- [x] App-level error.tsx page
- [x] Toast notifications on mutations (gap-period delete, makeup log/undo, daily-tracker finalize)

---

## Phase 6: Growth (F-08, F-09)

### 6A: Schedule Planner (F-09)

- [x] Create Schedule Prisma model (dailyGoal, weeklyGoal, isActive)
- [x] Create Schedule entity with fromPrisma(), toResponse()
- [x] Create schedule routes (GET /, PUT /, GET /today with daily+weekly progress)
- [x] Create TypeBox schemas + Swagger docs + "Schedule" tag
- [x] Write schedule entity tests (7 tests)
- [x] Create schedule API service + React Query hooks (useSchedule, useUpdateSchedule, useTodayProgress)
- [x] Build schedule settings page (goal inputs, daily/weekly progress bars, toast on save)
- [x] Integrate goals into dashboard (Today's Goal card with progress bar)
- [x] Add Schedule nav item to app shell

### 6B: Push Notifications (F-08)

- [x] Create DeviceToken + NotificationPreference Prisma models + NotificationType enum
- [x] Create notification service stub (console.log, ready for FCM integration)
- [x] Create notification routes (POST/DELETE /devices, GET/PUT /preferences)
- [x] Create TypeBox schemas + Swagger docs + "Notifications" tag
- [x] Create BullMQ reminder jobs (prayer-reminder 8AM UTC, streak-reminder 9PM UTC)
- [x] Write notification tests (3 tests)
- [x] Create notifications API service + React Query hooks
- [x] Add Notification preferences toggles to settings page (4 toggles)

---

## Phase 7: Expansion (F-11, F-12)

### 7A: Analytics & Reports (F-11)

- [ ] Create analytics backend endpoints
- [ ] Redis caching for computed analytics
- [ ] Install charting library (recharts)
- [ ] Build analytics page with charts

### 7B: Export & Share (F-12)

- [ ] Create PDF generation backend
- [ ] Create BullMQ async PDF job
- [ ] Build export button + UI
- [ ] Build shareable progress card
