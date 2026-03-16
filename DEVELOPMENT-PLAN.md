# Qatha Development Plan

Phased roadmap for building the Qatha prayer makeup tracker.
Dependency chain: Schema -> Auth -> Profile -> Calculator -> Tracking -> Dashboard -> Polish -> Growth -> Expansion

---

## Phase 1: Foundation & Authentication

### 1A: Database Schema (Backend)

Design the complete Prisma schema upfront. All models defined now even if populated later -- foreign keys need to exist from the start.

**Models:**

- `User` -- id (UUID), email (unique), name, passwordHash (nullable for OAuth), birthdate, pubertyAge (nullable), provider (enum: LOCAL/GOOGLE/APPLE), providerId (nullable), isActive, timestamps
- `GapPeriod` -- id, userId (FK), startDate, endDate, inputMethod (enum: DATE_RANGE/AGE_RANGE), originalStartAge (nullable), originalEndAge (nullable), totalDays (computed), totalPrayers (computed as totalDays * 5), timestamps
- `PrayerBalance` -- id, userId (FK, unique), fajr/dhuhr/asr/maghrib/isha (Int counts), totalRemaining, totalCompleted, timestamps
- `MakeupLog` -- id, userId (FK), prayerType (enum: FAJR/DHUHR/ASR/MAGHRIB/ISHA), completedAt, source (enum: MANUAL/GAP_PERIOD/DAILY_MISSED), createdAt
- `DailyTracker` -- id, userId (FK), date, fajr/dhuhr/asr/maghrib/isha (Boolean), isFinalized (default false), timestamps. Unique on (userId, date)
- `Streak` -- id, userId (FK, unique), currentStreak, longestStreak, lastActiveDate (nullable), updatedAt

**Enums:** PrayerType, AuthProvider, InputMethod, MakeupSource

**Indexes:** userId on GapPeriod/MakeupLog/DailyTracker, (userId, completedAt) on MakeupLog

**Files:**
- `backend/prisma/schema.prisma`

---

### 1B: Auth Domain (Backend)

JWT-based authentication with local email/password. OAuth (Google/Apple) designed for but deferred.

**Install:** `@fastify/jwt`, `bcrypt`, `@types/bcrypt`

**Env variables:** JWT_SECRET, JWT_EXPIRES_IN (default "7d"), JWT_REFRESH_EXPIRES_IN (default "30d")

**Domain structure** (`backend/src/app/domains/auth/`):
- `domain/entities/user.entity.ts` -- User entity with toResponse() (excludes passwordHash)
- `domain/value-objects/email.ts` -- Email validation
- `domain/value-objects/password.ts` -- Password hashing (min 8 chars)
- `domain/repositories/user.repository.ts` -- Interface: findById, findByEmail, create, update, existsByEmail
- `domain/services/auth.service.ts` -- validateRegistrationData, validateLoginData
- `infrastructure/repositories/prisma-user.repository.ts` -- Prisma implementation
- `presentation/schemas/auth.schemas.ts` -- TypeBox schemas
- `presentation/routes/auth.routes.ts` -- POST /auth/register, POST /auth/login, POST /auth/refresh, GET /auth/me
- `index.ts` -- Registers with prefix /auth

**Auth plugin** (`backend/src/app/plugins/auth.plugin.ts`):
- Register @fastify/jwt
- `authenticate` preHandler hook (verify JWT)
- Refresh tokens stored in Redis for revocation

**Tests:** `backend/test/domains/auth/` -- unit + integration

---

### 1C: Frontend Foundation

Install all required libraries and set up application shell.

**Install via pnpm:**
- shadcn/ui (init), lucide-react
- axios, @tanstack/react-query
- react-hook-form, zod, @hookform/resolvers
- zustand
- next-intl
- date-fns, clsx, tailwind-merge

**Directory structure** (`frontend/src/`):
```
app/
  (auth)/login/page.tsx, register/page.tsx
  (app)/layout.tsx, page.tsx
  layout.tsx, globals.css
components/ui/, layout/, shared/
services/api.ts          -- Axios instance (base URL, JWT interceptor, 401 handling)
hooks/use-auth.ts
stores/auth.store.ts     -- Zustand (user, tokens, persist to localStorage)
types/api.ts
lib/utils.ts, query-client.ts
constants/prayers.ts
messages/en.json, ar.json
```

