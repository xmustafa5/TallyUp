# TallyUp

**Product Requirements Document (PRD)**
*A social challenge tracker for groups of friends*

| Field | Value |
|---|---|
| Product Name | TallyUp |
| Document Version | 1.1 |
| Date | May 14, 2026 |
| Platforms | Web App + Mobile App (iOS, Android) |
| Status | Draft for Review |

---

## 1. Overview

### 1.1 Product Summary
TallyUp is a social challenge-tracking app where friends create private rooms, set personal point targets, and compete over a fixed period (a week, a month, or any custom number of days). At the end of each period, an automatic rule decides who wins or loses based on points earned. Although the original inspiration was a gym challenge between friends, TallyUp is built to support any kind of repeatable habit, goal, or competition — such as study hours, reading books, prayer, running, or saving money.

### 1.2 Problem Statement
Friends who want to motivate each other often invent informal challenges, for example: *the one who skips the gym the most this week pays for dinner*. These challenges are hard to track. People forget points, argue about results, and there is no single place to see progress. Existing fitness or habit apps are either too individual (no group competition) or too generic (no points, no loser, no flexible periods).

### 1.3 Goal
Give small groups of friends a simple, fun, and fair way to run point-based challenges with custom rules, automatic scoring, and clear results at the end of each period.

### 1.4 Target Users
- Groups of friends running fitness challenges (gym, running, walking).
- Study groups tracking hours or completed sessions.
- Family members tracking habits like reading, prayer, or chores.
- Coworkers running short fun bets (10-day step challenge, no-junk-food month).

### 1.5 Key Concept Note
TallyUp is **not only for losers**. Every room has a configurable rule, and one of the options is **No loser**, which means the room is just a friendly leaderboard. The losing concept is one option among several, not the core idea.

---

## 2. Core Concepts

### 2.1 Glossary

| Term | Definition |
|---|---|
| User | A registered person with a unique User ID. Can be invited to rooms. |
| User ID | A short, shareable unique identifier (e.g. `ALI-2941`) used to invite people. |
| Room | A private challenge group created by an admin. Contains members, a target, a period, and a rule. |
| Admin | The user who created the room. Can configure rules and manage members. |
| Target | The number of points each member must reach during the period. May be different for each member. |
| Period | The time window of the challenge: week, month, or custom number of days. |
| Check-in | The action of marking points as done. Users can check in multiple points at once. |
| Rules | How the result is decided at the end of the period. A room has two independent rules: a **Winner Rule** and a **Loser Rule**. Either can be set to "none". |
| Cycle | One full period from start to end. After it ends, the room resets and a new cycle begins. |

### 2.2 Points Model (Important)
This is the most important part of the product and must be implemented exactly as described.

- **Per-user target:** The admin sets a target for each member individually. Example: Ali = 4 points, Ahmed = 4 points, Mustafa = 10 points. Targets can be different because some users are more advanced.
- **Free check-in (not per day):** A user can check off points at any time during the period. They are not forced to check one point per day. If a user forgets, they can open the app later and tick several points in one go.
- **Progress is the ratio:** checked points divided by target. For example, Mustafa at 6/10 is at 60%. Ali at 3/4 is at 75%.
- **Reset on cycle end:** When the period ends, the rule is evaluated, the result is stored in history, and the next cycle starts with everyone at 0 points.

### 2.3 Period Options

| Option | Description |
|---|---|
| Weekly | Cycle is 7 days. Admin chooses the start day (e.g. every Monday). |
| Monthly | Cycle is 1 calendar month. Starts on a chosen day-of-month. |
| Custom days | Admin enters any number of days (e.g. 10 days or 21 days). Cycle repeats automatically. |
| One-shot | A single non-repeating cycle. After it ends, the room is archived. |

### 2.4 Rules (End-of-Cycle Outcome)

A room can have **a winner rule**, **a loser rule**, **both**, or **neither**. The admin configures each independently in room setup.

#### 2.4.1 Winner Rule

