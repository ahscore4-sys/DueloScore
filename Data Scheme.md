# DueloScore — Data Scheme

Firebase Firestore data scheme, Storage paths, and Cloud Functions reference for the DueloScore admin control panel and its shared mobile backend.

> **Scope note:** This document reflects the **implemented** features only (collections/types that actually exist in code). Spec-only features that are not yet built (Coverage matches, Commentators/Channels/Stadiums) are intentionally **not** documented here — they have no backing code or collections yet. These are described in `Admin Control Panel Spec.md` / `AGENTS.md` as planned.

---

## Overview

The admin panel is the **authoritative content source**; the mobile app is read-only. All collections are shared between the admin panel and the mobile app. Cloud Functions write via the Admin SDK (bypassing client security rules).

### Collection Map

| Collection | Doc ID | Feature | Admin Role |
|-----------|--------|---------|------------|
| `matches/{matchId}` | auto | Match Control (F1) | Full CRUD + live control |
| `matches/{matchId}/events/{eventId}` | auto | Match Events (F1) | Log/edit/delete (auto recalc) |
| `players/{playerId}` | auto | Players (F1) | CRUD |
| `news/{postId}` | auto | News (F3) | Full CRUD + publish |
| `news/{postId}/updates/{updateId}` | auto | News Updates (F3) | CRUD thread |
| `diwaniya/{postId}` | auto | Diwaniya (F4) | Create + moderate |
| `comments/{commentId}` | auto | Diwaniya Comments (F4) | Moderate |
| `poll_votes/{pollId}_{userId}` | `{pollId}_{userId}` | Diwaniya Polls (F4) | Read-only (mobile votes) |
| `reports/{targetType}_{targetId}_{reporterId}` | `{targetType}_{targetId}_{reporterId}` | Diwaniya Reports (F4) | Queue + auto-hide |
| `users/{userId}` | = Auth UID | Users & Tiers (F5/F6) | View/adjust |
| `points_log/{logId}` | auto | Points (F6) | Auto-logged |
| `admins/{uid}` | = Auth UID | Admin roles | super_admin manage |
| `admins/{uid}/log/{logId}` | auto | Activity Log (F9) | Auto-logged; view + filter |
| `settings/ads` | fixed `ads` | Ads Config (F10) | super_admin edit |
| `settings/tiers` | fixed `tiers` | Tiers (F6) | Read via mobile; written by `saveTierThresholds` |
| `settings/moderation` | fixed `moderation` | Moderation (F4) | Editable inline |
| `membership_plans/{planId}` | auto | Membership (F11) | super_admin CRUD |
| `membership_subscriptions/{subscriptionId}` | auto | Membership (F11) | View only (auto-activated by CF) |
| `challenge_questions/{questionId}` | auto | Challenge (F7) | Full CRUD |
| `challenges/{challengeId}` | auto | Challenge (F7) | Auto-published, view |
| `challenge_responses/{challengeId}_{userId}` | `{challengeId}_{userId}` | Challenge (F7) | Auto-assigned, view |
| `weekly_leaderboard/{weekId}` | weekId `YYYY-MM-DD` | Challenge (F7) | View |
| `push_notifications/{notificationId}` | auto | Notifications (F8) | Create/send/schedule + delivery stats |

### Firebase Services Map

| Service | Features Using It |
|---------|-------------------|
| Auth | Login, session, custom claims (`role`, `permissions`) |
| Firestore | All data below |
| Storage | `news_images/`, `challenge_images/` |
| Cloud Functions | Event recalc, news publish push + re-send, admin role management, topic push, tier recompute, poll vote aggregation, comment depth enforcement, report auto-hide, daily challenge auto-publish/assign/submit/finalize |
| FCM | News publish fanout, topic broadcast |

### Storage Paths

| Path | Used By | Naming |
|------|---------|--------|
| `news_images/{timestamp}_{sanitizedFileName}.{ext}` | News posts + updates images | `{Date.now()}_{file}` |
| `challenge_images/{timestamp}_{sanitizedFileName}.{ext}` | Challenge image-type questions | `{Date.now()}_{file}` |

News images are 16:9-cropped at upload; challenge images are 1:1 (1024×1024). When an image is replaced or its owner deleted, the old Storage file is removed via `deleteObject()`.

---

## 1. Match Control (المباريات)

### `matches/{matchId}` — Match document

Teams are **embedded** on the match (no separate `teams` collection for Barça/Madrid fixtures — full details live in `home`/`away`).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (set explicitly) |
| `home` | `Team` | ✅ | Home team object (embedded) |
| `away` | `Team` | ✅ | Away team object (embedded) |
| `competition` | `string` | ✅ | Competition name (e.g. La Liga, UEFA) |
| `round` | `string` | ✅ | Round |
| `season` | `string` | ✅ | Season |
| `date` | `string` | ✅ | Match date |
| `kickoff` | `string` | ✅ | Kickoff time |
| `stadium` | `string` | ✅ | Stadium name |
| `channels` | `string[]` | ✅ | Broadcasting channels |
| `commentators` | `string[]` | ✅ | Commentator names |
| `status` | `MatchStatus` | ✅ | Current match state (state machine) |
| `score` | `{ home: number; away: number }` | ✅ | Live score — **maintained by `onMatchEventWritten` recalc** |
| `summaryVideoUrl` | `string` | — | Match summary video URL; shown when set |
| `fixtureId` | `number` | — | External sports API fixture ID (imported/upcoming) |
| `leagueId` | `number` | — | External API league id (140/2/143/556) set on fixture import; scopes the post-match season-stats sync to the **exact competition** |
| `ratings` | `Record<string, number> \| null` | — | Post-match player ratings keyed by lineup player id (from `/fixtures/players`); auto-fetched when a finished fixture is imported |
| `ratingsUpdatedAt` | `number \| null` | — | Epoch ms of the last ratings write |
| `statistics` | `MatchStatistics \| null` | — | Team match statistics (`{ home, away }` of `MatchStatItem[]`, from `/fixtures/statistics`); auto-fetched when a finished fixture is imported |
| `statisticsUpdatedAt` | `number \| null` | — | Epoch ms of the last team-statistics write |
| `playerStatistics` | `MatchPlayerStatistics \| null` | — | Full per-player statistics (`{ home, away }` of `Record<playerId, PlayerFixtureEntry>`, from `/fixtures/players`); cached live during play (10s polling) and on final |
| `playerStatisticsUpdatedAt` | `number \| null` | — | Epoch ms of the last per-player statistics write |
| `controlPhase` | `ControlPhase` | ✅ | Fine-grained live control phase |
| `clockBaseSeconds` | `number` | ✅ | Timer base elapsed seconds at period start |
| `clockStartedAt` | `string \| null` | ✅ | ISO timestamp when the period clock started |
| `clockRunning` | `boolean` | ✅ | Whether the period clock is running |
| `addedTime` | `Record<string, number>` | ✅ | Informational extra-time minutes per period |
| `penalties` | `{ home: number; away: number }` | ✅ | Penalty shootout running score |
| `penaltyKicks` | `PenaltyKick[]` | ✅ | Individual penalty kicks logged |
| `attendance` | `number` | — | Match attendance (crowd count); editable from the Statistics tab, displayed as a gold row in the statistics card |
| `plans.{teamId}` | `TeamPlan` | — | Pre-match plan per team (home/away), nested sub-object |

**`Team` (embedded):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Team ID (e.g. `barcelona`, `realmadrid`) |
| `name` | `string` | Display name |
| `short` | `string` | Short name |
| `color` | `string` | Team color hex |
| `gkColor` | `string` | Goalkeeper kit color hex (optional) |

**`MatchStatus` (state machine):**

`not_started → first_half → half_time → second_half → full_time → (extra_first_half → extra_second_half → penalties → final) | (penalties) | final`

**`ControlPhase`:** `not_started | first_half | half_time | second_half | full_time | extra_first_half | extra_break_1 | extra_second_half | extra_break_2 | penalties | final`

**`PenaltyKick`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Kick ID |
| `kickNo` | `number` | Kick sequence number |
| `team` | `'home' \| 'away'` | Kicking team |
| `player` | `string` | Taker name |
| `result` | `'scored' \| 'missed'` | Result |

**Storage of pre-match plans:** `plans.{teamId}` is written via `saveMatchPlan(matchId, teamId, plan)` as a **nested sub-object** on the match doc (not a subcollection).

