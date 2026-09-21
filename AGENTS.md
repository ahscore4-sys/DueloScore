# AGENTS.md — DueloScore Admin Control Panel

## Project Overview

The DueloScore admin control panel — the **authoritative content source**
for the mobile app (mobile is read-only). Admins manage matches, pre-match
lineups, live match control, events, news, diwaniya moderation, users,
membership plans, daily challenges, push notifications, ad configuration,
coverage match tracking, and broadcast notifications.

- Code: `admin/` (React web app).
- Working docs: `Admin Control Panel Spec.md`, `Admin Control Panel Screens.md`.
- Parent monorepo guide: `01 - Documentation/AGENTS.md`.

## Tech Stack

React 18 + TypeScript (Vite) · MUI v6 (full RTL) · React Router
(Routes/Route API) · TanStack Query + Zustand (planned) · Firebase
(full paid plan: Auth, Firestore, Storage, Cloud Functions, FCM) ·
External Sports API (match data for non-Barça/Madrid leagues) ·
Hosting: Hostinger static build.

## Screen & Navigation Architecture (IMPORTANT)

The **sidebar is visible on every screen** — there are no
standalone/separate sub-screen layouts.

- `src/layout/AppShell.tsx` is the persistent RTL frame: right sidebar
  (logo, main nav, "مباشر الآن" pill, admin profile) + main outlet.
- **All** routes render **inside** AppShell: nav screens (Dashboard,
  Matches, News, Diwaniya, Users, Challenges, Notifications, Settings)
  *and* drill-down sub-screens (e.g. a match row in Matches →
  MatchForm / PreMatch / LiveControl / Events).

Rules:

- All routes nest under `<Route element={<AppShell />}>`.
- Sub-screens: `/matches/new` (MatchForm), `/matches/:id/pre-match`
  (PreMatch), `/matches/:id/live` (LiveControl), `/matches/:id/events`
  (Events), `/matches/:id/statistics` (MatchStatistics), `/news/new` and
  `/news/:id/edit` (NewsEditor),
  `/diwaniya/:id` (DiwaniyaPostDetail), `/users/:id` (UserDetail),
  `/challenges/bank/new` and `/challenges/bank/:id` (QuestionEditor),
  `/settings/log` (ActivityLog), `/settings/admins` (AdminManagement),
  `/settings/tiers` (TierThresholds), `/settings/ads` (AdsConfig),
  `/settings/membership` (MembershipPlans).
- New drill-down screens MUST also render inside AppShell — never add
  a layout without the sidebar.
- MatchHub keeps **all four match sub-screens mounted** (Info, Pre-Match,
  Live, Statistics) and toggles visibility via `display` instead of
  unmounting, so each tab's UI state (Statistics sub-tab, team switcher,
  open dialogs, scroll position) survives tab switches. `MatchHubContext`
  exposes `setTabsStuck`, `statsPolling`, and `activeTab`.

### Navigation Items

| # | Nav Label | Route | Notes |
|---|-----------|-------|-------|
| 1 | الرئيسية (Dashboard) | `/` | Overview cards |
| 2 | المباريات (Matches) | `/matches` | Barca/Madrid full control |
| 3 | اللاعبون (Players) | `/players` | Player database |
| 4 | التغطية (Coverage) | popup menu | Commentators, Channels, Stadiums, Coverage Matches |
| 5 | الأخبار (News) | `/news` | X-like posts |
| 6 | الديوانية (Diwaniya) | `/diwaniya` | Posts hub (newest = hero) |
| 7 | المستخدمون (Users) | `/users` | User management |
| 8 | تحدي اليوم (Challenge) | `/challenges` | Daily trivia |
| 9 | الإشعارات (Notifications) | `/notifications` | Custom push |
| 10 | الإعدادات (Settings) | `/settings` | Admins, activity log, tiers, ads, membership (super_admin) |

## Project Structure — Clean Architecture (React-Adapted)

Feature-first with layered architecture inspired by Android Clean Architecture.
Each layer has a **single responsibility** and **unidirectional dependency**:
`ui → hooks → data → domain` (ui never imports data directly).