**Key tasks:**
- Configure Axios instance with JWT interceptor + auto-refresh on 401
- Configure TanStack Query client with defaults
- Build root layout (providers, Arabic-friendly font, metadata)
- Build login + register pages (react-hook-form + zod)
- Build auth guard component for protected routes
- Set up next-intl with locale detection + RTL support

---

### 1D: Profile Setup -- F-01 (Backend + Frontend)

**Backend** (`backend/src/app/domains/profile/`):
- GET /profile -- current user profile
- PUT /profile -- update birthdate/pubertyAge
- All routes require `authenticate` preHandler

**Frontend:**
- `(app)/setup/page.tsx` -- birthdate picker (Gregorian), optional puberty age (9-17)
- Onboarding flow tracker: redirect to setup if profile incomplete

---

## Phase 2: Core Calculator Engine -- F-02, F-03

### 2A: Gap Period Domain (Backend)

The brain of the application -- prayer calculation and gap period management.

**Domain** (`backend/src/app/domains/gap-period/`):

**Core calculation engine** (`domain/services/prayer-calculator.service.ts`):
- `calculateDaysInRange(start, end)` -- returns (end - start) + 1
- `calculatePrayersForRange(days)` -- returns days * 5
- `resolveAgesToDates(birthdate, startAge, endAge)` -- converts age range to dates
- `mergeOverlappingPeriods(periods[])` -- de-duplicates overlapping ranges
- `calculateTotalPrayers(mergedPeriods[])` -- sums across all periods

**Calculation formula:**
```
For each gap period:
  days = (endDate - startDate) + 1
  prayers = days * 5
Total = sum of all non-overlapping periods
Each prayer type gets: totalDays prayers (equal distribution)
```

**Routes:**
- POST /gap-periods -- Create (date range or age range)
- GET /gap-periods -- List all for user
- PUT /gap-periods/:id -- Update
- DELETE /gap-periods/:id -- Delete
- POST /gap-periods/calculate -- Full calculation with overlap merging

**Balance recalculation:** On any gap period change, recalculate PrayerBalance (merge overlaps, compute totals, subtract completed makeup prayers)

**Tests:** `prayer-calculator.service.test.ts` -- overlap merging, date math, age conversion (most critical tests in the project)

---

### 2B: Gap Period & Calculator UI (Frontend)

- `(app)/gap-periods/page.tsx` -- List periods, add/edit/delete, summary card
- `components/shared/gap-period-form.tsx` -- Toggle date/age input, react-hook-form + zod
- `components/shared/calculation-summary.tsx` -- Total days, prayers by type
- Onboarding integration: after profile setup, guide to add first gap period
- `hooks/use-gap-periods.ts`, `hooks/use-prayer-balance.ts`

---

## Phase 3: Prayer Tracking -- F-04, F-06

### 3A: Makeup + Daily Tracker Domains (Backend)

**Makeup domain** (`backend/src/app/domains/makeup/`):
- `logMakeupPrayer(userId, prayerType)` -- Record + decrement PrayerBalance
- `undoMakeupPrayer(logId)` -- Remove + increment PrayerBalance back
- Routes: POST /makeup, DELETE /makeup/:id, GET /makeup/history (paginated), GET /makeup/stats

**Daily tracker domain** (`backend/src/app/domains/daily-tracker/`):
- `getOrCreateToday(userId)` -- Returns today's tracker
- `markPrayer(userId, date, prayerType, completed)` -- Toggle prayer
- `finalizeDay(userId, date)` -- **Critical business rule:** unmarked prayers become missed and are added to PrayerBalance

**BullMQ job** (`infrastructure/jobs/daily-finalization.job.ts`):
- Repeatable job runs at end of day
- Finalizes previous day for all users with unfinalized trackers
- Uses existing BullMQ plugin