**`TeamPlan`:**

| Field | Type | Description |
|-------|------|-------------|
| `formation` | `string` | Formation code, e.g. `4-3-3`; `""` = undefined |
| `lineup` | `string[]` | Starting XI player IDs in slot order |
| `bench` | `string[]` | Substitute player IDs |
| `injured` | `string[]` | Injured player IDs |
| `playerData` | `Record<string, OpponentPlayerData>` | Optional per-player data (opponent/API) |

**`OpponentPlayerData`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | External player ID |
| `name` | `string` | Player name |
| `nameAr` | `string` | Arabic name (optional) |
| `number` | `number` | Shirt number |
| `pos` | `string` | Position |
| `grid` | `string` | Pitch grid slot (optional) |

**Query patterns:**
- All matches: `collection("matches").orderBy("date", "desc")`
- Single: `doc("matches/{matchId}")` via `onSnapshot`
- Events: `collection("matches/{matchId}/events").orderBy("minute")`

---

### `matches/{matchId}/events/{eventId}` — Events (subcollection)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID |
| `minute` | `string` | ✅ | Formatted minute, e.g. `24'`, `45+3'`, `90+5'` |
| `type` | `EventType` | ✅ | Event kind (below) |
| `player` | `string` | ✅ | Primary player name (API **player id** string for imported events, name fallback) |
| `playerOut` | `string` | — | Substitution: player leaving pitch (imported subs: `player` = in, `playerOut` = out) |
| `team` | `'home' \| 'away'` | ✅ | Which team the event belongs to |
| `videoUrl` | `string` | — | Per-event video clip URL |
| `secondYellow` | `boolean` | — | True when a second yellow auto-converts to red |
| `assistPlayer` | `string` | — | Goal only: scorer's direct assistant (imported from API `assist.id`/`assist.name`) |
| `phase` | `string` | — | Phase-marker events only (`type: 'phase'`): the phase name (`first_half` … `final`) |
| `penaltyMissCause` | `'saved' \| 'off_target'` | — | `pen_missed` only: why the kick was missed — saved by the keeper or off target. Required in the event dialog; shown as a timeline subtitle (blue for `saved`, red for `off_target`) and drives the per-cause fan-notification body (`onMatchEventCreated`/`onMatchEventUpdated`) |

**`EventType`:** `goal | opp_goal | og | yellow | red | pen_scored | pen_missed | sub | crossbar | phase`

**Missed penalties (`pen_missed`):** the admin picks a cause (`penaltyMissCause`) — `saved` ("تصدّى لها الحارس") or `off_target` ("ضائعة"). The fan-out body and FCM `data.penaltyMissCause` differ per cause. `saved` shows the keeper's save; `off_target` shows the miss. Editing the cause on the event re-fans the new message.

**Score recalc rules (in `recalcMatch` / `onMatchEventWritten`):**
- `goal` on `home` → +1 home; `goal` on `away` → +1 away
- `og` (own goal) on `home` → +1 **away**; on `away` → +1 **home**
- `opp_goal` on `home` → +1 away; on `away` → +1 home

**Event minute auto-format:** `23:14 → 24'`, `47:12 → 45+3'`, `94:05 → 90+5'`.

**Phase-marker events (`type: 'phase'`):** derived once via `derivePhaseEvents()` when a finished API fixture is imported. One marker per period **actually played** (proven by event minutes), with **fixed minutes**: `first_half 1'`, `half_time 45'`, `second_half 46'`, `full_time 90'`, `extra_first_half 91'`, `extra_break_1 105'`, `extra_second_half 106'`, `extra_break_2 120'`, `penalties 120'`, `final 90'`. End-of-match rule: when extra time occurred → `full_time` only; when the match ended without extra → `final` only. `penalties` marker only for `PEN` fixtures. Imported events carry no shirt number — players are keyed by **API player id** (`String(id)`, name fallback); second yellow → red with `secondYellow: true`; own goals flipped to the opposing team; goals import `assistPlayer`.

**Lifecycle:** Any write (create/update/delete) to the events subcollection triggers `onMatchEventWritten`, which re-reads all events and recomputes `score.home`/`score.away` on the match doc.

**Query pattern:** `collection("matches/{matchId}/events").orderBy("minute")`

---

### Cloud Function: `onMatchEventWritten` — Firestore trigger (`events/{eventId}`)

Reads all events in the match, recomputes the score via `recalcMatch()`, and writes it to the match doc. Runs on every event document write (created/updated/deleted), so score is always derived from the event list.

**Firestore indexes:** none required (reads by parent collection).

---

### External sports API (non-Barça/Madrid fixture import)

Upcoming fixtures from other leagues are fetched from the external sports API and surfaced in the admin as **upcoming fixtures** (metadata + scores only — no pre-match/live control/events). Once imported a fixture can be turned into a match doc with `fixtureId` set.

**`UpcomingFixture` (API-derived, not persisted as-is):**

| Field | Type | Description |
|-------|------|-------------|
| `fixtureId` | `number` | API fixture ID |
| `date` | `string` | Fixture date |
| `timestamp` | `number` | Epoch ms |
| `league` | `{ id, name, logo }` | League info |
| `home` / `away` | `{ id, name, logo }` | Team info |
| `status` | `{ short, elapsed }` | Fixture status |
| `round` | `string` | Round |
| `venue` | `string \| null` | Venue |
| `alreadyImported` | `boolean` | Whether already imported as a match |

**Importing a finished fixture ("جلب النتيجة والأحداث", in Live Control):** the admin fetches the fixture's live data, reviews the mapped events/score in a preview panel, then saves. The save:
1. Writes `score` straight from the fixture; if finished, forces `controlPhase: 'final'`, `status: 'final'`, `clockBaseSeconds` (120×60 with extra time / 90×60 without), clears the clock, and records penalty-shootout scores when a `PEN` fixture.
2. Writes every mapped event (including the derived `phase` markers above) via `createMatchEvent` — each write triggers the `onMatchEventWritten` score recalc.
3. If finished and `fixtureId` is known, auto-fetches post-match data: player ratings → `match.ratings` (`ratingsUpdatedAt`), team statistics → `match.statistics`, and full per-player statistics → `match.playerStatistics` (`statisticsUpdatedAt` / `playerStatisticsUpdatedAt`).

**Live statistics while in play:** for any match with a `fixtureId` whose `controlPhase` is in play (not started → final/full_time), the admin panel's `useMatchStatsPolling` (run at the **MatchHub level**, active across the whole match screen and shared via `MatchHubContext.statsPolling`) polls the API every 10 seconds and caches team statistics → `match.statistics` and per-player statistics → `match.playerStatistics`. Live per-player ratings are derived from `match.playerStatistics` and merged into the pre-match pitch so on-pitch ratings show during the game. The Statistics tab splits into **Match Statistics** (team indicators) and **Players Statistics** (logo-based team switcher; per-player cards: photo, number, position, minutes, rating, goals/assists/shots; clicking a card opens a stat **Dialog** with grouped shots/goals/passes/tackles/duels/dribbles/fouls/cards/penalties/subs sections). Manual per-player **distance covered** (كم) is entered in the same dialog and stored in `match.playersDistance.{playerId}` (a separate map so API re-fetches never overwrite it).

**`MatchPlayerStatistics` / `PlayerFixtureEntry` / `PlayerFixtureStatistics` (embedded in `matches/{id}`):**

| Type | Shape |
|------|-------|
| `MatchPlayerStatistics` | `{ home: Record<string, PlayerFixtureEntry>; away: Record<string, PlayerFixtureEntry> }` — keyed by stringified API player id |
| `PlayerFixtureEntry` | `{ playerId: string; name: string; photo?: string \| null; stats: PlayerFixtureStatistics }` |
| `PlayerFixtureStatistics` | Flat object with nullable numerics: `minutes`, `rating`, `number`, `position`, `captain`, `substitute`, `shots{Total,On}`, `goals`, `conceded`, `assists`, `saves`, `passes{Total,Key,Accuracy}`, `tackles{Total,Blocks,Interceptions}`, `duels{Total,Won}`, `dribble{Attempts,Success,Past}`, `fouls{Drawn,Committed}`, `cards{Yellow,Red}`, `penalty{Won,Committed,Scored,Missed,Saved}`, `subs{In,Out,Bench}` |