```
src/
├── App.tsx                         ← Router + layout wiring
├── core/                           ← Shared across ALL features
│   ├── data/                       ← Firebase init, shared services
│   │   └── firebase.ts
│   ├── domain/                     ← Shared types, interfaces, constants
│   │   └── types.ts
│   └── ui/                         ← Shared UI (theme, components)
│       ├── theme.ts
│       └── components/
│           ├── ChipSelector.tsx
│           ├── ConfirmDialog.tsx
│           ├── GlassCard.tsx
│           ├── LogoMark.tsx
│           └── LoadingOverlay.tsx
├── features/                       ← Feature modules (one per domain)
│   └── <feature>/                  (auth, match, news, diwaniya, user, player)
│       ├── domain/                 ← Types, repository interfaces, pure logic
│       ├── data/                   ← Repository implementations (Firebase)
│       └── ui/                     ← Pages, components, hooks, context
├── i18n/                           ← Translations (planned)
├── main.tsx                        ← Entry point (wraps app with providers)
├── mockData.ts                     ← Mock data (legacy, migrating away)
├── types.ts                        ← Legacy match types (migrating to features)
├── lib/                            ← Legacy match stores (migrating to features)
├── hooks/                          ← Legacy match hooks (migrating to features)
├── pages/                          ← Legacy pages (migrating to features)
└── components/                     ← Legacy components (migrating to features)
```

### Layer Responsibilities

| Layer | Contains | Depends On | Example |
|-------|----------|------------|---------|
| **domain** | TypeScript interfaces, pure functions, repository interfaces | Nothing (pure TS) | `AuthUser`, `UserRole`, `isAdmin()` |
| **data** | Firebase service implementations, API calls, mappers | domain | `auth.service.ts` → `signInWithEmailAndPassword()` |
| **ui** | React components, hooks (presentation logic), context | domain + data (via hooks) | `LoginPage`, `useAuth`, `AuthContext` |

### Rules

1. **Unidirectional dependencies**: `ui → hooks → data → domain`. Never `data → ui`.
2. **No Firebase imports in UI layer**: All Firebase calls go through `data/` services.
3. **Hooks consume services**: `useAuth()` calls `auth.service.ts`, not Firebase directly.
4. **UI consumes hooks only**: Components call `useAuth()`, never `auth.service.ts`.
5. **Domain is pure TypeScript**: No React, no Firebase, no side effects.
6. **Shared code lives in `core/`**: Theme, Firebase init, base types used by multiple features.

### Migration Strategy

Existing code (`src/lib/`, `src/hooks/`, `src/pages/`, `src/components/`) stays
in place until its feature milestone. Each feature is migrated individually:
- Move types → `features/<feature>/domain/`
- Move stores/services → `features/<feature>/data/`
- Move hooks/components → `features/<feature>/ui/`
- Update imports across codebase

New features **must** follow the Clean Architecture structure from day one.

## Language & UI Conventions

- Arabic RTL primary; English in parens when clearer (e.g. "المباريات (Matches)").
- Dark navy gradient `#060811 → #0A0E1C`, glassmorphism cards, radius 24/16/10.
- Cairo (headings/numbers) + Almarai (body) via @fontsource.
- Colors: primary `#0057A8`, gold `#FEBE10`, live green `#00E676`, red `#FF5252`, yellow `#FFB300`.

## Build & Verify

- `npm run dev` · `npm run build` (`tsc -b && vite build`) · `npm run lint` (oxlint).
- Run build + lint after changes.

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| `admin` | Granular `permissions[]` array — any subset of: matches, players, coverage, news, diwaniya, users, challenges, notifications, activity_log. Route guards + UI hide features not granted |
| `super_admin` | Bypasses all permission checks + manage admin users (promote/edit/revoke), tier thresholds, ads config, membership plan config, challenge question bank config |

