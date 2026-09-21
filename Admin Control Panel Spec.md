# DueloScore — Admin Control Panel Specification

**Version:** 1.1  
**Status:** Approved — drives all admin panel development  
**Platforms:** Web (browser)  
**Language:** Arabic RTL primary; English terms in parentheses where clearer  
**Backend:** Firebase (Auth, Firestore, Functions, Storage, FCM)  
**Hosting:** Hostinger (static build)

---

## 1. Scope

This document is the canonical specification for the **DueloScore Admin Control Panel** — the web application used to manage live matches, match events, news content, community moderation, users, and broadcast notifications. The mobile app spec is covered separately in `Mobile App Features.md`.

The admin panel is the **authoritative content source** for everything the mobile app shows. Mobile users are read-only; all writes happen here (via Firebase Admin SDK privileges / security rules).

---

## 2. Tech Stack

| Area | Choice |
|------|--------|
| Framework | React 18 + TypeScript (Vite) |
| UI Kit | MUI (v6) with full RTL support |
| Routing | React Router v6 |
| Server State | TanStack Query + Firestore real-time listeners |
| UI/Local State | Zustand (timer, forms, live-match UI state) |
| Data | Firebase Firestore (real-time listeners) |
| Auth | Firebase Auth (email/password) + admin custom claims |
| Storage | Firebase Storage (avatars, news images) |
| Notifications | Firebase Cloud Messaging (FCM topics) |
| Backend Functions | Firebase Cloud Functions (Node.js/TS) |
| Hosting | Hostinger (static Vite build → `public_html`) |

---

## 3. UI Language Convention

- **Arabic RTL primary** — MUI `ThemeProvider direction="rtl"`, Cairo (headings) + Almarai (body) fonts, mirrored layout.
- When a concept is clearer in English, append the English term in parentheses next to the Arabic word, e.g. "المباريات (Matches)", "المشجع (Fan)".
- The admin panel follows the same design language as the mobile app: dark navy gradient background (`#060811 → #0A0E1C`), glassmorphism cards, rounded corners (24/16/10).
- All validation, errors, and empty states are in Arabic (with English in parentheses where useful).

---

## 4. Project Structure (monorepo)

The panel follows a **feature-first modular architecture** with Clean-Architecture-style layering inside each feature: `domain/` (pure types + logic), `data/` (repository interface + implementations), `hooks/` (data hooks — the ViewModel layer), `ui/` (components). Components only consume hooks; hooks only consume the repository interface. The first milestone ships **mock repositories** (static pages); the real Firestore repositories replace them later with **zero UI changes**.