---

## 2. Players (اللاعبون)

### `players/{playerId}` — Player database

Reusable player records used in the pre-match wizard (lineups/bench/injured).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID |
| `name` | `string` | ✅ | Player name |
| `position` | `string` | ✅ | Position (e.g. `حارس`, defender, etc.) |
| `number` | `number` | ✅ | Shirt number |
| `teamId` | `string` | ✅ | Team this player belongs to (e.g. `barcelona`) |
| `status` | `'booked' \| 'subbed' \| 'off'` | — | Live-match status flag |
| `imageUrl` | `string` | — | Avatar/photo URL |
| `age` | `number` | — | Age |
| `height` | `number` | — | Height (cm) |
| `weight` | `number` | — | Weight (kg) |
| `nationality` | `string` | — | Nationality |
| `foot` | `'right' \| 'left' \| 'both'` | — | Preferred foot |

**Query pattern:** by team: `collection("players").where("teamId", "==", teamId)` via `onSnapshot`.

---

## 3. News (الأخبار)

X-like news posts for Barcelona & Real Madrid. **Instant publishing** (no draft state) — creating a post triggers an FCM fan-out to the post's team topic. Updates (thread sub-posts) do **not** notify.

### `news/{postId}` — News post

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (set explicitly) |
| `title` | `string` | ✅ | Post title |
| `content` | `string` | ✅ | Post body (used for push body, trimmed to 180 chars) |
| `imageUrl` | `string` | ✅ | Storage download URL (`""` = none) |
| `imagePath` | `string` | ✅ | Storage path for deletion (`""` = none) |
| `team` | `'all' \| 'barcelona' \| 'realmadrid'` | ✅ | Target team → determines FCM topic |
| `tag` | `'transfers' \| 'injuries' \| null` | — | Post tag (`null` = general) |
| `author` | `string` | ✅ | Author display name |
| `sourceUrl` | `string \| null` | — | Optional source link |
| `likedBy` | `string[]` | ✅ | User IDs who liked (count = length) |
| `updatesCount` | `number` | ✅ | Number of update sub-posts (maintained incrementally) |
| `createdAt` | `serverTimestamp` | ✅ | Creation time |
| `updatedAt` | `serverTimestamp \| null` | — | Last edit time |
| `notifiedAt` | `serverTimestamp \| null` | — | Set by `onNewsCreated` / `renotifyNewsPost` after successful FCM send |

**Topic mapping (`topicForTeam`):** `barcelona → barcelona_news`, `realmadrid → realmadrid_news`, `all → all_news`.

**Query patterns (feed):** `collection("news").orderBy("createdAt", "desc")`, optionally filtered by `team` / `tag` with `createdAt desc` (indexed in `firestore.indexes.json`), paginated `limit(10)` + `startAfter`.

**Storage:** `news_images/{timestamp}_{name}` (16:9-cropped at upload).

### `news/{postId}/updates/{updateId}` — Updates thread (subcollection)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID |
| `content` | `string` | ✅ | Update text |
| `imageUrl` | `string` | ✅ | Storage URL (`""` = none) |
| `imagePath` | `string` | ✅ | Storage path for deletion |
| `createdAt` | `serverTimestamp` | ✅ | Creation time |

**Lifecycle:** Adding/removing an update increments/decrements the parent post's `updatesCount`. Updates are displayed newest-first on `/news/:id`. Only **post creation** notifies; updates never do.

### Cloud Function: `onNewsCreated` — Firestore trigger (`news/{postId}`)

Builds an FCM topic message from the post data and sends to the post's team topic, then writes `notifiedAt`. On failure (caught, not fatal) it logs but does **not** write `notifiedAt`.

### Cloud Function: `renotifyNewsPost` — onCall (admin)

Admin re-send action: validates admin/super_admin, reads the post, re-sends the same FCM message, refreshes `notifiedAt`. Returns `{ ok, error? }`.

Error cases: `permission-denied`, `invalid-argument` (no `postId`), `not-found`.

---

## 4. Users, Tiers & Admin Roles (المستخدمون والمراتب)

### `users/{userId}` — User profile (doc ID = Firebase Auth UID)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (Auth UID) |
| `name` | `string` | ✅ | Display name |
| `email` | `string \| null` | — | Email |
| `profilePicture` | `string` | — | Avatar URL |
| `favoriteTeam` | `'barcelona' \| 'realmadrid' \| null` | — | Favorite team |
| `points` | `number` | ✅ | Total points (maintained by points_log + challenge commits) |
| `tier` | `number \| null` | — | Tier index (0–4) |
| `tierProgress` | `number` | — | % progress to next tier (0–100) |
| `tierName` | `string` | — | Denormalized tier name (written by recompute; read by challenge finalize) |
| `tierColor` | `string` | — | Denormalized tier color hex |
| `devices` | `Device[]` | — | FCM device tokens |
| `createdAt` | `serverTimestamp` | ✅ | Signup time |

**`Device`:** `{ token: string, platform: 'android' \| 'ios' }`

> **Note (field naming):** The admin `AppUser` mapper reads `favoriteTeam`, while the challenge Cloud Functions read `users/{uid}.team` and `.tierName`/`.tierColor`. Keep the stored field names aligned when implementing the mobile write path (treat this as an unresolved consistency point).

**Query patterns:**
- List (paginated): `collection("users").orderBy("createdAt", "desc").limit(24)`
- Single: `doc("users/{uid}")` via `onSnapshot`
- Points log: `collection("points_log").where("userId", "==", uid).orderBy("createdAt", "desc").limit(50)`

### `points_log/{logId}` — Points ledger

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (auto) |
| `userId` | `string` | ✅ | Target user |
| `points` | `number` | ✅ | Delta (can be negative for deductions) |
| `reason` | `string` | ✅ | Human-readable reason |
| `ref` | `string \| null` | — | Optional reference (e.g. challenge id) |
| `createdAt` | `serverTimestamp` | ✅ | When logged |

**Flow:** Admin manual points adjustment (`adjustPoints`) runs a transaction: updates `users/{uid}.points` (clamped ≥ 0) and writes a `points_log` doc. Creating a `points_log` doc triggers `recomputeTier`.

### Cloud Function: `recomputeTier` — Firestore trigger (`points_log/{logId}`)

On a new points log entry:
1. Read `users/{userId}.points`
2. Load thresholds from `settings/tiers` (falls back to default `[0, 500, 1500, 3500, 7000]`)
3. Compute `tier` index + `tierProgress` and update the user doc

`computeTier` returns the highest index whose threshold ≤ points, with progress toward the next threshold (100% at the top).

### `admins/{uid}` — Admin record (doc ID = Auth UID)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Admin display name |
| `email` | `string` | — | Email |
| `role` | `'admin' \| 'super_admin'` | ✅ | Role |
| `permissions` | `AdminPermission[]` | ✅ | Granular permission set (ignored for super_admin) |
| `super_admin` | `boolean` | — | Legacy flag (read to detect super_admin) |
| `updatedAt` | `serverTimestamp` | — | Last update |

**`AdminPermission`:** `matches | players | coverage | news | diwaniya | users | challenges | notifications | activity_log`

**Mirrored to Firebase custom claims:** `{ role, permissions }` — set by the Cloud Function, checked by route guards + Firebase rules.

### Cloud Function: `setAdminRole` — onCall (super_admin)

Input `{ uid, name, email?, permissions[] }`. Sets custom claims `{ role: "admin", permissions }`, upserts `admins/{uid}`, and revokes refresh tokens (changes take effect immediately).

Errors: `permission-denied` (caller not super_admin), `invalid-argument` (missing uid/name).

### Cloud Function: `revokeAdmin` — onCall (super_admin)

Input `{ uid }`. Clears the user's custom claims (`null`), deletes `admins/{uid}`, revokes refresh tokens. Cannot revoke yourself.

Errors: `permission-denied`, `invalid-argument` (own uid).

### `admins/{uid}/log/{logId}` — Activity log (per-admin subcollection)