Enforced via Firestore `admins/{uid}` collection (`role`, `permissions[]`) mirrored to
Firebase custom claims `{role, permissions}` by the `setAdminRole` Cloud Function
(`revokeAdmin` clears claims + deletes the doc), both revoking refresh tokens so
changes take effect immediately. Checked by route guards; super_admin only promotes
users from `/users/:id`.

## Feature Inventory

### F1. Match Control (المباريات)
Barcelona & Real Madrid matches: **admin-created and managed**.
Full lifecycle: CRUD → Pre-Match (4-step wizard) → Live Control
(state machine, auto-timer, extra time, penalties) → Event Logging
(quick-action grid, timeline, edit/undo with backend recalc) → Media
(video URLs). On **final**, the app auto-fetches post-match data from the
external API and caches it into Firestore: player ratings (`ratings`) and
team match statistics (`statistics`, from `/fixtures/statistics`) —
viewable in the Statistics tab (`/matches/:id/statistics`).

Live statistics: while a match is **in play**, the admin panel polls the
external API **every 10 seconds** (client-side `useMatchStatsPolling`,
run at the **MatchHub level** so it stays active across the whole match
screen — Pre-Match, Live Control, Statistics, Events — regardless of the
active tab; state is shared via `MatchHubContext` as `statsPolling`) and
caches both team statistics and **full per-player statistics**
(`/fixtures/players`) into Firestore. Live **player ratings** are derived
from `match.playerStatistics` (keyed by API player id) and merged into the
pitch/rows in Pre-Match so on-pitch ratings appear during the game, not
just after final. The Statistics screen has **two sub-tabs**:
"Match Statistics" (`matches.{id}.statistics` — team-level indicators)
and "Players Statistics" (`matches.{id}.playerStatistics` — per-player
breakdown with a logo-based team switcher and grouped stat sections:
shots, goals, passes, tackles, duels, dribbles, fouls, cards, penalties,
subs, shown in a stat **Dialog** opened by clicking any player card or its
arrow). In that dialog the admin also enters the player's **distance
covered** (المسافة المقطوعة, in كم) which is stored in
`matches.{id}.playersDistance.{playerId}` — a separate map so API
re-fetches never overwrite it.