| Option | Outcome |
|---|---|
| Highest wins | The member with the most points wins. |
| Lowest wins | The member with the fewest points wins. (For reverse challenges, e.g. least screen time.) |
| Top N win | The top *N* members win (admin picks N — e.g. top 3). Useful for podium-style results. |
| Above threshold wins | Anyone who reached their personal target wins. Can be one person, many, or no one. |
| No winner | No winner is announced (room is just a leaderboard, or only the loser matters). |

#### 2.4.2 Loser Rule

| Option | Outcome |
|---|---|
| Lowest loses | The member with the fewest points loses. |
| Highest loses | The member with the most points loses. (For reverse challenges.) |
| Bottom N lose | The bottom *N* members lose (admin picks N — e.g. bottom 2). |
| Below threshold loses | Anyone who did not reach their personal target loses. Can be one person, many, or no one. |
| No loser | No loser is announced. |

#### 2.4.3 Combining Winner + Loser

The admin can mix and match freely. Common combinations:

| Winner Rule | Loser Rule | Use Case |
|---|---|---|
| Highest wins | Lowest loses | Classic challenge — best gets bragging rights, worst pays. |
| Top 3 win | No loser | Friendly podium, no punishment. |
| No winner | Below threshold loses | Original gym-challenge style — only the slackers are called out. |
| Above threshold wins | Below threshold wins | Same threshold splits the room into "achievers" and "missed it". |
| Highest wins | Bottom 2 lose | Reward the top, punish the bottom two. |
| No winner | No loser | Pure leaderboard for tracking only. |

#### 2.4.4 Rule Constraints
- A user cannot appear in **both** the winners list and the losers list of the same cycle. If the configured rules would cause overlap (e.g. *Top 3 win* + *Highest loses* with only 3 members), the winner rule takes precedence and the loser rule is skipped, with a note shown on the results screen.
- **Ties at the boundary** (e.g. two members tied for 3rd place when *Top 3 win* is set) trigger a Tie Breaker — admin chooses to include all tied members or pick manually.
- **N must be less than the number of members.** Admin cannot set *Top 3 win* in a 3-person room.

---

## 3. User Stories

### 3.1 Primary Story (from the user's idea)
Three friends — Ali, Ahmed, and Mustafa — want to push each other to go to the gym. Ali opens TallyUp and creates a room called **Gym Challenge**. He invites Ahmed and Mustafa by their User ID. Inside the room setup, he sets Ali = 4 points, Ahmed = 4 points, and Mustafa = 10 points, because Mustafa is more advanced. He picks the period **Weekly** and the rule **Lowest loses**. Each time one of them goes to the gym, he opens the room and taps a point. He can also tick several points at once if he forgot. At the end of the week, TallyUp shows the leaderboard, marks the one with the fewest points as the loser, and starts the next week automatically.

### 3.2 As a User
- I can sign up and get a unique User ID I can share with friends.
- I can create a room and invite friends by their User ID.
- I can accept or reject an invitation to a room.
- I can open a room and see my points, my target, and my progress percentage.
- I can tick a single point or several points at once at any time.
- I can undo a check-in if I tapped by mistake.
- I can see the progress of every other member in the room.
- I can see a history of past cycles and who won or lost.
- I can leave a room (if I am not the admin).

### 3.3 As an Admin
- I can create a room and choose a name and an emoji or icon.
- I can set a different point target for each member.
- I can choose the period: week, month, custom days, or one-shot.
- I can choose the **winner rule**: highest wins, lowest wins, top N win, above threshold, or no winner.
- I can choose the **loser rule**: lowest loses, highest loses, bottom N lose, below threshold, or no loser.
- I can enable both rules, only one, or neither.
- I can add or remove members during a cycle (changes apply next cycle — see §6.2).
- I can edit targets between cycles.
- I can pause or end the room.
- I can transfer admin rights to another member.

---

## 4. Features (Functional Requirements)

### 4.1 Authentication and Accounts
- Sign up with email + password, or with phone number + OTP.
- Optional social login (Google, Apple).
- Each user gets a unique, human-readable User ID (e.g. `ALI-2941`). The ID is generated at sign-up and is shareable.
- Profile fields: display name, avatar, User ID (read-only), language preference.
- Forgot password / OTP recovery flow.