Every admin action is logged via the client-side `logActivity()` helper (`src/lib/activityLogger.ts`, fire-and-forget). Each admin writes to their **own** sub-collection only; the docs are heterogeneous — a common envelope plus a type-specific `details` payload.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (auto) |
| `adminId` | `string` | ✅ | The acting admin's Auth UID (written from the authenticated session) |
| `adminName` | `string` | ✅ | The acting admin's display name (denormalized) |
| `targetType` | `ActivityTargetType` | ✅ | Log category: `match \| event \| news \| diwaniya \| comment \| report \| user \| admin \| notification \| challenge \| settings \| session` |
| `action` | `ActivityAction` | ✅ | Specific action within the category (e.g. `match.create`, `event.delete`, `news.renotify`) |
| `targetId` | `string` | ✅ | The affected doc/business ID (e.g. match id, news post id, even on failure points) |
| `targetLabel` | `string` | ✅ | Human-readable target label (e.g. "البرسا ضد الريال", post title) |
| `details` | `object` | — | Type-specific payload (varies by `targetType`/`action`; e.g. score for `match.create`, permissions for `admin.grant`) |
| `timestamp` | `serverTimestamp` | ✅ | When the action happened |

**Action types (by category):**
- **match:** `match.create`, `match.update`, `match.delete`, `match.save_plan`, `match.control`
- **event:** `event.create`, `event.update`, `event.delete`
- **news:** `news.create`, `news.update`, `news.delete`, `news.update_add`, `news.update_edit`, `news.update_delete`, `news.renotify`
- **diwaniya:** `diwaniya.create`, `diwaniya.hide`, `diwaniya.restore`, `comment.hide`, `comment.restore`, `report.create`, `settings.moderation`
- **user:** `user.points_adjust`, `user.broadcast`
- **admin:** `admin.grant`, `admin.edit`, `admin.revoke`
- **notification:** `notification.create`
- **challenge:** `question.create`, `question.update`, `question.delete`, `question.toggle`
- **settings:** `settings.update`
- **session:** `session.login`, `session.logout`

**Access model:**
- Every authenticated admin sees **only their own** log (read via `admins/{ownUid}/log`).
- `super_admin` sees **all** logs via `collectionGroup('log')` (admin dropdown + category filter). Selecting an admin filters by `adminId`.
- Logs persist after admin revocation (sub-documents survive deletion of the `admins/{uid}` doc).

**Query patterns:**
- Own log: `collection("admins/{uid}/log").orderBy("timestamp", "desc")` (cursor-paginated, 20/page)
- All logs (super_admin): `collectionGroup("log").orderBy("timestamp", "desc")`, optionally `where("adminId", "==", uid)`
- Filters: `where("targetType", "==", x)`, `where("timestamp", ">=", from)`, `where("timestamp", "<=", to)`

> **Note (rules):** the client SDK writes logging docs directly, so Firestore rules must allow an authenticated admin to write to `admins/{request.auth.uid}/log/**` and to read their own sub-collection, with `collectionGroup('log')` reads restricted to `super_admin`.

### `settings/tiers` — Tier thresholds

| Field | Type | Description |
|-------|------|-------------|
| `thresholds` | `number[]` | Point boundaries, e.g. `[0, 500, 1500, 3500, 7000]` |

Read by `recomputeTier`, `useTierThresholds`, and the users UI. Written by the Settings page via `saveTierThresholds` (`admin/src/features/settings/data/settings.service.ts`) with a `settings.update` activity-log entry. Falls back to defaults `[0, 500, 1500, 3500, 7000]` when the doc doesn't exist.

---

## 5. Authentication (تسجيل الدخول)

Authentication uses Firebase Auth (email/password) plus Firebase custom claims `{ role, permissions }` on the ID token. `admins/{uid}` mirrors the same info for reads that don't have token access.

- Roles: `admin` / `super_admin` (see `core/domain/types.ts`)
- Route guards (`ProtectedRoute`) check auth state; `PermissionRoute` checks `permissions[]` for the feature.
- On logout, the session is cleared.

No Firestore collection beyond `admins/{uid}` is used for auth.

---

## 6. Diwaniya (الديوانية)

Argumentative community posts (every post is an argumentative question with options) where both teams' fans vote and reply. No separate poll collection — a poll is a `diwaniya` doc with `type: 'poll'`. Moderation is hide/restore (never hard-delete).

### `diwaniya/{postId}` — Post / Poll

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (set explicitly) |
| `authorId` | `string` | ✅ | Author's Auth UID |
| `authorName` | `string` | ✅ | Author display name |
| `authorTier` | `string \| null` | — | Author tier name (optional) |
| `text` | `string` | ✅ | Post body (for polls = the question too) |
| `type` | `'text' \| 'poll'` | ✅ | Post kind |
| `question` | `string \| null` | — | Poll question (polls only) |
| `options` | `PollOption[]` | — | Poll options `[{ id, text }]` (2–4, reorderable) |
| `endsAt` | `Timestamp \| null` | — | Poll expiry (optional; `null` = never ends) |
| `pollStatus` | `'open' \| 'closed'` | ✅ | Poll state; closed by `onPollExpired` or manually |
| `totalVotes` | `number` | ✅ | Aggregate vote count (maintained by `onPollVoteWrite`) |
| `votesByTeam` | `VotesByTeam` | ✅ | Per-option counts split by voter team |
| `winningOptionId` | `string \| null` | — | Winning option id, set at close |
| `hidden` | `boolean` | ✅ | Hidden from mobile when `true` |
| `hiddenAt` | `Timestamp \| null` | — | When hidden |
| `hiddenBy` | `string \| null` | — | Who hid it (`admin` name or `"auto"`) |
| `reportCount` | `number` | ✅ | Number of reports (maintained by `onReportCreated`) |
| `reportedBy` | `string[]` | ✅ | Reporter user IDs |
| `createdAt` | `serverTimestamp` | ✅ | Creation time |

**`PollOption`:** `{ id: string, text: string }`

**`VotesByTeam`:** `{ barcelona: Record<optionId, count>, realmadrid: Record<optionId, count> }`

**Admin operations:**
- Create poll (`saveDiwaniyaPoll`) — writes the doc above with `pollStatus: 'open'`, zeroed aggregates.
- Hide/restore (`setPostHidden`) — toggles `hidden` + `hiddenAt`/`hiddenBy`.
- Open/close poll manually (`setPostPollStatus`).
- Add admin comment / moderate comments.

**Query patterns (hub, newest = hero):**
- Feed: `collection("diwaniya").orderBy("createdAt", "desc").limit(10)` (paginated)
- Latest: `orderBy("createdAt", "desc").limit(count)` via `onSnapshot`
- Single: `doc("diwaniya/{id}")` via `onSnapshot`

### `comments/{commentId}` — Comments (nested threads)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (auto) |
| `postId` | `string` | ✅ | Parent diwaniya post |
| `parentId` | `string \| null` | — | Direct parent comment (`null` = top-level) |
| `rootId` | `string \| null` | — | Root comment id (thread root) |
| `depth` | `number` | ✅ | Thread depth (top-level = 1, cap 5) |
| `repliesCount` | `number` | ✅ | Direct replies (maintained by `onCommentCreated`) |
| `authorId` | `string` | ✅ | Author Auth UID |
| `authorName` | `string` | ✅ | Author display name |
| `authorTier` | `string \| null` | — | Author tier name |
| `text` | `string` | ✅ | Comment body |
| `createdAt` | `serverTimestamp` | ✅ | Creation time |
| `hidden` | `boolean` | ✅ | Hidden from mobile when `true` |
| `hiddenAt` | `Timestamp \| null` | — | When hidden |
| `hiddenBy` | `string \| null` | — | Who hid it |
| `reportCount` | `number` | ✅ | Report count (maintained by `onReportCreated`) |

**Query pattern:** `collection("comments").where("postId", "==", postId).orderBy("createdAt", "asc")` via `onSnapshot`.

### `poll_votes/{pollId}_{userId}` — Poll votes (doc ID convention)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pollId` | `string` | ✅ | Target poll |
| `userId` | `string` | ✅ | Voter |
| `optionId` | `string` | ✅ | Chosen option (changeable while open) |
| `team` | `string` | ✅ | Voter's favorite team (feeds `votesByTeam`) |
| `counted` | `boolean` | — | Echo flag set by CF after aggregation |

**Lifecycle:** One doc per user per poll (`{pollId}_{userId}`). Mobile writes create/update; `onPollVoteWrite` maintains the poll aggregates (decrement old option/team bucket, increment new). Votes on closed polls are rejected.