- Types: `Match`, `MatchEvent`, `TeamPlan`, `Player`, `Team`, `MatchStatistics`, `PlayerFixtureStatistics`, `PlayerFixtureEntry`, `MatchPlayerStatistics`
- State machine: `not_started → first_half → half_time → second_half → full_time → (extra_first_half → extra_second_half → penalties → final) | final`
- Timer: starts at period start, stops at period end; extra-time minutes are informational.
- Event minute auto-format: `23:14 → 24'`, `47:12 → 45+3'`, `94:05 → 90+5'`.
- Second yellow auto-converts to red; event edit/delete triggers backend recalc.
- Goal events carry an optional `assistPlayer` (scorer's direct assistant).
- Missed penalties carry `penaltyMissCause: 'saved' | 'off_target'` (تصدّى لها الحارس / ضائعة): required in the event dialog, shown as a timeline subtitle, and fan-out body differs per cause (`onMatchEventCreated`/`onMatchEventUpdated` include `penaltyMissCause` in the push payload).
- Match attendance (`matches.{id}.attendance`) is editable from the Statistics tab and shown as a gold row in the statistics card.
- Event types: goal, opp_goal, og, yellow, red, pen_scored, pen_missed, sub, crossbar + synthetic `phase` markers.
- Phase markers (`type: 'phase'`, one per period actually played, derived once when a finished API fixture is imported): fixed minutes `1' / 45' / 46' / 90' / 91' / 105' / 106' / 120'` (penalties `120'`). End-of-match rule: when extra time occurred → `full_time` only; when the match ended without extra → `final` only.
- Imported fixture events: players keyed by **API player id** (name fallback); subs stored as `player` (in) / `playerOut` (out); second yellow imported as red with `secondYellow: true`; own goals flipped to the opposing team. Finished imports force `controlPhase`/`status = 'final'` (`clockBaseSeconds` 120/90 min) and auto-fetch ratings + statistics.

### F2. Coverage Matches (المباريات المغطاة)
Other league matches fetched from the **external sports API**.
Data is cached into Firestore. Once a covered match finishes, its
data is **saved into Firestore** permanently. Admin can **edit match
info** (primarily for Arabic translation of team names, competition
names, etc.). No pre-match, no live control, no events — scores,
live per-fixture statistics, and per-player statistics only.
Appears under the "التغطية" popup menu alongside
Commentators/Channels/Stadiums.

- Type: `CoverageMatch`
- Flow: external API → fetch & display → match finishes → save to Firestore → admin edits for Arabic
- Fields: home/away teams, competition, round, season, date, kickoff, stadium, channels, status, scores
- **Live per-fixture statistics** (same shape as `matches/{id}`): while a covered match is `in_progress`, the scheduled `liveCoverageTick` also fetches `/fixtures/statistics` + `/fixtures/players` (paginated) on the same ~20s cadence as the score poll and merges them into `coverage_matches/{id}.statistics` / `.playerStatistics` (+ `statisticsUpdatedAt` / `playerStatisticsUpdatedAt`), so the mobile app can render them with the same code paths it uses for `matches/{id}`. No client-side polling. A one-time final snapshot is captured on `finished` inside `saveCoverageMatchOnFinish`. Admins view them via the "إحصائيات" button on the coverage card → `CoverageStatsDialog`.
- **Season stats sync** (shared with Barcelona/Madrid matches via `seasonStatistics.ts`): on finish, `saveCoverageMatchOnFinish` fetches and caches current-season team + player statistics for both teams across all 4 leagues (140/2/143/556) into the competition DB (`competitions/{leagueId}/teams/{teamId}` and `/players/{playerId}`). Shows on team page via TeamStatisticsDialog / PlayerStatisticsDialog with manual refresh button.

### F1B. Season Statistics Sync (إحصائيات الموسم)
**Automatic**: whenever a match finishes (Barcelona/Madrid match → `final`; coverage match → `finished`), current-season team + player statistics are fetched from the external API (`/teams/statistics` + `/players`) for all 4 competitions (140/2/143/556) and upserted into the competition DB. Per-season keyed storage (`statistics: { [year]: {...} }`) preserves existing admin edits and other seasons.

- Trigger: `onMatchFinalized` — scoped to the match's **exact competition** via `matches/{id}.leagueId` (set on fixture import; falls back to all 4 competitions when absent); `saveCoverageMatchOnFinish` — scoped to `coverage_matches/{id}.competitionId` (falls back to all 4 when absent) → sync + saved
- Storage: `competitions/{leagueId}/teams/{teamId}` → `statistics.{season}`, `statisticsUpdatedAt`; `/players/{playerId}` → same structure. Each team season entry also stores **persisted leaderboards** (`topScorers`, `topAssists`, `topRated` — arrays of `{ playerId, name, photo, value }`, sorted high→low) so mobile reads them from a single team document.
- UI: team page hero "إحصائيات الموسم" button → TeamStatisticsDialog (form, tiles: W/D/L, goals, clean sheets, cards, penalty **+ leaderboards: top scorers, top assists, top-rated players** — read from the persisted arrays, with a live derivation fallback); player card BarChart icon → PlayerStatisticsDialog (rating ring, appearances/lineups/minutes/goals/assists, grouped stats, all from API)
- Manual refresh: `refreshTeamSeasonStatistics` onCall callable (admin-guarded). Syncs team stats **and every squad player's** season stats across all 4 competitions in one call; players fall back to the previous season when the current one is empty.

### F3. News (الأخبار)
X-like posts for Barcelona & Real Madrid news. Full CRUD with
**instant publishing** (no draft state) — creating a post notifies
the chosen team's fans via its topic (`all_news`, `barcelona_news`,
or `realmadrid_news`). Posts support an **updates thread** of
sub-posts (only post creation notifies; updates never do). Delivery
status is tracked per post (`notifiedAt`) with an admin re-send
action for failures.

