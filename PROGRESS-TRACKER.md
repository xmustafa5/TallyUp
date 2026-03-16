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

- [ ] Create GapPeriod entity with validation
- [ ] Create DateRange value object with overlap detection
- [ ] Create prayer-calculator.service.ts (days calc, overlap merging, age-to-date)
- [ ] Create GapPeriodRepository interface + Prisma implementation
- [ ] Create gap period routes (CRUD + calculate)
- [ ] Create TypeBox schemas + Swagger docs
- [ ] Implement PrayerBalance recalculation on gap period changes
- [ ] Write prayer calculator tests (overlap, dates, ages)
- [ ] Write gap period route tests

### 2B: Gap Period & Calculator UI (Frontend)

- [ ] Build gap periods list page
- [ ] Build gap period form (date/age toggle)
- [ ] Build calculation summary component
- [ ] Integrate into onboarding flow
- [ ] Create use-gap-periods and use-prayer-balance hooks

---

## Phase 3: Prayer Tracking (F-04, F-06)

### 3A: Makeup + Daily Tracker (Backend)

- [ ] Create MakeupLog entity
- [ ] Create makeup.service.ts (log, undo, stats)
- [ ] Create MakeupLogRepository interface + Prisma implementation
- [ ] Create makeup routes (POST, DELETE, GET history, GET stats)
- [ ] Create DailyTracker entity
- [ ] Create daily-tracker.service.ts (getOrCreateToday, markPrayer, finalizeDay)
- [ ] Create DailyTrackerRepository interface + Prisma implementation
- [ ] Create daily tracker routes (GET today, GET :date, PATCH :date, POST finalize)
- [ ] Create BullMQ daily finalization job
- [ ] Create TypeBox schemas + Swagger docs for both domains
- [ ] Write makeup service tests
- [ ] Write daily tracker tests (finalization logic)
- [ ] Write finalization job tests

### 3B: Makeup Todo + Daily Tracker UI (Frontend)

- [ ] Build daily tracker page (5 prayer cards, toggle, summary)
- [ ] Build makeup todo page (filter, counters, quick-log, history, undo)
- [ ] Create prayer-card, prayer-type-badge, prayer-counter components
- [ ] Create use-daily-tracker and use-makeup hooks

---

## Phase 4: Dashboard & Calendar (F-07, F-05)

### 4A: Progress Domain (Backend)

- [ ] Create progress.service.ts (getDashboard, updateStreak)
- [ ] Create progress routes (dashboard, calendar/:year/:month, streaks)
- [ ] Create TypeBox schemas + Swagger docs
- [ ] Integrate streak update with makeup logging
- [ ] Write progress service tests (aggregation, streak edge cases)

### 4B: Dashboard + Calendar UI (Frontend)

- [ ] Build dashboard page (counter, progress circle, streak, today status, quick actions)
- [ ] Build calendar page (monthly grid, color-coded days, day detail modal)
- [ ] Build app shell layout (bottom nav mobile, sidebar desktop)
- [ ] Create progress-circle, streak-display, milestone-toast components
- [ ] Create calendar-grid, day-cell, day-detail-modal components
- [ ] Create use-dashboard and use-calendar hooks
- [ ] Add motivational milestone messages

---

## Phase 5: Polish & MVP Launch

### 5A: i18n + RTL

- [ ] Complete en.json translations
- [ ] Complete ar.json translations
- [ ] RTL layout adjustments (Tailwind logical properties)
- [ ] Language switcher component
- [ ] Prayer names in Arabic + English
- [ ] Arabic date formatting
- [ ] Arabic font setup

### 5B: Settings Page

- [ ] Build settings page (edit profile, change password, language, delete account, logout)
- [ ] Backend: PUT /auth/change-password
- [ ] Backend: DELETE /auth/account

### 5C: Redis Caching

- [ ] Cache dashboard data (30-60s TTL)
- [ ] Cache prayer balance
- [ ] Cache calendar month data
- [ ] Configure frontend TanStack Query staleTime/cacheTime

### 5D: UI Polish

- [ ] Add loading skeletons for all pages
- [ ] Add empty states for all lists
- [ ] Add error boundaries per page
- [ ] Add toast notifications for mutations
- [ ] Add confirmation dialogs for destructive actions
- [ ] Responsive design audit

---

## Phase 6: Growth (F-08, F-09)

### 6A: Schedule Planner (F-09)

- [ ] Create Schedule Prisma model
- [ ] Create schedule domain backend (CRUD, GET /schedule/today)
- [ ] Build goal settings page
- [ ] Integrate goals into calendar + dashboard

### 6B: Push Notifications (F-08)

- [ ] Create DeviceToken Prisma model
- [ ] Create notification preferences backend
- [ ] Create BullMQ reminder jobs
- [ ] Frontend service worker registration
- [ ] Permission request flow
- [ ] Notification settings in settings page

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