### `reports/{targetType}_{targetId}_{reporterId}` — Reports (doc ID convention)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetType` | `'post' \| 'comment'` | ✅ | What is reported |
| `targetId` | `string` | ✅ | Reported doc id |
| `reporterId` | `string` | ✅ | Reporter user id |
| `reason` | `string` | ✅ | Reason text |
| `createdAt` | `serverTimestamp` | ✅ | When reported |

Doc ID convention: `{targetType}_{targetId}_{reporterId}` (unique per reporter/target). Admins can also file reports from the post detail page (accepts an explicit `reporterId`).

### `settings/moderation` — Moderation config

| Field | Type | Description |
|-------|------|-------------|
| `autoHideThreshold` | `number` | Auto-hide a target once it reaches this many reports (`0` = disabled). Editable inline in the reports tab. |

### Cloud Function: `onPollVoteWrite` — Firestore trigger (`poll_votes/{voteId}`)

On create/update (ignores metadata-only `counted` echoes):
1. Reads the poll, computes `isOpen` = `pollStatus === "open"` and (if `endsAt`) before `endsAt`.
2. Removes the previous contribution if `counted === true`.
3. If freshly counting: adds to the new option/team bucket, increments `totalVotes`, marks `counted: true`; rejects fresh votes on closed polls (deletes the vote doc).
4. Writes back `votesByTeam` + `totalVotes`.

### Cloud Function: `onCommentCreated` — Firestore trigger (`comments/{commentId}`)

- Top-level (`parentId` null): sets `depth: 1`, `rootId: null`.
- Reply: reads the parent's `depth`/`rootId`, sets `depth = parentDepth + 1` and the thread `rootId`. If `depth > 5`, deletes the comment. Otherwise increments the parent's `repliesCount`.

### Cloud Function: `onReportCreated` — Firestore trigger (`reports/{reportId}`)

Increments `reportCount` on the target and appends the reporter to `reportedBy`. If the new count reaches `settings/moderation.autoHideThreshold` (and threshold > 0), auto-hides the target (`hidden: true`, `hiddenAt`, `hiddenBy: "auto"`).

### Cloud Function: `onPollExpired` — Scheduled (every 1 minute)

Finds `diwaniya` polls with `type: 'poll'`, `pollStatus: 'open'`, `endsAt < now`; batch-sets `pollStatus: 'closed'` and computes `winningOptionId` from `votesByTeam`.

**Firestore indexes:** `diwaniya` (type/pollStatus/endsAt/createdAt combinations) and `comments` (postId + createdAt) — see `firestore/firestore.indexes.json`.

---

## 7. Today's Challenge (تحدي اليوم)

Daily trivia quiz. **Auto-published** at midnight Kuwait time. Each user is **lazily assigned a different random question** from the active pool. Grading + weekly leaderboard run after the day ends.

> This section is fully documented below.

### Firestore Collections

#### `challenge_questions/{questionId}` — Question Bank

Admin-managed. Each doc is a reusable question that can be drawn in any daily challenge.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'text'` \| `'image'` | ✅ | Text question (multiple choice) or deformed-image guess |
| `question` | `string` | ✅ | The question text displayed to the user |
| `imageUrl` | `string` | ✅ | Firebase Storage download URL (image questions only, `""` for text) |
| `imagePath` | `string` | ✅ | Storage path for deletion (image only, `""` for text) |
| `options` | `string[]` | ✅ | Always exactly 4 options (index 0–3). Empty strings are invalid |
| `correctAnswer` | `number` | ✅ | Index of the correct option (0–3) |
| `difficulty` | `'easy'` \| `'medium'` \| `'hard'` | ✅ | Difficulty level. Stored in data but hidden from admin UI |
| `active` | `boolean` | ✅ | If `true`, eligible for random assignment. Toggle on bank page |
| `createdAt` | `number` | ✅ | Epoch ms — when the question was created |
| `usedAt` | `number \| null` | — | Epoch ms — when last used in a challenge. `null` if never used |

**Admin operations:**
- Full CRUD via `questions.service.ts`
- `setQuestionActive(id, active)` — toggles the `active` flag
- `deleteQuestion()` — removes from Firestore + Firebase Storage
- Image upload: 1:1 aspect ratio, 1024×1024 output via `ImageDropZone` component

**Storage path:** `challenge_images/{questionId}_{timestamp}.{ext}`

**Query patterns:**
- List all (paginated): `collection("challenge_questions").orderBy("createdAt", "desc").limit(N)`
- Active questions only: `collection("challenge_questions").where("active", "==", true)`
- By type: `collection("challenge_questions").where("type", "==", "text")`

---

#### `challenges/{challengeId}` — Daily Challenges

Auto-created at midnight Kuwait time by the `autoPublishDailyChallenge` scheduled Cloud Function. One doc per day.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID (set explicitly on creation) |
| `scheduledDate` | `string` | ✅ | Kuwait date key: `"YYYY-MM-DD"` (e.g. `"2026-08-26"`) |
| `startTime` | `number` | ✅ | Epoch ms — Kuwait midnight (00:00) of the scheduled day |
| `endTime` | `number` | ✅ | Epoch ms — End of day (23:59:59.999) |
| `status` | `'active'` \| `'ended'` | ✅ | Set to `'active'` on creation, `'ended'` by finalize CF |
| `questionIds` | `string[]` | — | Snapshot of question IDs (currently not written by auto-publish; questions assigned lazily at runtime) |
| `stats.assignedCount` | `number` | ✅ | Incremented each time `getTodaysChallenge` assigns a new user |
| `stats.respondedCount` | `number` | ✅ | Incremented each time `submitChallengeResponse` is called |
| `stats.correctCount` | `number` | ✅ | Set by `finalizeDailyChallenges` after grading |
| `topPerformers` | `TopPerformer[]` | ✅ | Top 5 fastest correct answers, written at finalization. Empty `[]` on creation |
| `publishedBy` | `string` | ✅ | `"النظام التلقائي"` (auto-published) |
| `weekId` | `string` | ✅ | The Friday→Thursday week ID: `"YYYY-MM-DD"` of the week's Friday |
| `createdAt` | `serverTimestamp` | ✅ | Firestore server timestamp of creation |

**TopPerformer shape:**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | User's Firebase Auth UID |
| `userName` | `string` | Denormalized display name from `users/{uid}` |
| `userTeam` | `'barcelona'` \| `'realmadrid'` \| `null` | Denormalized team |
| `tierName` | `string` | Denormalized tier name |
| `tierColor` | `string` | Denormalized tier color hex (e.g. `"#FEBE10"`) |
| `respondedAt` | `number` | Epoch ms — when the user submitted their answer |

**Lifecycle:**
1. `autoPublishDailyChallenge` creates doc with `status: 'active'`, `stats: {0,0,0}`, `topPerformers: []`
2. `getTodaysChallenge` assigns questions (increments `stats.assignedCount`)
3. `submitChallengeResponse` stores answers (increments `stats.respondedCount`)
4. `finalizeDailyChallenges` grades everything → sets `status: 'ended'`, writes `stats.correctCount`, `topPerformers`

**Query patterns:**
- Find today's challenge: `collection("challenges").where("scheduledDate", "==", todayKey).limit(1)`
- Find active/scheduled: `collection("challenges").where("status", "in", ["scheduled", "active"]).orderBy("startTime", "desc").limit(1)`
- History (paginated): `collection("challenges").orderBy("startTime", "desc").limit(N)`

---

#### `challenge_responses/{challengeId}_{userId}` — Per-User Responses

One doc per user per challenge. Doc ID convention: `{challengeId}_{userId}`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Same as doc ID |
| `challengeId` | `string` | ✅ | Reference to the challenge doc |
| `userId` | `string` | ✅ | The user's Firebase Auth UID |
| `assignedQuestionId` | `string` | ✅ | The randomly assigned question from the active pool |
| `selectedAnswer` | `number \| null` | — | Index 0–3. `null` until user submits |
| `isCorrect` | `boolean \| null` | — | `null` until finalize CF grades it |
| `pointsAwarded` | `number \| null` | — | Points earned (0 or `pointsPerCorrect`). Set at finalization |
| `respondedAt` | `number \| null` | — | Epoch ms of when user submitted answer |
| `createdAt` | `serverTimestamp` | ✅ | When the assignment was created |

**Denormalized user fields (written at creation by `getTodaysChallenge`):**

| Field | Type | Description |
|-------|------|-------------|
| `userName` | `string` | Display name from `users/{uid}` |
| `userTeam` | `'barcelona'` \| `'realmadrid'` \| `null` | Favorite team |
| `tierName` | `string` | Current tier name |
| `tierColor` | `string` | Current tier color hex |

**Lifecycle:**
1. Created by `getTodaysChallenge` — picks random active question, writes `assignedQuestionId`, other answer fields `null`
2. Updated by `submitChallengeResponse` — sets `selectedAnswer` + `respondedAt`
3. Updated by `finalizeDailyChallenges` — sets `isCorrect` + `pointsAwarded`

**Query patterns:**
- Get user's response: `doc("challenge_responses/{challengeId}_{userId}")` (direct read by doc ID)
- All responses for a challenge: `collection("challenge_responses").where("challengeId", "==", challengeId)`

---

#### `weekly_leaderboard/{weekId}` — Weekly Standings

One doc per Friday→Thursday week. Contains an embedded `entries` array that is merged across daily challenges.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weekId` | `string` | ✅ | Same as doc ID (e.g. `"2026-08-22"`) |
| `entries` | `WeeklyLeaderboardEntry[]` | ✅ | Array of user rankings. Merged (not overwritten) on each finalization |
| `updatedAt` | `serverTimestamp` | ✅ | Last finalization time |