```
DueloScore/
└── admin/
    ├── src/
    │   ├── app/             # composition root: providers, theme, router, layout outlet
    │   ├── core/            # shared domain: types (§7), pure logic (state machine, minute formatting), firebase init
    │   ├── shared/          # reusable UI primitives, guards, generic hooks
    │   ├── features/
    │   │   ├── auth/        # login screen, session
    │   │   │   └── {domain,data,hooks,ui}
    │   │   ├── dashboard/   # overview cards, quick actions
    │   │   ├── matches/     # match list + create/edit metadata
    │   │   ├── preMatch/    # 4-step pre-match wizard
    │   │   ├── liveMatch/   # state machine, timer, penalty shootout
    │   │   ├── events/      # quick-action grid, timeline, event editing
    │   │   ├── media/       # summary + event video URLs
    │   │   ├── news/        # news posts CRUD + publish/draft
    │   │   ├── diwaniya/    # daily poll pinning + post/comment moderation
    │   │   ├── users/       # users, loyalty tiers, admin promotion
    │   │   └── settings/    # admin management, tier thresholds, broadcast
    │   ├── i18n/            # Arabic RTL strings + EN-in-parens convention
    │   ├── theme/           # MUI RTL theme, dark palette, Cairo/Almarai fonts
    │   ├── router/          # routes + auth/role guards
    │   ├── lib/             # Firestore services, types, utils (match time formatting)
    │   └── hooks/           # real-time Firestore hooks, auth hooks
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 5. Roles & Permissions

| Role | Permissions |
|------|-------------|
| `admin` | Granular `permissions[]` array — any subset of: matches, players, coverage, news, diwaniya, users, challenges, notifications, activity_log. Route guards + UI hide features not granted |
| `super_admin` | Bypasses all permission checks + manage admin users (promote/edit/revoke), tier thresholds, ads config, membership plan config |

- Implemented via Firebase **custom claims** (`token.role`, `token.permissions`) set by the `setAdminRole` Cloud Function.
- Route guards + Firestore security rules enforce role/permission-based access.
- super_admin promotes a normal user to admin from the user detail page (`/users/:id`).
- The mobile app never writes to admin-managed content (read-only).

---

## 6. Feature Specifications

### 6.1 Auth (تسجيل الدخول)

**Purpose:** Secure access to the control panel.

**Behaviors:**
- Email + password login via Firebase Auth with persistent session.
- Session restoration on reload; redirect to login when unauthenticated.
- Role check (`admin` / `super_admin`) on session load; block unauthorized accounts.
- Loading/error states; Arabic validation messages.
- Logout clears session.

**Data needs:** Firebase Auth; custom claims stored server-side (Cloud Function to set/revoke).

---

### 6.2 Dashboard (الرئيسية)

**Purpose:** At-a-glance overview of the operational status.

**Sections:**
1. **Live match status card** — current match, period state, score, timer; "التحكم بالمباراة (Live Control)" button.
2. **Today's fixtures** — upcoming matches today with kickoff times.
3. **Latest events** — last 10 logged events across live matches.
4. **News drafts count** — published vs draft posts.
5. **Open polls** — active/pinned diwaniya polls (posts with `type: 'poll'`) with expiry.
6. **Quick actions** — new match, new news post, start live control, pin daily poll.

**Data needs:** live Firestore listeners on `matches`, `match_events`, `news_posts`, `diwaniya`.

---

### 6.3 Matches (المباريات)

**Purpose:** Create and manage match records and metadata.

**Behaviors:**
- Match list with filters: competition (La Liga / UEFA / Spain Cup / Spain Super Cup), status (not started / live / finished), team.
- Create/edit match metadata:
  - Home team, away team
  - Competition + round/season
  - Stadium, broadcast channels, commentators
  - Kickoff time
  - Summary video URL
- Match status is driven by the live state machine (see 6.5).
- Opponent data (non-Barça/Madrid) pulled from the external sports API — read-only merge, no manual entry in v1.

**Data needs:** `matches/{matchId}`.

---

### 6.4 Pre-Match Setup (تحضير المباراة)

**Purpose:** Prepare Barcelona and Real Madrid squads before kickoff.

**4-step wizard:**
1. **الخطة (Team Plan / Formation)** — select tactical formation.
2. **التشكيلة (Lineup)** — assign starting XI to formation positions.
3. **البدلاء (Alternates / Bench)** — select substitute players.
4. **المصابون (Injured Players)** — create the injured list.

**Behaviors:**
- Wizard runs separately for Barcelona and Real Madrid.
- Opponent lineups come from the external API (not manually entered).
- Formation validation: valid player count per slot (e.g., 4-3-3), no duplicate players.
- Saved to the match document; visible to mobile in real time.

**Data needs:** `matches/{matchId}` (homeLineup, awayLineup, formation, injured list).

---

### 6.5 Live Match Control (التحكم بالمباراة)

**Purpose:** Operate the match as a state machine with an automatic timer.

**State machine:**

```
Not Started → 1st Half → Half Time → 2nd Half → Full Time
                                                    ├─ Extra Time (1st/2nd) → Penalties → Final
                                                    └─ Penalties (direct) → Final
```

**Behaviors:**
- Buttons appear based on current state only (e.g., "بدء الشوط الأول" only when Not Started).
- **Timer:** starts when the admin starts a period, runs automatically, stops when the admin ends the period.
- **Extra time:** the admin may input the announced extra-time minutes — this is **informational only**; the actual timer keeps counting until the admin ends the period.
- **Penalty shootout:** opens a separate screen/dialog:
  - one section per team,
  - player selector filtered to players on the pitch at full time,
  - score / fail buttons per kick,
  - running shootout score updated in real time.

**Data needs:** `matches/{matchId}` (status, period timers, extra time minutes), `match_events` (penalty shootout events).

---

### 6.6 Event Logging (تسجيل الأحداث)

**Purpose:** Rapidly log match events during live play.

**Quick-action grid event types:**
- هدف (Goal)
- هدف الخصم (Opponent Goal)
- بطاقة صفراء (Yellow Card)
- بطاقة حمراء (Red Card)
- ركلة جزاء مسجلة (Penalty Scored)
- ركلة جزاء ضائعة (Missed Penalty)
- تبديل (Substitution)
- كرة على العارضة (Missed Kick at Crossbar)

**Behaviors:**
- Tapping an event type opens a tailored mini-form:
  - Goal → choose scorer
  - Yellow/Red card → choose player
  - Penalty → choose taker + scored/missed
  - Substitution → choose player out + player in
- **Auto-timestamp:** the backend assigns the event minute automatically based on the current match state:
  - Normal running time, e.g. `23:14` → `24'`
  - First-half stoppage, e.g. `47:12` → `45+3'`
  - Second-half stoppage, e.g. `94:05` → `90+5'`