- Types: `NewsPost`, `NewsUpdate`
- Post fields: title, content, imageUrl/imagePath (16:9-cropped at upload), team, tag, author, sourceUrl, likedBy[], updatesCount, notifiedAt
- Teams: all / barcelona / realmadrid · Tags: transfers / injuries (no video tag)
- Likes: `likedBy` array of user IDs (count = length; mobile checks membership for colored heart)
- Updates: newest-first thread on `/news/:id`; add/edit/delete via dialogs

### F4. Diwaniya (الديوانية)
Admin creates argumentative **posts** (no categories in UI — every post
is an argumentative question with options). Both teams' fans vote with
their choice AND reply/comment to argue with each other. No voting
component on comments — just answers and threaded replies.

Hub layout (`/diwaniya`): newest post renders as the Hero card at top;
past posts list below in a 2-column grid ordered newest→oldest with
"load more" pagination (10/page). No pinning feature. The feed window
syncs live via Firestore snapshots (lock/hide reflect instantly).

Moderation: hide/restore (never hard-delete), reports queue with
auto-hide threshold config (`settings/moderation`, edited inline in the
reports tab), comment depth cap 5. Admins can also file reports on
comments from the post detail page (writes to `reports/`, counted by
the `onReportCreated` Cloud Function).

- Types: `DiwaniyaPost`, `Comment`, `Report`
- Post creation: question text + 2–4 reorderable options + optional
  `endsAt`; stored as `type='poll'`
- Voting: one vote per user per poll, changeable while open;
  aggregates (`totalVotes`, `votesByTeam`) maintained by
  `onPollVoteWrite`; hero shows per-option total + Barcelona/Real Madrid splits
- Poll expiry: `onPollExpired` (every 1 min) sets `pollStatus='closed'`
  and records `winningOptionId` once past `endsAt`
- Comments: nested threads via `parentId`, `rootId`, `depth` (cap 5,
  enforced by `onCommentCreated`)
- No voting/ranking on comments — pure discussion

### F5. User Management (المستخدمون)
User list with search/filter, user detail (profile, tier, points,
devices), manual points adjustment (writes to `points_log`),
broadcast push to team topic or all users. super_admin promotes a
normal user to admin from `/users/:id` with a granular permission
set (edit/revoke existing admins too).

- Types: `User`, `AdminPermission`, `AdminUser`, `PointsLog`, `Device`
- Cloud Functions: `setAdminRole`, `revokeAdmin`, `sendTopicNotification` (whitelisted topics), `recomputeTier`

### F6. User Levels/Tiers (المراتب)
Loyalty tier system with configurable thresholds (`settings/tiers`,
fallback defaults `[0, 500, 1500, 3500, 7000]`). Points earned via:
daily challenges, admin adjustments.
Tier recompute via the `recomputeTier` Cloud Function (trigger on
`points_log` create) after any points change.

### F7. Today's Challenge (تحدي اليوم)
Daily trivia quiz. **Auto-published** at midnight Kuwait time by a
scheduled Cloud Function (no manual publish button). Admin manages a
**question bank** (multiple-choice: text questions or deformed-image
guess). Each user gets a **different random question** from the active
pool via lazy assignment. Answers are graded after the challenge ends.

**Weekly streak**: 7 challenges (Fri→Thu). If a user misses a day,
their current week's total points are **lost** (not added to overall).
Points from completed challenges that week are also forfeited.

- Types: `ChallengeQuestion`, `DailyChallenge`, `ChallengeResponse`, `WeeklyLeaderboardEntry`
- Question types: text (multiple choice), image (deformed image guess)
- Question bank: CRUD, active/inactive toggle (difficulty stored but hidden from UI)
- Auto-publish: scheduled CF creates challenge at Kuwait midnight (00:00–23:59:59)
- Random assignment: `getTodaysChallenge` CF lazily picks random active question per user
- Grading: `finalizeDailyChallenges` CF grades all responses after endTime, updates leaderboard
- Weekly leaderboard: `weekly_leaderboard/{weekId}` embedded entries array, merged daily
- Firestore: `challenge_questions`, `challenges`, `challenge_responses`, `weekly_leaderboard/{weekId}`
- Cloud Functions: `autoPublishDailyChallenge`, `getTodaysChallenge`, `submitChallengeResponse`, `finalizeDailyChallenges`