**WeeklyLeaderboardEntry shape:**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | User's Firebase Auth UID |
| `userName` | `string` | Denormalized display name |
| `userTeam` | `'barcelona'` \| `'realmadrid'` \| `null` | Denormalized team |
| `tierName` | `string` | Denormalized tier name |
| `tierColor` | `string` | Denormalized tier color hex |
| `daysPlayed` | `number` | Days answered correctly this week (0–7) |
| `weekPoints` | `number` | Total points earned this week |

**Merge logic (in `finalizeDailyChallenges`):**
1. Read existing `entries[]` from the doc
2. For each user who answered correctly today, find or create their entry
3. Increment `daysPlayed` by 1, add today's points to `weekPoints`
4. Write back the merged array

**Streak commitment:**
- When `daysPlayed >= 7` for any entry, the CF does:
  ```
  users/{userId}.points += entry.weekPoints
  ```
- This commits the weekly bucket to the user's total points

**Query pattern:**
- Subscribe to current week: `doc("weekly_leaderboard/{currentWeekId}")` via `onSnapshot`

---

### Firebase Storage

#### `challenge_images/{questionId}_{timestamp}.{ext}`

Used for image-type questions (deformed image guess).

| Property | Value |
|----------|-------|
| Aspect ratio | 1:1 (square) |
| Output size | 1024 × 1024 px |
| Format | JPEG (compressed by `ImageDropZone`) |
| Naming | `{questionId}_{Date.now()}.{ext}` |

**Cleanup:** When a question's image is replaced or the question is deleted, the old Storage file is removed via `deleteObject()`.

---

### Cloud Functions

#### `autoPublishDailyChallenge` — Scheduled (every 1 minute)

**Purpose:** Creates a new challenge doc at Kuwait midnight automatically.

**Logic:**
1. Compute today's Kuwait date key (`kuwaitDateKey(now)`)
2. Query `challenges` where `scheduledDate == todayKey` — if exists, skip
3. Query `challenge_questions` where `active == true` — if empty, skip (log warning)
4. Create `challenges/{autoId}` with:
   - `scheduledDate: todayKey`
   - `startTime: todayMidnightMs`
   - `endTime: tomorrowMidnightMs - 1`
   - `status: "active"`
   - `stats: { assignedCount: 0, respondedCount: 0, correctCount: 0 }`
   - `topPerformers: []`
   - `publishedBy: "النظام التلقائي"`
   - `weekId: challengeWeekId(now)`
   - `createdAt: serverTimestamp()`

**Timezone:** Asia/Kuwait (fixed +03:00, no DST).

---

#### `getTodaysChallenge` — onCall (authed)

**Purpose:** Returns today's challenge + assigns a random question to the user (lazy assignment).

**Logic:**
1. Find the active challenge (status in `["scheduled", "active"]`, ordered by `startTime desc`, limit 1)
2. Check if current time is within `[startTime, endTime]` — if not, return null
3. Check if `challenge_responses/{challengeId}_{userId}` exists:
   - **If exists:** Return the existing `assignedQuestionId`
   - **If new:** Fetch all `challenge_questions` where `active == true`, shuffle, pick first, create response doc, increment `stats.assignedCount`
4. Fetch the assigned question's data from `challenge_questions/{assignedQuestionId}`
5. Return: `{ challenge: { id, startTime, endTime, status, question: { id, type, question, imageUrl, options } } }`

**Security:** Requires authenticated user (`request.auth.uid`).

---

#### `submitChallengeResponse` — onCall (authed)

**Purpose:** Stores the user's answer for today's challenge.

**Input:** `{ challengeId: string, selectedAnswer: number }` (0–3)

**Logic:**
1. Validate inputs, check challenge exists and is within `[startTime, endTime]`
2. Read `challenge_responses/{challengeId}_{userId}` — must exist (assigned first)
3. Check `selectedAnswer` is `null` (not already answered)
4. Update response doc: `{ selectedAnswer, respondedAt: serverTimestamp() }`
5. Increment `stats.respondedCount` on the challenge doc

**Errors:**
- `unauthenticated` — not logged in
- `invalid-argument` — bad challengeId or selectedAnswer
- `failed-precondition` — challenge not active or response not assigned
- `already-exists` — user already answered

---

#### `finalizeDailyChallenges` — Scheduled (every 1 minute)

**Purpose:** Grades all responses for challenges that have ended.

**Logic:**
1. Query `challenges` where `status in ["scheduled", "active"]` — for each:
   - Skip if `now <= endTime` (still active)
   - Query all `challenge_responses` where `challengeId == this challenge`
   - For each response with `selectedAnswer != null`:
     - Fetch `challenge_questions/{assignedQuestionId}` → get `correctAnswer`
     - Compute `isCorrect = selectedAnswer === correctAnswer`
     - Compute `pointsAwarded = isCorrect ? pointsPerCorrect : 0` (`pointsPerCorrect = 10`)
     - Update response doc: `{ isCorrect, pointsAwarded }`
     - If correct: fetch `users/{userId}` for denormalized fields, add to `topPerformers` list
     - If correct: accumulate in `leaderboardEntries` map
   - Sort `topPerformers` by `respondedAt` ascending, take top 5
   - Batch update challenge doc: `{ status: "ended", stats.correctCount, topPerformers }`
   - Merge `leaderboardEntries` into existing `weekly_leaderboard/{weekId}.entries`
   - For any entry where `daysPlayed >= 7`: `users/{userId}.points += weekPoints`
   - Commit batch

**Denormalized user fields (fetched from `users/{uid}` during finalization):**
- `name` → `userName`
- `team` → `userTeam`
- `tierName` → `tierName`
- `tierColor` → `tierColor`

---

### Data Flow Diagram

```
┌─────────────────────┐
│ challenge_questions  │  (admin CRUD, toggle active)
└─────────┬───────────┘
          │
  ┌───────┼───────────────────────┐
  │       │                       │
  ▼       ▼                       ▼
auto      getTodaysChallenge    finalize
Publish   (mobile call)         (minute cron)
  │       picks random Q         grades all
  │       creates response       updates leaderboard
  ▼       ▼                       ▼
challenges/{id}  ──►  challenge_responses/{cid}_{uid}
                           │
                           ▼
                    weekly_leaderboard/{weekId}
                           │
                           ▼ (at 7/7)
                    users/{uid}.points += weekPoints
```