- **Second yellow rule:** giving a player a second yellow automatically converts to a red card event (reduces live-reporting errors).
- **Player status flags:** the interface visually flags carded/substituted/off-pitch players (e.g., yellow flag next to a booked player).

**Data needs:** `match_events/{eventId}`.

---

### 6.7 Event Timeline & Editing (المخطط الزمني وتحرير الأحداث)

**Purpose:** View, correct, and undo events (VAR-style).

**Behaviors:**
- Chronological timeline of all events with minute, type, player, team.
- Edit any event: player, event type, event time, video URL, and other fields.
- Delete/undo any event (incorrectly logged or overturned by VAR).
- **Backend recalculation** on every edit/delete:
  - score,
  - player status (cards, red, substitutions),
  - substitutions / lineup restoration,
  - timeline order,
  - any derived state.
- Example: deleting a goal decreases the score; reversing a substitution restores the lineup.
- Mobile app updates in real time with no manual refresh.

**Data needs:** `match_events`; Cloud Functions `onEventUpdated` / `onEventDeleted`.

---

### 6.8 Media & Videos (الوسائط)

**Purpose:** Assign match and event video URLs.

**Behaviors:**
- **Match summary video URL** — when set, mobile shows "مشاهدة الملخص (Watch Summary)"; hidden when empty.
- **Per-event video URL** — each event can carry a video clip URL; mobile shows a play button only when present.
- All assigned URLs are editable at any time.

**Data needs:** `matches/{matchId}` (summaryVideoUrl), `match_events/{eventId}` (videoUrl).

---

### 6.9 News Management (الأخبار)

**Purpose:** Publish and manage the mobile news feed.

**Behaviors:**
- CRUD news posts: title, body, image, optional video thumbnail, author, team tag.
- Team tags: الكل (All), ريال مدريد (Real Madrid), برشلونة (Barcelona), الانتقالات (Transfers), الإصابات (Injuries), فيديو (Video).
- Draft / published status.
- Publishing triggers a Cloud Function that fans out an FCM notification to the team topic (`barcelona_news` / `realmadrid_news`).
- Deletes hide the post from mobile immediately (real-time).

**Data needs:** `news_posts/{postId}`.

---

### 6.10 Diwaniya Moderation (الديوانية)

**Purpose:** Run the community hub — per-team polls, fan posts, nested comment threads — and moderate everything across both team zones.

**Community model:**
- Diwaniya is split into **two team zones** (`barcelona` and `realmadrid`), defined by the `team` field on posts, polls, and comments.
- **Open raiding:** any authenticated user (regardless of favorite team) may post, comment, and vote in either zone. The author's `authorTeam` is always stored, so cross-zone activity is visible to users (raid badge) and to moderators.
- **Polls are a post type:** a poll is a `diwaniya` document with `type: 'poll'` carrying `question`, `options`, `endsAt`, `pinned`, `pollStatus`, `totalVotes`, `votesByTeam`. Comments attach to it like any other post. There is no separate `diwaniya_polls` collection.
- **Voting:** each user gets exactly one `poll_votes/{pollId}_{userId}` document; they may change their vote while the poll is `open` (the Cloud Function adjusts aggregates on every write). `votesByTeam` stores each option's count split by the voter's favorite team, so raid influence is transparent.
- **Comments & replies:** comments support **full nested threads** via `parentId`, `rootId`, and `depth` (hard cap = 5). A Cloud Function maintains `repliesCount` and enforces the depth cap.