**Routes:**
- GET /daily-tracker/today
- GET /daily-tracker/:date
- PATCH /daily-tracker/:date -- { prayerType, completed }
- POST /daily-tracker/:date/finalize

---

### 3B: Makeup Todo + Daily Tracker UI (Frontend)

- `(app)/daily/page.tsx` -- Five prayer cards for today, tap to toggle, X/5 summary
- `(app)/makeup/page.tsx` -- Filter by type, counters, quick-log buttons, history with undo
- `components/shared/prayer-card.tsx` -- Reusable prayer card (name, status, action)
- `components/shared/prayer-type-badge.tsx`, `prayer-counter.tsx`
- `hooks/use-daily-tracker.ts`, `hooks/use-makeup.ts`

---

## Phase 4: Dashboard & Calendar -- F-07, F-05

### 4A: Progress Domain (Backend)

**Domain** (`backend/src/app/domains/progress/`):

- `getDashboard(userId)` -- totalRemaining, totalCompleted, percentage, streak, todayStatus, weeklyStats
- `updateStreak(userId)` -- Called after each makeup prayer log
- Routes:
  - GET /progress/dashboard
  - GET /progress/calendar/:year/:month -- Array of { date, goalCount, completedCount, status }
  - GET /progress/streaks

---

### 4B: Dashboard + Calendar UI (Frontend)

**Dashboard** (`(app)/page.tsx` -- main landing after login):
- Large counter: "X prayers remaining"
- Progress circle showing completion %
- Streak display
- Today's 5-prayer status (inline from daily tracker)
- Quick-action buttons for fast makeup logging
- Weekly/monthly summary cards
- Motivational milestones (10%, 25%, 50%, 75%, 90%)

**Calendar** (`(app)/calendar/page.tsx`):
- Monthly grid with color-coded days (green/yellow/gray)
- Click day for details modal
- Month navigation

**App shell** (`(app)/layout.tsx`):
- Mobile: bottom nav (Dashboard, Daily, Makeup, Calendar, Settings)
- Desktop: sidebar nav

**Components:** calendar-grid, day-cell, day-detail-modal, progress-circle, streak-display, milestone-toast

---

## Phase 5: Polish & MVP Launch

### 5A: Arabic/English i18n + RTL
- Complete en.json and ar.json translations
- RTL layout (Tailwind logical properties: ms/me, start/end)
- Language switcher, prayer names in both languages
- Arabic date formatting (date-fns locale)
- Arabic-friendly font (IBM Plex Sans Arabic)

### 5B: Settings Page
- `(app)/settings/page.tsx` -- Edit profile, change password, language, delete account (GDPR), logout
- Backend: PUT /auth/change-password, DELETE /auth/account

### 5C: Redis Caching
- Cache dashboard data (30-60s TTL, invalidate on prayer log)
- Cache prayer balance
- Cache calendar month data
- Frontend: Configure TanStack Query staleTime/cacheTime per query

### 5D: UI Polish
- Loading skeletons for every page
- Empty states ("No gap periods yet", "Start tracking", etc.)
- Error boundaries per page with retry
- Toast notifications for all mutations
- Confirmation dialogs for destructive actions
- Responsive design audit (mobile viewports)

---

## Phase 6: Growth -- F-08, F-09

### 6A: Schedule Planner (F-09)
- **Backend:** Schedule model (dailyGoal, weeklyGoal), CRUD routes, GET /schedule/today
- **Frontend:** Goal settings page, calendar integration (goal target per day), dashboard card ("3/5 today")

### 6B: Push Notifications (F-08)
- **Backend:** DeviceToken model, notification preferences, BullMQ jobs for prayer + goal reminders
- **Frontend:** Service worker, permission request flow, notification settings

---

## Phase 7: Expansion -- F-11, F-12

### 7A: Analytics & Reports (F-11)
- **Backend:** Analytics endpoints (trends, distributions, streak history), Redis caching
- **Frontend:** Charting library (recharts), analytics page with line/bar charts

### 7B: Export & Share (F-12)
- **Backend:** PDF generation (pdfkit), BullMQ async job for large reports
- **Frontend:** Export button, shareable progress card