---

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Lazy assignment** | Each user gets a different random question at request time, not at challenge creation. Ensures variety with large user bases |
| **Doc ID convention** | `challenge_responses` uses `{challengeId}_{userId}` — O(1) lookup, no duplicates |
| **Denormalized snapshots** | `userName`, `userTeam`, `tierName`, `tierColor` copied into responses/leaderboard at finalization. Avoids joins, fast reads |
| **Two scheduled CFs** | `autoPublishDailyChallenge` + `finalizeDailyChallenges` both run every 1 min. Both idempotent |
| **Embedded leaderboard** | `entries[]` array in `weekly_leaderboard/{weekId}` — merged (not replaced) on each finalization. Single-doc reads for the admin dashboard |
| **Weekly streak** | Points only commit to `users.points` at 7/7. Missed day = entire bucket forfeited |
| **No difficulty in UI** | Stored in `challenge_questions.difficulty` but hidden from admin UI. Can be used for future filtering or weighted selection |
| **Fixed Kuwait timezone** | +03:00 offset, no DST. All date calculations use `kuwaitShifted()` for consistency |

---

## 8. Ads Configuration (إدارة الإعلانات)

Single config doc — **no ad content**, just mobile ad placement settings. Managed by super_admin in Settings → Ads tab.

### `settings/ads` — AdMob config (single doc, ID `ads`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | `boolean` | ✅ | Master toggle (enable/disable all ads on mobile) |
| `adUnitIdAndroid` | `string` | ✅ | AdMob unit ID for Android banner |
| `adUnitIdIos` | `string` | ✅ | AdMob unit ID for iOS banner |
| `frequencyCap` | `number | null` | — | Max ads shown per session (null = unlimited) |
| `bannerPosition` | `'top' \| 'bottom'` | ✅ | Banner placement |
| `testMode` | `boolean` | ✅ | AdMob test mode |
| `updatedAt` | `serverTimestamp` | — | Last save time |

Written by `saveAdConfig` (Settings UI), read via `fetchAdConfig`. Saved config writes a `settings.ads` activity-log entry.

---

## 9. Membership Plans (خطط العضوية)

Admin configures plans; the mobile app handles **payment automatically** (Stripe/IAP → Cloud Function validates → activates membership instantly). Admin only configures plans and views subscribers — payments are not handled by the admin panel.

### `membership_plans/{planId}` — Plans (super_admin CRUD)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Display name, e.g. `برونزي` |
| `tier` | `'free' \| 'bronze' \| 'silver' \| 'gold'` | ✅ | Suggested tier key |
| `price` | `number` | ✅ | Price |
| `currency` | `string` | ✅ | Currency code, e.g. `KWD` |
| `durationDays` | `number` | ✅ | Subscription duration |
| `benefits` | `string[]` | ✅ | Perk list |
| `active` | `boolean` | ✅ | Whether the plan is offered |
| `createdAt` | `serverTimestamp` | — | Creation time |

### `membership_subscriptions/{subscriptionId}` — Subscribers (view only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | ✅ | Subscribing user |
| `userName` | `string` | — | Denormalized display name |
| `userTeam` | `string \| null` | — | Denormalized favorite team |
| `planId` | `string` | ✅ | Chosen plan |
| `planName` | `string` | — | Denormalized plan name |
| `status` | `'active' \| 'expired' \| 'cancelled'` | ✅ | Subscription state |
| `startedAt` | `Timestamp` | ✅ | Activation time |
| `expiresAt` | `Timestamp \| null` | — | Expiry time |

Activated by the `onPaymentSuccess` Cloud Function (`membership_subscriptions`, `membership_plans`) after receipt validation — the admin panel never writes here.

---

## 10. Coverage Matches (المباريات المغطاة)

Non-Barça/non-Real Madrid fixtures pulled live from the external sports API (leagues: LaLiga `140`, Champions League `2`, Copa del Rey `143`, Supercopa `556`). The scheduled Cloud Function caches a rolling window (today−1 … today+7) into Firestore; **finished matches are saved permanently** and remain editable for Arabic translation.

### `coverage_matches/{matchId}` — Coverage match

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | External API fixture id (used as doc id) |
| `home` | `{ id, name, logo }` | ✅ | Home team (external API id + name + logo URL) |
| `away` | `{ id, name, logo }` | ✅ | Away team |
| `competitionId` | `number` | ✅ | External API competition/league id |
| `competition` | `string` | ✅ | API competition display name (fallback for translations) |
| `round` | `string` | ✅ | e.g. `Round 12` |
| `season` | `number` | ✅ | Season year |
| `date` | `string` | ✅ | Match date `YYYY-MM-DD` computed in Kuwait time from the API timestamp |
| `kickoff` | `string` | ✅ | Kickoff `HH:MM` (Kuwait) |
| `stadium` | `string \| null` | — | API stadium name |
| `channels` | `string[]` | — | Broadcast channels (admin-managed) |
| `status` | `'not_started' \| 'in_progress' \| 'finished'` | ✅ | Synced from API short status |
| `homeScore` / `awayScore` | `number \| null` | — | Live/final scores |
| `homeNameAr` / `awayNameAr` | `string \| null` | — | **Admin Arabic overrides** for team names |
| `competitionAr` | `string \| null` | — | **Admin Arabic override** for competition name |
| `stadiumAr` | `string \| null` | — | **Admin Arabic override** for stadium |
| `saved` | `boolean` | — | `true` once the match finished (permanent save) |
| `editedAt` | `serverTimestamp` | — | Written on admin edits; blocks the auto-prune |
| `timestamp` | `serverTimestamp` | — | Refresh write time (prune uses `timestamp < now − 2d`) |
| `statistics` | `{ home, away }` of `[{ type, value }]` | — | Live/final team statistics (`/fixtures/statistics`), same shape as `matches/{id}.statistics` |
| `statisticsUpdatedAt` | `number \| null` | — | Epoch ms of the last team-statistics write |
| `playerStatistics` | `{ home, away }` of `Record<apiPlayerId, PlayerFixtureEntry>` | — | Per-player statistics (`/fixtures/players`, paginated), same shape as `matches/{id}.playerStatistics` |
| `playerStatisticsUpdatedAt` | `number \| null` | — | Epoch ms of the last per-player-statistics write |

### Cloud Functions
- **`dailyCoverageFetch`** — scheduled daily at **00:00 Asia/Kuwait** (`0 0 * * *`). Seeds **today's** fixtures (`from=today&to=today`) for the 4 leagues (140/2/143/556), excludes fixtures where Barça (`529`) or Real Madrid (`541`) play, maps status, upserts with `setDoc(merge:true)` (admin overrides survive), then prunes docs older than **2 days** that were **never saved and not admin-edited**.
- **`liveCoverageTick`** — scheduled every minute (`* * * * *`, Asia/Kuwait); timer-gated (never overlaps concurrent runs). Covers a match **only from its kickoff**: queries `coverage_matches` where `timestamp <= now` AND `status in (not_started, in_progress)` ordered by kickoff asc (limit 60, needs the composite `timestamp ASC + status ASC` index), then samples the API up to **3× per minute (~20s apart)**, per-fixture `/fixtures?id=` with `FX_FIXTURE_BATCH_SIZE=10` parallel calls, marking `saved:true` on FT. While a fixture is `in_progress`, each sample ALSO fetches `/fixtures/statistics` + `/fixtures/players` (page loop, max 5 pages) and merges them into `coverage_matches/{id}.statistics` / `.playerStatistics` (+ `statisticsUpdatedAt` / `playerStatisticsUpdatedAt`) — same fields the app reads from `matches/{id}`, so mobile renders them with identical code. Heavy-stats cadence is tunable via `STATS_POLL_SAMPLES` (1 = every sample ≈20s). Idle minutes send a single `live=all` discovery call to pick up overnight/overtime matches. A 6h cap (`KICKOFF_GUARD_MS`) after kickoff stops covering stale/cancelled fixtures.
- **`triggerCoverageRefresh`** — onCall (admin only) manual refresh; runs the daily seed plus one live sample immediately (live sample also captures stats).
- **`saveCoverageMatchOnFinish`** — Firestore trigger on `coverage_matches/{matchId}` written; when API status becomes `finished`, captures a **one-time final snapshot** of `statistics` + `playerStatistics` (the live tick stops covering finished matches), sets `saved: true` to make the match permanent; then runs `syncTeamSeasonStatistics` for both teams (`seasonStatistics.ts`). Timeout: 300s.