### F8. Custom Push Notifications (إشعارات مخصصة)
Full admin control. Create notifications with title, body, image,
target audience (all / Barcelona fans / Real Madrid fans),
deep link. Schedule for later or send immediately. Notification
history with delivery stats.

- Type: `PushNotification`
- Firestore: `push_notifications`
- Cloud Function: `sendPushNotification` (queries target users, sends via FCM)

### F9. Admin Activity Log (سجل الأنشطة) — Settings Tab
**All** admin actions logged. **Settings tab** at `/settings/log`
(embedded via `showHeader={false}`).
Filters: by admin, action type (log category), date range, search.

- Type: `ActivityLogEntry`
- Action types: match/event/news/diwaniya/user/notification/challenge/coverage/settings/session operations
- Firestore: `admins/{uid}/log/{logId}` — per-admin sub-collection, heterogeneous docs (payload varies by log type); super_admin reads via `collectionGroup('log')`
- Access: every admin sees their own log; super_admin sees all admins' logs (admin dropdown + category filter). Logs persist after admin revocation. Non-super-admins access their log via Profile page "سجل أنشطة" button → `/settings/log`.
- Helper: `logActivity()` function called by every admin action (fire-and-forget; never blocks the parent action)

### F10. AdMob Ads Management (إدارة الإعلانات)
Admin configures mobile ad placement (no ad content — config only).
Toggle enable/disable, ad unit IDs (Android/iOS), frequency capping,
banner position, test mode. Lives inside Settings as a tab.

- Type: `AdConfig`
- Firestore: `settings/ads`

### F11. Membership Plans (خطط العضوية)
Admin configures membership tiers and plans. Mobile app handles
**payment automatically** (Stripe/IAP → Cloud Function validates
→ activates membership instantly). Admin configures plans and
views subscribers. Lives inside Settings as a tab.

Suggested tiers (configurable names):
- مجاني (Free) — default, ads shown, basic features
- برونزي (Bronze) — reduced ads, basic badge
- فضي (Silver) — no ads, exclusive badges, priority in polls
- ذهبي (Gold) — all Silver perks + exclusive content, custom themes

- Types: `MembershipPlan`, `MembershipSubscription`
- Firestore: `membership_plans`, `membership_subscriptions`
- Cloud Function: `onPaymentSuccess` — validates receipt, activates subscription

## Data Sources

| Data Type | Source | Admin Role |
|-----------|--------|------------|
| Barca/Madrid matches | Admin-created | Full CRUD + live control |
| Other league matches | External Sports API | Fetch, edit for Arabic, save on finish |
| News posts | Admin-created | Full CRUD + publish |
| Diwaniya posts/polls | Admin-created | Full CRUD, moderate (hide/restore), reports queue |
| User profiles | Users create via mobile | View, adjust points, assign roles |
| Challenge questions | Admin-created | Full CRUD on question bank |
| Challenge scheduling | Auto-published | Scheduled CF creates daily challenge at midnight Kuwait time |
| Push notifications | Admin-created | Full CRUD + send/schedule |
| Ad config | Admin-configured | Settings only |
| Membership plans | Admin-configured | Settings only |
| Membership payments | Mobile app (auto-activated) | View subscribers only |
| Activity logs | Auto-logged | View + filter only |
| Players | Admin-managed (pre-match) | For match pre-match wizard |
| Commentators/Channels/Stadiums | Admin-managed | Coverage settings |

## Firebase Services Map

| Firebase Service | Features Using It |
|-----------------|-------------------|
| Auth | Login, session, custom claims (roles) |
| Firestore | All data (matches, events, news, diwaniya, users, challenges, notifications, settings, logs, membership, coverage) |
| Storage | News images, user avatars, challenge images, notification images |
| Cloud Functions | Event recalc, news publish push + re-send, admin role management, topic push, tier recompute, poll vote aggregation, comment depth enforcement, report auto-hide, payment validation, daily challenge assignment, coverage match save |
| FCM | News publish fanout, custom push notifications, match event notifications |