### 4.2 Rooms

#### 4.2.1 Create Room
- Fields: room name (required), icon or emoji, description (optional).
- Period selection: Week / Month / Custom days / One-shot.
- For weekly and monthly: pick the start day.
- For custom: enter number of days (1–365).
- **Winner rule** selection: Highest wins / Lowest wins / Top N win / Above threshold / No winner. If Top N is chosen, admin enters N.
- **Loser rule** selection: Lowest loses / Highest loses / Bottom N lose / Below threshold / No loser. If Bottom N is chosen, admin enters N.
- Optional **stake** field (free text, e.g. "Loser pays for dinner"). Shown for fun — no money involved.

#### 4.2.2 Invite Members
- Admin enters a User ID and sends an invitation.
- Admin can share a deep link or QR code that opens the room invite directly.
- Invited user gets an in-app notification and a push notification.
- Invited user can accept or reject. On accept, admin is prompted to set their point target.

#### 4.2.3 Configure Targets
- Admin sees a list of members and an input next to each one to set the target (a positive integer).
- Targets can be different for each member.
- Bulk action: set the same target for everyone.

#### 4.2.4 Lifecycle
- **Draft:** room created but not started. Admin can still change everything.
- **Active:** cycle is running. Members can check in points.
- **Ended** (one-shot) or **Reset** (repeating): cycle is over, result is stored.
- **Paused:** admin can pause; check-ins are blocked, period clock stops.
- **Archived:** room is read-only; only history is visible.

### 4.3 Check-Ins
- Main room screen shows the current user's progress: `X / Target` with a progress bar.
- Big primary button: **+ 1 point**.
- Secondary action: **+ multiple**, opens a small picker (e.g. +2, +3, +5, custom).
- Long-press a previous check-in to undo it.
- A check-in cannot push the user above their target if admin enables the *cap at target* setting (default: cap on).
- Every check-in is logged with timestamp and shown in the activity feed.

### 4.4 Leaderboard
- In-room leaderboard: ordered list of all members.
- Each row shows: avatar, display name, points, target, progress bar, percentage.
- Sort options: by percentage (default), by raw points, by name.
- Indicator for the current user (highlighted row).
- Visual badges: **leader**, **at risk** (close to losing), **reached target**.

### 4.5 Cycle End and Results
- When the period ends, the system computes the result based on the rule.
- All members get a notification with the result, for example: *"Cycle ended in Gym Challenge — Ali won, Mustafa lost!"* or *"Top 3 in Study Sprint: Sara, Ahmed, Layla!"*
- A results screen shows the final leaderboard, the winner(s) (with podium for Top N), the loser(s), and an optional comment/photo from the loser.
- For repeating periods: the next cycle starts automatically. Targets carry over unless admin changed them.
- For one-shot: the room moves to Archived.

### 4.6 History
- Each room has a **History** tab listing every past cycle.
- Per cycle: dates, final scores, winner(s), loser(s), winner rule and loser rule used.
- Personal history in the profile: all cycles across all rooms, with wins, losses, and average score.

### 4.7 Notifications

| Event | Channel |
|---|---|
| Invited to a room | Push + in-app |
| Cycle starts | Push + in-app |
| Halfway reminder if behind target | Push (optional, user setting) |
| 24h before cycle ends if behind target | Push |
| Cycle ended, result announced | Push + in-app |
| A friend checks in a point (group activity) | In-app only (no push, to avoid spam) |

### 4.8 Settings
- Profile editing (name, avatar).
- Notification preferences.
- Language: English, Arabic (with RTL layout support).
- Theme: Light / Dark / System.
- Account: change password, delete account.

---

## 5. Storyboard (Step-by-Step)

This section follows the original user flow described in the project idea.

1. The user opens TallyUp and sees a **Home** screen listing all their rooms with current progress.
2. The user taps a room (e.g. **Gym Challenge**) and enters the room screen.
3. At the top, the user sees their own points and progress: **3 / 4 — 75%**.
4. The user taps **+ 1 point** to add a check-in (or **+ multiple** if they forgot several).
5. Below their progress, the user sees the leaderboard with every other member's points and progress.
6. The user can tap any member to see their detailed check-in history for the cycle.
7. If the user is the admin, an extra **Settings** button is shown to edit the room.
8. When the period ends, the app pushes a notification and opens the **Results** screen on next launch.