### Admin panel
- Route `/coverage/matches` (first item under the "التغطية" popup nav) — status/league filters, search, manual refresh; finished matches in a collapsed "المباريات المنتهية" accordion.
- Edit dialog (`CoverageMatchEditDialog`) edits only the Arabic override fields + channels (channel names come from `coverage_channels` via the shared Autocomplete). Every save logs `coverage.match.update` to the admin activity log.
- Stats viewer (`CoverageStatsDialog`) — "إحصائيات" button on the card opens a read-only view of the live `statistics` (labelled team indicators) + `playerStatistics` (team switcher, per-player number/name/rating/minutes/goals/key passes) with last-update timestamp.
- Rules: `coverage_matches` is publicly readable, writable only by admins (`isAdmin()` helper in `firestore.rules`).

## 7b. Season Statistics (إحصائيات الموسم)

**Automatically synced** whenever any match finishes — Barcelona/Madrid matches (`matches/{id}` → `final` via `onMatchFinalized`) and coverage matches (`coverage_matches/{id}` → `finished` via `saveCoverageMatchOnFinish`). Current-season team + player statistics are fetched from the external sports API (`/teams/statistics` + `/players`) for all 4 competitions (140/2/143/556) and upserted into the competition DB. When the requested season has no data (e.g. a team not in this season's competitions — relegated sides), it falls back to the **previous season** and stores under the season the API reported (`league.season`).

### Storage

**Team stats** — `competitions/{leagueId}/teams/{teamId}`:

| Field | Type | Description |
|-------|------|-------------|
| `statistics` | `Record<string, TeamSeasonStatisticsDoc>` | Keyed by season year (e.g. `"2025"`). Each value: `form`, `played`, `wins`, `draws`, `losses`, `goalsFor`, `goalsAgainst`, `goalsDiff`, `cleanSheets`, `failedToScore`, `penaltyScored`, `penaltyMissed`, `penaltyTotal`, `yellowCards`, `redCards`, `updatedAt`, plus **persisted leaderboards** `topScorers`, `topAssists`, `topRated` — each an array of `{ playerId, name, photo, value }`, sorted high→low |
| `statisticsUpdatedAt` | `number` | Epoch ms of the last sync write |

**Player stats** — `competitions/{leagueId}/teams/{teamId}/players/{playerId}`:

| Field | Type | Description |
|-------|------|-------------|
| `statistics` | `Record<string, PlayerSeasonStatisticsDoc>` | Keyed by season year. Each value: `appearances`, `lineups`, `minutes`, `rating`, `position`, `captain`, `substitute`, shots, goals, passes, tackles, duels, dribbles, fouls, cards, penalties, subs (all matching `PlayerFixtureStatistics` field names + `appearances`/`lineups`), `updatedAt` |
| `statisticsUpdatedAt` | `number` | Epoch ms of the last sync write |

### Sync triggers

- **`onMatchFinalized`** — fires on `matches/{id}` `not_started|... → final`; resolves API team ids from internal team objects (`barca` → 529, `madrid` → 541, `api_NNN` → numeric); calls `syncTeamSeasonStatistics` for both teams using current year. **Scoped to the match's exact competition** via `matches/{id}.leagueId` (set on fixture import); older matches without it fall back to all 4 competitions.
- **`saveCoverageMatchOnFinish`** — extended to call `syncTeamSeasonStatistics` for both teams before marking `saved: true`. **Scoped to the match's exact competition** via `coverage_matches/{id}.competitionId` (falls back to all 4 competitions for legacy docs).

### Admin UI

- **Team page** (`/players/competition/:leagueId/team/:teamId`): hero "إحصائيات الموسم" button → `TeamStatisticsDialog` (form streak + W/D/L tiles + goals + clean sheets + cards + penalty + updatedAt). Also shows three **leaderboards persisted on the team season doc**: الهدافون (`topScorers`), صنّاع الأهداف (`topAssists`), الأعلى تقييماً (`topRated`) — each sorted high→low and written by the sync; the dialog falls back to deriving them live from player docs if the persisted arrays are missing.
- **Player card**: gold BarChart icon → `PlayerStatisticsDialog` (rating ring + appearances/lineups/minutes + grouped stat sections from API data).
- **Manual refresh**: `refreshTeamSeasonStatistics` callable (admin-guarded, 300s timeout) — syncs team stats **and every squad player's** season stats for all 4 competitions in one click (players fall back to the previous season when the current one is empty) and writes directly to the competition DB, so snapshot listeners update UI automatically.

---

## Cloud Functions Reference (summary)

| Function | Type | Trigger/Route | Feature |
|----------|------|---------------|---------|
| `onMatchEventWritten` | Firestore trigger | `matches/{id}/events/{eventId}` written | Score recalc |
| `onMatchEventCreated` | Firestore trigger | `matches/{id}/events/{eventId}` created | Fan-out push (per-cause for `pen_missed`) + `notifiedAt` |
| `onMatchEventUpdated` | Firestore trigger | `matches/{id}/events/{eventId}` updated | Re-fan-out on meaningful event edits (loop-guarded) |
| `onNewsCreated` | Firestore trigger | `news/{postId}` created | FCM fan-out to team topic + `notifiedAt` |
| `renotifyNewsPost` | onCall (admin) | `renotifyNewsPost` | Re-send news push |
| `setAdminRole` | onCall (super_admin) | `setAdminRole` | Set/update admin + custom claims |
| `revokeAdmin` | onCall (super_admin) | `revokeAdmin` | Remove admin + clear claims |
| `sendTopicNotification` | onCall (admin) | `sendTopicNotification` | Broadcast push to team topic |
| `recomputeTier` | Firestore trigger | `points_log/{logId}` created | Tier recompute from thresholds |
| `onPollVoteWrite` | Firestore trigger | `poll_votes/{voteId}` written | Poll vote aggregation |
| `onCommentCreated` | Firestore trigger | `comments/{commentId}` created | Depth cap + `repliesCount` |
| `onReportCreated` | Firestore trigger | `reports/{reportId}` created | Report count + auto-hide |
| `onPollExpired` | Scheduled | every 1 min | Auto-close expired polls |
| `autoPublishDailyChallenge` | Scheduled | every 1 min | Create daily challenge |
| `getTodaysChallenge` | onCall (authed) | `getTodaysChallenge` | Assign random question |
| `submitChallengeResponse` | onCall (authed) | `submitChallengeResponse` | Store answer |
| `finalizeDailyChallenges` | Scheduled | every 1 min | Grade + leaderboard + points commit |
| `onPaymentSuccess` | onCall | `onPaymentSuccess` | Validate receipt, activate membership (F11) |
| `dailyCoverageFetch` | Scheduled | daily 00:00 (Asia/Kuwait) | Seed today's coverage matches from API |
| `liveCoverageTick` | Scheduled | every 1 min (Asia/Kuwait) | Live polling (~20s) of matches from kickoff + prune |
| `triggerCoverageRefresh` | onCall (admin) | `triggerCoverageRefresh` | Manual coverage refresh |
| `saveCoverageMatchOnFinish` | Firestore trigger | `coverage_matches/{id}` written | Mark finished match as `saved` + sync season statistics |
| `onMatchFinalized` | Firestore trigger | `matches/{id}` `not_started\|... → final` | Sync season statistics for Barça/Madrid + opponent |
| `refreshTeamSeasonStatistics` | onCall (admin) | `refreshTeamSeasonStatistics` | Manual refresh of team + player season statistics for all 4 leagues |

---

## Firestore Indexes

Defined in `firestore/firestore.indexes.json`:

- `news`: `team + createdAt`, `tag + createdAt`, `team + tag + createdAt`
- `diwaniya`: `pinned + createdAt`, `type + createdAt`, `pollStatus + createdAt`, `type + pollStatus + createdAt`, `type + pollStatus + endsAt`
- `comments`: `postId + createdAt`
- `admins/{uid}/log`: `targetType + timestamp`
- `collectionGroup('log')`: enable the `log` collection group; composite `adminId + timestamp`

---

## Notes / Known Inconsistencies

- **User team field naming:** The admin UI reads `users/{uid}.favoriteTeam`, but the challenge Cloud Functions read `users/{uid}.team`. These must be aligned when the mobile write path is finalized.
- **`tierName` / `tierColor` denormalized fields** on `users/{uid}` are read by challenge finalization but are not written by the current admin UI; they come from the `recomputeTier`/mobile path.
- **`membership_subscriptions` activation** happens only via `onPaymentSuccess` (mobile-driven); the admin panel configures plans and reads subscribers, it never writes subscription docs.
- Spec-only features (Commentators/Channels/Stadiums) are not documented here until implemented.