## Coding Conventions

- No comments unless necessary; no commented-out code.
- Match existing patterns: `GlassCard`/`ConfirmDialog` from
  `core/ui/components`, `MatchStatusBadge`; MUI `sx` over inline styles.
- Features run on real Firestore repositories through the clean-architecture
  `data/` layer — UI never imports Firebase directly (match feature still has
  legacy `lib/`+`hooks/` code pending migration).

## Route Map

```
/                                    Dashboard
/matches                             Matches List
/matches/upcoming                    Upcoming Fixtures
/matches/new                         Match Form (create)
/matches/:id                         Match Hub (tabs)
/matches/:id/info                    Match Info
/matches/:id/pre-match               Pre-Match Wizard
/matches/:id/live                    Live Control
/matches/:id/events                  Events Timeline
/matches/:id/statistics              Match Statistics (2 sub-tabs: Match + Players)
/players                             Players
/commentators                        Commentators (coverage)
/channels                            Channels (coverage)
/stadiums                            Stadiums (coverage)
/coverage/matches                    Coverage Matches
/news                                News List
/news/new                            News Create
/news/:id                            News Detail (updates thread)
/news/:id/edit                       News Edit
/diwaniya                            Diwaniya Hub
/diwaniya/:id                        Diwaniya Post Detail
/users                               Users List
/users/:id                           User Detail
/challenges                          Challenge Dashboard
/challenges/bank                     Question Bank
/challenges/bank/new                 Create Question
/challenges/bank/:id                 Edit Question
/challenges/history                  Challenge History
/notifications                       Notifications Hub
/activity-log                        Redirects to /settings/log
/settings                            Settings (tabbed shell; index redirects to /settings/log)
/settings/log                        Activity Log (all admins)
/settings/admins                     Admin Management (super_admin)
/settings/tiers                      Tier Thresholds (super_admin)
/settings/ads                        Ads Configuration (super_admin)
/settings/membership                 Membership Plans (super_admin)
/profile                             Admin Profile
/login                               Login
```

## Firestore Collections

```
admins/{uid}                        (doc ID = Firebase Auth UID; fields: name, email, role, permissions[])
matches/{matchId}
matches/{matchId}/events/{eventId}  (event subcollection; triggers score recalc)
news/{postId}
news/{postId}/updates/{updateId}
diwaniya/{postId}
comments/{commentId}
poll_votes/{pollId}_{userId}
reports/{targetType}_{targetId}_{reporterId}
users/{userId}
points_log/{logId}
challenge_questions/{questionId}
challenges/{challengeId}
challenge_responses/{challengeId}_{userId}
weekly_leaderboard/{weekId}
push_notifications/{notificationId}
admins/{uid}/log/{logId}
membership_plans/{planId}
membership_subscriptions/{subscriptionId}
coverage_matches/{matchId}
competitions/{leagueId}                        (doc per competition: leagueId, name, logo, season)
competitions/{leagueId}/teams/{teamId}         (team doc; `statistics: { [season]: {...} }` + `statisticsUpdatedAt`)
competitions/{leagueId}/teams/{teamId}/players/{playerId}   (player doc; `statistics: { [season]: {...} }` + `statisticsUpdatedAt`)
settings/ads
settings/moderation
settings/tiers
```

## Settings Tabs Layout

The Settings page (`/settings`) uses a tabbed layout:

| Tab | Access | Contents |
|-----|--------|----------|
| Activity Log | all admins | Activity log with filters (embedded from M9) |
| Admin Management | super_admin | Add/revoke admin roles via custom claims |
| Tier Thresholds | super_admin | Loyalty tier point boundaries |
| Ads Configuration | super_admin | AdMob settings (enable/disable, unit IDs, frequency) |
| Membership Plans | super_admin | Plan CRUD, pricing, benefits, subscriber list |