---

## 6. Edge Cases and Business Rules

### 6.1 Ties
- **Lowest loses / Highest wins + tie:** a *Tie Breaker* screen is shown to the admin. Options: include all tied members in the result, pick one manually, or skip (no winner/loser this cycle).
- **Top N / Bottom N + tie at the boundary:** same logic — admin can include all tied members (e.g. *Top 4* if 4 tied for 3rd) or pick manually.
- **Threshold rules:** no ties possible — every member is independently above or below their target.

### 6.2 Joining / Leaving Mid-Cycle
- **New member joins during a cycle:** they start at 0 points, but the system flags them as *joined late* so the result screen can show this. Admin can choose *include them in this cycle's result* or *skip*.
- **Member leaves during a cycle:** their data stays read-only until cycle ends, then they are removed.

### 6.3 Admin Leaves
- Admin must transfer admin rights before leaving. If only one member remains, the room is archived.

### 6.4 Time Zones
- Cycle boundaries follow the room's time zone, which defaults to the admin's time zone at creation.
- Check-in timestamps are stored in UTC and displayed in the viewer's local time zone.

### 6.5 Abuse Prevention
- A check-in cannot be backdated by the user. Only **undo** (within 24 hours of the action) is allowed.
- Rate limit: maximum 50 check-ins per user per day per room.
- If admin changes the rules (winner or loser) mid-cycle, the change applies only to the **next** cycle, not the current one.

---

## 7. Data Model (High Level)

### 7.1 Entities

| Entity | Key Fields |
|---|---|
| User | `id`, `userId` (public), `email`, `phone`, `displayName`, `avatarUrl`, `timezone`, `createdAt` |
| Room | `id`, `name`, `icon`, `description`, `adminUserId`, `period` (week/month/custom/oneshot), `customDays`, `startDay`, `winnerRule` (highest/lowest/topN/threshold/none), `winnerN`, `loserRule` (lowest/highest/bottomN/threshold/none), `loserN`, `status`, `currentCycleId`, `createdAt` |
| Membership | `id`, `roomId`, `userId`, `target`, `role` (admin/member), `joinedAt`, `leftAt` |
| Cycle | `id`, `roomId`, `cycleNumber`, `startsAt`, `endsAt`, `status` (active/ended), `resultJson` (contains `winners[]`, `losers[]`, final scores, rules applied) |
| CheckIn | `id`, `cycleId`, `userId`, `points`, `note`, `createdAt`, `undoneAt` |
| Invitation | `id`, `roomId`, `fromUserId`, `toUserId`, `status` (pending/accepted/rejected), `createdAt` |
| Notification | `id`, `userId`, `type`, `payloadJson`, `readAt`, `createdAt` |

### 7.2 Relationships
- A `User` has many `Memberships`. A `Room` has many `Memberships`.
- A `Room` has many `Cycles`, one of which is current.
- A `Cycle` has many `CheckIns`; each `CheckIn` belongs to one `User`.
- Aggregate score = `SUM(checkins.points)` for the cycle, excluding undone ones.

---

## 8. Screens and Navigation

### 8.1 Web App Layout
- Left sidebar: rooms list, plus button to create a room.
- Top bar: search, notifications bell, profile menu.
- Main panel: selected room (Overview / Leaderboard / Activity / History / Settings tabs).

### 8.2 Mobile App Layout
- Bottom tabs: **Rooms**, **Activity**, **Notifications**, **Profile**.
- Rooms tab opens a list; tapping a room opens its full screen with internal tabs.

### 8.3 Key Screens