**Behaviors:**
- **Polls** — create a poll for a specific team (question, options, `endsAt`, optional pin); optional "mirror" shortcut posts the same question to both zones at once. Reopen/close a poll manually. View live results: per-option totals plus the per-team breakdown.
- **Feed moderation** — browse posts by zone; filter by type (poll/text) and team; hide/restore posts; cross-zone authors flagged with a raid badge.
- **Comment moderation** — expand nested threads, hide/restore any comment at any depth.
- **Reports queue** — users may report posts and comments (`reports` collection); the queue lists reported targets by report count and recency with reasons, and jumps to hide/restore. Report counts aggregate on the target. A configurable **auto-hide threshold** (in `settings`) may auto-hide a target once it exceeds N reports (0 = disabled).
- **Hide with restore** — moderators hide content (`hidden`, `hiddenAt`, `hiddenBy`), never hard-delete; hidden content is invisible to mobile and fully restorable.

**Data needs:** `diwaniya`, `comments`, `poll_votes`, `reports`, `settings`.

---

### 6.11 Users, Tiers & Admin Promotion (المستخدمون والمراتب)

**Purpose:** Manage fans, loyalty tiers, and admin roles.

**Behaviors:**
- **Users list** — profile info, favorite team, tier, points, devices, joined date; search/filter.
- **Manual points adjustment** — add/deduct points; writes to `points_log` and triggers tier recompute via Cloud Function.
- **Promote-to-admin** (super_admin only) — from user detail, assign the `admin` role with a granular permission set (checkboxes per feature: matches, players, coverage, news, diwaniya, users, challenges, notifications, activity_log); writes custom claims + `admins/{uid}` via Cloud Function.
- **Edit/revoke admin** (super_admin only) — adjust an existing admin's permissions or revoke admin access entirely.
- **Broadcast push** — send a notification to a team topic (`barcelona_news` / `realmadrid_news`) or all users (admin-only action via Cloud Function).

**Data needs:** `users`, `admins`, `points_log`, FCM topics.

---

### 6.12 Settings (الإعدادات)

**Purpose:** Manage the panel itself.

**Behaviors:**
- **Admin management** (super_admin only): list admins with their permission sets, edit permissions / revoke — promotion itself happens from the user detail page (§6.11), all via custom claims.
- **Tier thresholds** — configure loyalty tier point thresholds (backend-driven, applied without an app update).
- General panel preferences.

**Data needs:** Firebase custom claims; `settings`/config document for tier thresholds.

---

## 7. Firestore Data Model (used by admin)

All collections are shared with the mobile app (see AGENTS.md and `Mobile App Features.md`).

```
matches/
  {matchId}/
    homeTeam, awayTeam, competition, round, season, stadium,
    channels, commentators, kickoff, status,
    homeScore, awayScore,
    homeLineup, awayLineup, formation, injured,
    summaryVideoUrl, metadata

match_events/
  {eventId}/
    matchId, type, playerId, playerName, team,
    minute, timestamp, videoUrl, createdAt

news_posts/
  {postId}/
    title, content, imageUrl, videoThumbnailUrl, team,
    status (draft/published), author, createdAt

diwaniya/
  {postId}/
    authorId, authorName, authorTier, authorTeam, text, team, type,
    createdAt, reactions,
    hidden, hiddenAt, hiddenBy,
    reportCount, reportedBy: [userId],
    [type='poll'] question, options: [{id, text}], endsAt, pinned,
                  pollStatus (open/closed), totalVotes,
                  votesByTeam: { barcelona: {optionId: count, total}, realmadrid: {...} }

comments/
  {commentId}/
    postId, parentId, rootId, depth, repliesCount,
    authorId, authorName, authorTier, authorTeam, text, createdAt,
    hidden, hiddenAt, hiddenBy,
    reportCount, reportedBy: [userId]

poll_votes/
  {pollId}_{userId}/
    pollId, userId, optionId, team, createdAt

reports/
  {targetType}_{targetId}_{reporterId}/
    targetType (post/comment), targetId, reporterId, reason, createdAt

users/
  {userId}/
    name, email, profilePicture, favoriteTeam, points, tier,
    tierProgress, devices: [{token, platform}], createdAt

admins/
  {uid}/
    name, email, role (admin/super_admin), permissions[], createdAt
    — doc ID = Firebase Auth UID; super_admin bypasses permissions[]

points_log/
  {logId}/
    userId, points, reason, ref, createdAt
```

---

## 8. Firebase Cloud Functions (shared backend)