| Screen | Purpose |
|---|---|
| Onboarding | Sign up, capture display name, show the new User ID. |
| Home / Rooms list | All rooms the user is in, with current progress bars. |
| Create Room (wizard) | Step 1 basics, Step 2 invite members, Step 3 set targets, Step 4 period + rule, Step 5 review. |
| Room Overview | User's progress, big **+ 1 point** button, leaderboard, cycle countdown. |
| Room Activity | Chronological feed of check-ins. |
| Room History | List of past cycles with final results. |
| Room Settings (admin) | Edit targets, rule, period, members, transfer admin. |
| Results Screen | Shown when a cycle ends, announces winner/loser. |
| Profile | Personal stats, User ID with copy/QR, settings. |
| Notifications | Unified list of invites and cycle events. |

---

## 9. Non-Functional Requirements

### 9.1 Platforms
- **Web app:** responsive, modern browsers (Chrome, Safari, Firefox, Edge).
- **Mobile app:** iOS 15+ and Android 9+. Recommended: React Native or Flutter for one shared codebase.

### 9.2 Performance
- Room overview loads in under 1 second on 4G.
- Check-in action confirmed in under 300 ms (optimistic UI).

### 9.3 Reliability
- Cycle-end job must run exactly once per cycle, idempotent.
- Offline check-ins on mobile are queued and synced when online.

### 9.4 Security and Privacy
- Rooms are private; only members can see contents.
- Email and phone never exposed to other users; only User ID and display name.
- Standard auth security: bcrypt/argon2 password hashing, JWT or session tokens, HTTPS only.
- GDPR-style account deletion: user can request full deletion of their data.

### 9.5 Localization
- English and Arabic at launch, with full RTL layout support for Arabic.
- All dates respect the user's locale and time zone.

---

## 10. Suggested Tech Stack

This is a recommendation, not a hard requirement. Adjust to your team's strengths.

| Layer | Recommendation |
|---|---|
| Backend | Node.js (NestJS or Express) or Python (FastAPI). REST + WebSocket for real-time leaderboard updates. |
| Database | PostgreSQL for relational data. Redis for caching and real-time presence. |
| Auth | Firebase Auth or Auth0, or a custom JWT implementation. |
| Web frontend | Next.js + Tailwind CSS. |
| Mobile | React Native (Expo) or Flutter — single codebase for iOS + Android. |
| Push notifications | Firebase Cloud Messaging (FCM) + APNs. |
| Scheduled jobs | BullMQ (Node) or Celery (Python) for cycle-end processing. |
| Hosting | Vercel for web; Railway / Render / AWS for backend. |

---

## 11. Phased Roadmap

### Phase 1 — MVP (4–6 weeks)
- Sign up / login with email.
- User ID generation and profile.
- Create room, invite by User ID.
- Per-user target setup.
- Weekly and Custom-days periods.
- Core rule options: **Highest wins** + **Lowest loses**, plus **No winner / No loser** toggles.
- Check-in (+1 and +multiple).
- Leaderboard and basic results screen.
- Web app first, then mobile.

### Phase 2 — Polish (2–4 weeks)
- Mobile app (React Native).
- Push notifications.
- All remaining rule options (Top N win, Bottom N lose, Above/Below threshold, Lowest wins, Highest loses).
- Monthly and One-shot periods.
- Activity feed and history.
- Arabic localization and RTL.

### Phase 3 — Growth (later)
- Social sharing: share results to WhatsApp, Instagram.
- Custom badges and streaks.
- Public room templates (gym challenge, study challenge, etc.).
- Group chat inside rooms.
- Apple Health / Google Fit integration for automatic check-ins.

---

## 12. Success Metrics
- **Activation:** % of new users who create or join a room within 24 hours.
- **Engagement:** average check-ins per active user per week.
- **Retention:** % of users completing at least 3 cycles.
- **Virality:** average number of invites sent per room.
- **Completion rate:** % of cycles that reach the end-of-cycle results screen.

---

## 13. Open Questions
- Should there be a free tier with limited rooms and a paid tier with unlimited rooms and history? *(Recommend free at launch.)*
- Should users be able to attach a photo as proof of a check-in? *(Nice to have, not MVP.)*
- Should rooms support more than one admin (co-admins)? *(Recommend yes in Phase 2.)*
- Should losers be public to everyone in the user's profile, or visible only inside the room? *(Recommend room-only for privacy.)*

---

*— End of PRD —*