- `onEventCreated` — assign/format event minute; fan-out match-event notification to team topic; trigger recalc.
- `onEventUpdated` / `onEventDeleted` — recalculate score, player status, substitutions, timeline order.
- `onNewsCreated` / `onNewsPublished` — fan-out news notification to team topic.
- `awardDailyPoints` — scheduled daily streak/activity reward.
- `recomputeTier` — recalculate loyalty tier after points changes.
- `sendTopicNotification` — broadcast push to a team topic (admin-triggered).
- `setAdminRole` — set/revoke admin custom claims `{role, permissions}` + `admins/{uid}` doc (super_admin only).
- `onPollVoteWrite` — on poll vote create **or change**, atomically update the poll's per-option counts, `totalVotes`, and `votesByTeam` breakdown (decrement old option/team bucket, increment new); reject votes on closed polls.
- `onCommentCreated` — maintain `repliesCount` on the parent/root comment; enforce the max thread depth (5).
- `onPollExpired` — scheduled; auto-close polls past `endsAt`, set `pollStatus = closed`, mark the winning option.
- `onReportCreated` — increment `reportCount` on the target and append to `reportedBy`; apply the `settings` auto-hide threshold if configured.

---

## 9. Security Rules

- Admin-only writes: `request.auth.token.role in ['admin', 'super_admin']` for `matches`, `match_events`, `news_posts`, `diwaniya`.
- Mobile users: read-only on match/news/event content; read/write only their own `users/{uid}`, `poll_votes` (self-only create/update while the poll is open), `reports` (self-only create, doc-id uniqueness), `comments`, `diwaniya`.
- Hidden content (`hidden: true`) in `diwaniya` and `comments` is readable only by admins.
- Poll voting is open to all authenticated users in both zones (raids allowed); poll-open/closed enforcement happens server-side in `onPollVoteWrite`.
- Cloud Functions write via the Admin SDK (bypasses client rules).

---

## 10. State Machine Details

| State | Allowed Next States |
|-------|---------------------|
| `not_started` | `first_half` |
| `first_half` | `half_time`, `full_time` (abandon) |
| `half_time` | `second_half` |
| `second_half` | `full_time` |
| `full_time` | `extra_first_half`, `penalties`, `final` |
| `extra_first_half` | `extra_second_half` |
| `extra_second_half` | `penalties`, `final` |
| `penalties` | `final` |
| `final` | (terminal) |

Timer rules:
- Period start → timer starts; period end → timer stops.
- Extra-time input minutes are informational only; the real timer continues until the admin ends the period.

---

## 11. Deployment (Hostinger)

1. `vite build` → static bundle.
2. Upload the `dist/` output to Hostinger (hPanel File Manager or SSH) into `public_html`.
3. Firebase config injected via `VITE_*` environment variables at build time (never committed).
4. Firebase remains the backend: Auth, Firestore, Functions, Storage, FCM.
5. No Firebase Hosting or Vercel for the admin panel.

---

## 12. Implementation Phases

1. **Foundation** — Vite + React + TS scaffold; MUI RTL dark theme; routing + guards; Firebase init; auth.
2. **Matches & Pre-Match** — matches CRUD + 4-step pre-match wizard.
3. **Live Control** — state machine, auto-timer, extra time, penalty shootout screen.
4. **Events & Recalc** — quick-action grid, timeline, editing/undo, wired to Cloud Functions.
5. **Content** — news management + diwaniya moderation.
6. **Users & Notifications** — users/tiers/admin promotion, broadcast push, settings.
7. **Polish & Deploy** — responsive layout, RTL QA, Arabic error states, Hostinger deployment.

---

## 13. Open Decisions

- External sports API provider (TBD — API-Football, SportRadar, etc.); API key in environment variables.
- Admin panel i18n beyond Arabic (v2).
- News image/video upload workflow details (Firebase Storage vs external URLs).
- Mobile push notification deep-linking format (shared with mobile spec).
- Diwaniya confirmed defaults: max comment thread depth = 5; report auto-hide threshold = 0 (disabled) until a value is chosen in `settings`.
- **Architecture & structure (resolved v1.1)** — feature-first modular architecture with repository interfaces and Clean-style layering (`domain` / `data` / `hooks` / `ui`) per feature; **static-first milestone** builds all screens as navigable static pages on mock repositories before Firebase wiring. **Stitch is not used**; screens are designed and built directly in MUI v6 (dark RTL theme).
