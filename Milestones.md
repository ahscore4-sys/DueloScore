# DueloScore Admin Control Panel — Milestones

**Platforms:** Web (React + TypeScript)
**Current State:** 9 of 11 features done (M1, M3, M4, M5, M6, M7, M8, M9, M10), M2 partial, M11 not yet begun.
**Goal:** Complete all 11 features per AGENTS.md.

---

## M1 — Foundation & Shell (Complete Existing)
**Status:** Done.
**Depends on:** Nothing.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 1.1 | Vite + React 18 + TS scaffold | Done | Project boots, `npm run dev` works |
| 1.2 | MUI v6 dark RTL theme | Done | `theme.ts` configured with colors, fonts, glassmorphism |
| 1.3 | AppShell sidebar navigation | Done | All nav items declared, popup menu for Coverage |
| 1.4 | Routing (all routes declared) | Done | Every route from AGENTS.md Route Map exists in `App.tsx` |
| 1.5 | Login page | Done | Email + password form |
| 1.6 | Profile page | Done | Basic profile display |
| 1.7 | ComingSoon placeholders | Done | All unimplemented pages show ComingSoon |
| 1.8 | Shared components | Done | `GlassCard`, `MatchStatusBadge`, `LogoMark` |
| 1.9 | Firebase SDK initialization | Done | `src/core/data/firebase.ts` — Auth, Firestore, Storage, FCM initialized from VITE env vars |
| 1.10 | Auth context/provider | Done | `AuthContext` + `useAuth()` hook — session persistence, Firestore role check (`admins/{uid}`) |
| 1.11 | Route guards | Done | `ProtectedRoute` — redirects to `/login` when unauthenticated; wraps all AppShell routes |
| 1.12 | Build passes | Done | `npm run build` (tsc + vite) zero errors |
| 1.13 | Lint passes | Done | `npm run lint` zero warnings |

### Acceptance Criteria
- App boots, logs in via Firebase Auth, navigates all declared routes
- Unauthenticated users redirected to `/login`
- `npm run build` and `npm run lint` both pass

---

## M2 — Match Control (Complete Existing)
**Status:** Partially built (MatchList, MatchHub, MatchInfo, PreMatch, LiveControl pages exist but incomplete).
**Depends on:** M1.

### Deliverables

| # | Sub-task | Description |
|---|----------|-------------|
| 2.1 | Match list with filters | Competition filter, status filter (not started/live/finished), team filter, search bar |
| 2.2 | Match status badges | Visual badges on list cards: live (green pulse), finished (gray), not started (blue) |
| 2.3 | Match create dialog | `MatchFormDialog` — teams (auto-populate for Barça/Madrid, API for opponents), competition, round/season, stadium, channels, commentators, kickoff time |
| 2.4 | Match edit dialog | Same form as create, pre-filled with existing data |
| 2.5 | Match delete | Confirm dialog with recalc warning |
| 2.6 | Match summary video URL | Input field in match form for summary video URL |
| 2.7 | Pre-Match wizard — Step 1: Formation | Select tactical formation (4-3-3, 4-4-2, etc.) |
| 2.8 | Pre-Match wizard — Step 2: Lineup | Assign starting XI to formation positions via `PlayerPickerDialog` |
| 2.9 | Pre-Match wizard — Step 3: Bench | Select substitute players |
| 2.10 | Pre-Match wizard — Step 4: Injured | Create injured list |
| 2.11 | Team switcher (Barça/Madrid) | Toggle between teams in pre-match wizard |
| 2.12 | Opponent data from API | Fetch opponent lineup/players from external sports API |
| 2.13 | Player picker dialog | `PlayerPickerDialog` — team-filtered, status flags (booked/subbed/off) |
| 2.14 | Formation validation | Valid player count per slot, no duplicate players |
| 2.15 | Live Control — state machine buttons | Buttons appear based on current state only (e.g., "بدء الشوط الأول" only when Not Started) |
| 2.16 | Live Control — auto-timer | Starts at period start, stops at period end, runs automatically |
| 2.17 | Live Control — scoreboard | Live score, minute, period state display |
| 2.18 | Extra time input dialog | Informational added-minutes entry |
| 2.19 | Penalty shootout dialog | Per-team sections, player selector (on-pitch XI only), score/fail buttons, running shootout score |
| 2.20 | Event quick-action grid | 8 buttons: goal, opp_goal, yellow, red, pen_scored, pen_missed, sub, crossbar |
| 2.21 | Event mini-form — Goal | Choose scorer from players on pitch |
| 2.22 | Event mini-form — Card | Choose player for yellow/red card |
| 2.23 | Event mini-form — Penalty | Choose taker + scored/missed |
| 2.24 | Event mini-form — Substitution | Choose player out + player in |
| 2.25 | Auto-timestamp | Backend assigns event minute: `23:14 → 24'`, `47:12 → 45+3'`, `94:05 → 90+5'` |
| 2.26 | Second yellow → red auto-conversion | Giving a booked player another yellow auto-converts to red card event |
| 2.27 | Event timeline | Chronological list with minute, type, player, team, status flags |
| 2.28 | Event edit dialog | Edit player, type, minute, video URL |
| 2.29 | Event delete/undo | Confirm dialog with recalc warning |
| 2.30 | Backend recalc on edit/delete | Cloud Function recalculates score, player status, substitutions, timeline order |
| 2.31 | Per-event video URL | Each event can have a video clip URL; admin assigns via edit dialog |
| 2.32 | Summary video URL display | Mobile shows "Watch Summary" button only when URL exists |
| 2.33 | Captain selection + badge | Done | Pitch Preview (`/matches/:id/pre-match` and the pitch in Live Control) — tapping a player's number toggles captain (`TeamPlan.captain`, persisted via `saveMatchPlan`). Badge: small circular chip on the number with **just the letter "C"** — gold `#B8860B` on white when idle, white on gold `#B8860B` when that player is captain. `TeeIcon` chip design removed. |
| 2.34 | Missed-penalty cause | Done | Event dialog for "ركلة جزاء ضائعة" requires a cause: "تصدّى لها الحارس" (`saved`) or "ضائعة" (`off_target`). Stored as `MatchEvent.penaltyMissCause`; shown as a colored subtitle on the timeline (blue = saved, red = off target); drives per-cause fan notifications. |
| 2.35 | Attendance (crowd count) | Done | `MatchStatistics` page — gold attendance card (numeric input + "حفظ" via `updateMatchFields` → `matches/{id}.attendance`) always visible, plus a gold full-width "الحضور الجماهيري" row inside the statistics card (formatted with thousands separators). |
| 2.36 | Live statistics (10s polling) | Done | `useMatchStatsPolling` (client-side, runs at **MatchHub level** so it stays active across the whole match screen regardless of tab; shared via `MatchHubContext.statsPolling`) polls the API every 10s while a match with a `fixtureId` is in play, caching team statistics → `matches/{id}.statistics` (`statisticsUpdatedAt`) and full per-player stats → `matches/{id}.playerStatistics` (`playerStatisticsUpdatedAt`, from `/fixtures/players`: shots/goals/passes/tackles/duels/dribbles/fouls/cards/penalties/subs). Live per-player ratings merge into the pre-match pitch so on-pitch ratings appear during the game. The stats dialog includes an editable **distance covered** field (المسافة المقطوعة, كم) stored in `matches.{id}.playersDistance.{playerId}`. On final, Live Control also fetches player stats alongside ratings + team stats. The Statistics tab now has **two sub-tabs**: "Match Statistics" (existing team indicators + attendance) and "Players Statistics" (`PlayersStatisticsTab` — logo-based team switcher, player cards with photo/number/position/captain/rating color, key metrics row, grouped stat **Dialog**, skeleton + empty states, live indicator). |

### Types
- Extend existing: `Match`, `MatchEvent`, `TeamPlan`, `Player`, `Team`

### Firestore
- `matches/{matchId}`
- `match_events/{eventId}`

### Cloud Functions
- `onEventCreated` — assign/format event minute, fan-out notification
- `onEventUpdated` / `onEventDeleted` — recalculate derived state

### Acceptance Criteria
- Admin can create, edit, delete Barça/Madrid matches
- 4-step pre-match wizard works for both teams
- Live control state machine progresses through all states
- Events are logged with auto-timestamps
- Second yellow auto-converts to red
- Event edit/delete triggers backend recalc
- Video URLs assignable per-event and per-match

---

## M3 — News Management
**Status:** Done.
**Depends on:** M1.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 3.1 | News list page | Done | `/news` — sticky search/filter box, 2-column card grid, load-more pagination (10/page, cursor-based) |
| 3.2 | News post card | Done | Avatar, author, time ago, image, title/content, team+tag badges, likes/updates counts, source link, send-status icon, edit/delete actions |
| 3.3 | News create page | Done | Route: `/news/new` — image (16:9 crop), title, content, team/tag chips, author, source URL |
| 3.4 | News edit page | Done | Route: `/news/:id/edit` — same form, pre-filled |
| 3.5 | Post detail page | Done | Route: `/news/:id` — header, image left / title+content right, likes/source/delivery row |
| 3.6 | Updates thread | Done | Sub-posts on detail page: newest-first 2-column grid, add via dialog, edit/delete per update |
| 3.7 | Image upload | Done | Firebase Storage (`news_images/`) with mandatory 16:9 crop dialog (1920×1080 JPEG output), preview, replace/remove with old-file cleanup |
| 3.8 | Team/tag selector | Done | Team chips: الكل (default), برشلونة, ريال مدريد · Tag chips: عام, انتقالات, إصابات |
| 3.9 | Publish confirm dialog | Done | Creating publishes instantly (no draft state); dialog warns that posting notifies the team's fans |
| 3.10 | News delete | Done | Confirm dialog; removes post + updates + stored images from mobile immediately |
| 3.11 | Send status + re-send | Done | Per-post delivery chip; re-send button when delivery failed |
| 3.12 | Empty/loading states | Done | Arabic skeletons + "لا توجد أخبار بعد" empty state with CTA |

### Types
- `NewsPost`: id, title, content, imageUrl, imagePath, team (all/barcelona/realmadrid), tag (transfers/injuries/null), author, sourceUrl, likedBy (user-ID array), updatesCount, createdAt, updatedAt, notifiedAt
- `NewsUpdate`: id, content, imageUrl, imagePath, createdAt

### Firestore
- `news/{postId}`
- `news/{postId}/updates/{updateId}`

### Cloud Functions
- `onNewsCreated` — create-only trigger; pushes a notification to the post's team topic (`all_news` / `barcelona_news` / `realmadrid_news`) and stamps `notifiedAt`
- `renotifyNewsPost` — admin-only callable to retry a failed send

### Acceptance Criteria
- Admin can create, edit, delete news posts and their update threads
- Creating publishes instantly and notifies the chosen team's fans; failed sends show a status chip and can be retried
- Images upload cropped at 16:9 via Firebase Storage
- List filters/search combine with server-side pagination correctly

---

## M4 — Diwaniya (Community Hub)
**Status:** Done.
**Depends on:** M1.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 4.1 | Diwaniya hub page | Done | Single argumentative question page with post feed |
| 4.2 | Post card component | Done | Author avatar, name, tier badge, timestamp, text body, answer choices |
| 4.3 | Create poll dialog | Done | Question, options (argumentative choices), optional pin toggle |
| 4.4 | Post detail page | Done | Route: `/diwaniya/:id` — full post + nested comment threads |
| 4.5 | Comment thread component | Done | Nested replies (depth ≤ 5), reply button, author info |
| 4.6 | Reply form | Done | Inline reply to any comment, depth enforcement |
| 4.7 | Hide/restore post | Done | Moderator action: hide (soft-delete), restore from hidden |
| 4.8 | Hide/restore comment | Done | Same for comments at any depth |
| 4.9 | Reports queue | Done | List of reported targets by count + recency, reasons |
| 4.10 | Report detail view | Done | Jump to reported content, view reason, hide/restore |
| 4.11 | Auto-hide threshold | Done | Configurable in settings; auto-hide when report count exceeds threshold |
| 4.12 | Poll vote aggregation | Done | Cloud Function maintains `totalVotes`, `votesByTeam` on every vote |
| 4.13 | Poll expiry | Done | Scheduled Cloud Function auto-closes polls past `endsAt` |
| 4.14 | Empty state | Done | "لا توجد منشورات بعد" |

### Types
- `DiwaniyaPost`: id, authorId, authorName, authorTier, text, type (text/poll), createdAt, hidden, reportCount, poll fields (question, options, endsAt, pinned, pollStatus, totalVotes, votesByTeam)
- `Comment`: id, postId, parentId, rootId, depth, repliesCount, authorId, authorName, authorTier, text, createdAt, hidden, reportCount
- `Report`: id, targetType, targetId, reporterId, reason, createdAt

### Firestore
- `diwaniya/{postId}`
- `comments/{commentId}`
- `poll_votes/{pollId}_{userId}`
- `reports/{targetType}_{targetId}_{reporterId}`

### Cloud Functions
- `onPollVoteWrite` — atomically update poll aggregates
- `onCommentCreated` — maintain `repliesCount`, enforce depth cap
- `onReportCreated` — increment `reportCount`, apply auto-hide threshold
- `onPollExpired` — auto-close polls past `endsAt`

### Acceptance Criteria
- Single argumentative question page visible
- Admin can create polls with options
- Comment threads work with depth cap
- Hide/restore on posts and comments
- Reports queue with auto-hide
- Poll vote aggregation accurate

---

## M5 — User Management & Tiers
**Status:** Done.
**Depends on:** M1.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 5.1 | Users list page | Done | Search/filter by team, tier, points; joined date column |
| 5.2 | User card component | Done | Avatar, name, team badge, tier badge, points |
| 5.3 | User detail page | Done | Route: `/users/:id` — profile, favorite team, tier progress, devices, points history |
| 5.4 | Points adjustment dialog | Done | Add/deduct points with reason input, writes to `points_log` |
| 5.5 | Tier progress display | Done | Current tier, progress bar to next tier, points balance |
| 5.6 | Promote-to-admin dialog | Done | On `/users/:id`, super_admin only — per-feature permission checkboxes (matches, players, coverage, news, diwaniya, users, challenges, notifications, activity_log); writes custom claims + `admins/{uid}` |
| 5.7 | Edit/revoke admin dialog | Done | Modify an existing admin's permission set or revoke admin access entirely |
| 5.8 | User role display | Done | Show role badge + assigned permissions (list & detail) |
| 5.9 | Broadcast push dialog | Done | Send notification to team topic or all users |
| 5.10 | Empty state | Done | "لا يوجد مستخدمون بعد" |

### Types
- `User`: id, name, email, profilePicture, favoriteTeam, points, tier, tierProgress, devices, createdAt
- `AdminPermission`: `'matches' \| 'players' \| 'coverage' \| 'news' \| 'diwaniya' \| 'users' \| 'challenges' \| 'notifications' \| 'activity_log'`
- `AdminUser`: uid, name, email, role (`admin` \| `super_admin`), permissions[], createdAt — `super_admin` bypasses permission checks
- `PointsLog`: id, userId, points, reason, ref, createdAt
- `Device`: token, platform

### Firestore
- `users/{userId}`
- `admins/{uid}` — fields: name, email, role, permissions[]
- `points_log/{logId}`

### Cloud Functions
- `setAdminRole` — set/revoke admin via custom claims `{role, permissions}` + `admins/{uid}` doc
- `recomputeTier` — recalculate tier after points changes

### Acceptance Criteria
- Admin can view all users with search/filter
- Points adjustment works and logs to `points_log`
- super_admin can promote a user to admin with selected feature permissions; edit/revoke take effect immediately via route guards
- Broadcast push sends to team topic or all users

---

## M6 — Coverage Matches
**Status:** Done.
**Depends on:** M1.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 6.1 | Coverage matches list page | Done | Under "التغطية" popup menu (first item, `مباريات التغطية`); filters by status/league, search, manual refresh |
| 6.2 | Coverage match card | Done | Status badge, scores, competition, date, teams, stadium, channels |
| 6.3 | Coverage match edit dialog | Done | Edit team names (Arabic translation), competition name, stadium, channels (from `coverage_channels` via Autocomplete) |
| 6.4 | External API integration | Done | `dailyCoverageFetch` scheduled CF (`0 0 * * *` Asia/Kuwait — seeds today's fixtures only) + `liveCoverageTick` (`* * * * *` Asia/Kuwait — covers each match from its kickoff, sampling ~20s while active) + `triggerCoverageRefresh` onCall → caches into `coverage_matches` (leagues 140/2/143/556, excludes Barça/Madrid fixtures) |
| 6.5 | Auto-save on finish | Done | `saveCoverageMatchOnFinish` Cloud Function saves match permanently when status = finished |
| 6.6 | Arabic override fields | Done | Admin-edited Arabic names (`homeNameAr`/`awayNameAr`/`competitionAr`/`stadiumAr`) override API data on display; survives CF refreshes via `setDoc(merge:true)` |
| 6.7 | Match status sync | Done | Status (not_started/in_progress/finished) synced from API |
| 6.8 | Empty state | Done | "لا توجد مباريات مغطاة" |
| 6.9 | Season statistics sync | Done | `functions/src/seasonStatistics.ts` — `syncTeamSeasonStatistics(teamApiId, season)` fetches `/teams/statistics` + `/players` for all 4 leagues (140/2/143/556) and upserts into the competition DB (`competitions/{leagueId}/teams/{teamId}` `statistics.{season}` + `/players/{playerId}`). Wired into `saveCoverageMatchOnFinish` (before `saved:true`), into a new `onMatchFinalized` trigger on `matches/{id}` `→ final` (resolves internal ids: `barca`→529, `madrid`→541, `api_NNN`), and exposed as admin-guarded `refreshTeamSeasonStatistics` callable. Per-season keyed storage preserves admin edits + other seasons. Team page: hero "إحصائيات الموسم" button → `TeamStatisticsDialog` (form + W/D/L + goals + clean sheets + cards + penalty **+ persisted leaderboards stored on the team season doc: top scorers / top assists / top-rated**) ; player-card gold BarChart icon → `PlayerStatisticsDialog` (rating ring + appearances/lineups/minutes + grouped stats) with manual refresh buttons. `onMatchFinalized` scoped to the match's exact competition (`matches/{id}.leagueId`); manual refresh syncs team + all squad players with previous-season fallback. Verified: functions `tsc` + admin oxlint/tsc/build. |

### Implemented Decisions
- Leagues: LaLiga `140`, Champions League `2`, Copa del Rey `143`, Supercopa `556`. Fixtures where Barça (`529`) or Real Madrid (`541`) play are excluded from coverage.
- **Daily midnight fetch (Asia/Kuwait)**: `dailyCoverageFetch` seeds only **today's** fixtures for the 4 leagues. Finished (and saved) matches render in a collapsed accordion ("المباريات المنتهية … محفوظة تلقائياً") at the bottom; stale unsaved docs older than 2 days are pruned.
- **Kickoff-gated live polling**: `liveCoverageTick` (every minute) queries `coverage_matches` where `kickoff ≤ now && status ∈ {not_started, in_progress}` — a match is only covered from its kickoff onward. While active it samples the API up to **3× per minute (~20s apart)**, per-fixture (`/fixtures?id=`), so FT is reliably detected; idle minutes make a single `live=all` discovery call (overnight/overtime overlaps) and cost nothing else.
- **Live per-fixture stats**: while a covered match is `in_progress`, the same ~20s samples also fetch `/fixtures/statistics` + `/fixtures/players` (paginated) and merge them into `coverage_matches/{id}.statistics` / `.playerStatistics` (identical shape to `matches/{id}`) so the mobile app renders coverage stats with the same code. Heavy-stats cadence tunable via `STATS_POLL_SAMPLES` (default 1 = every sample). `saveCoverageMatchOnFinish` additionally captures a one-time final snapshot at `finished`. Admin readable via "إحصائيات" button → `CoverageStatsDialog`.
- A 6h cap after kickoff stops covering stale/cancelled fixtures.
- Levelled logs: every admin edit logs `coverage.match.update` via the per-admin activity log.
- Route `/coverage/matches` is permission-guarded (`coverage` permission) alongside the other coverage sub-routes.

### Types
- `CoverageMatch`: id, home, away, competition, round, season, date, kickoff, stadium, channels, status, homeScore, awayScore (+ `homeNameAr`, `awayNameAr`, `competitionAr`, `stadiumAr`, `saved`, `editedAt`)

### Firestore
- `coverage_matches/{matchId}` — read public; writes restricted to admins (`write: isAdmin()`)

### Cloud Functions
- `dailyCoverageFetch` — scheduled (`0 0 * * *`, Asia/Kuwait): seeds today's fixtures for the 4 leagues
- `liveCoverageTick` — scheduled (`* * * * *`, Asia/Kuwait): covers active matches from kickoff, ~20s polling, prune pass
- `triggerCoverageRefresh` — onCall (admin): manual fetch + live sample
- `saveCoverageMatchOnFinish` — permanent save when match finishes + sync season statistics for both teams
- `onMatchFinalized` — fires on Barça/Madrid matches `→ final`; syncs season statistics for both teams + opponent
- `refreshTeamSeasonStatistics` — onCall (admin): manual refresh of team + player season statistics for all 4 leagues

### Acceptance Criteria
- ✅ Coverage matches fetched from external API
- ✅ Admin can edit metadata for Arabic translation
- ✅ Matches saved permanently once finished
- ✅ Arabic overrides display correctly

---

## M7 — Today's Challenge
**Status:** Done.
**Depends on:** M5.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 7.1 | Challenge dashboard page | Done | Active challenge card with gradient hero, stat badges, weekly leaderboard, quick-action cards to question bank & history |
| 7.2 | Active challenge card | Done | Shows current challenge status (scheduled/active/ended), date, time window, participation stats, top performers when ended |
| 7.3 | Question bank page | Done | Route: `/challenges/bank` — list all questions with search, type/status filters, active toggle, load-more pagination |
| 7.4 | Question create page | Done | Route: `/challenges/bank/new` — type selector, question text, image upload (1:1 crop at 1024×1024), 4 options, correct answer radio, active toggle |
| 7.5 | Question edit page | Done | Route: `/challenges/bank/:id` — pre-filled form, delete option |
| 7.6 | Question type toggle | Done | Text (multiple choice) or Image (deformed image guess) |
| 7.7 | Image upload for questions | Done | Firebase Storage upload for image-type questions via shared `ImageDropZone` component (1:1 aspect) |
| 7.8 | Active/inactive toggle | Done | Per-question toggle on bank page with optimistic local state update |
| 7.9 | Challenge history page | Done | Route: `/challenges/history` — past challenges with status badges, stats (participation, accuracy, correct), top 3 performers, load-more pagination |
| 7.10 | Auto-publish challenge | Done | Scheduled Cloud Function `autoPublishDailyChallenge` creates a new challenge at midnight Kuwait time automatically. No manual publish button |
| 7.11 | Random question assignment | Done | `getTodaysChallenge` CF picks a random question from the active pool per user (lazy assignment at request time) |
| 7.12 | Weekly streak tracking | Done | `finalizeDailyChallenges` CF grades responses, maintains weekly leaderboard. 7/7 commits points to user total; missed day = bucket forfeited |
| 7.13 | Weekly leaderboard | Done | `weekly_leaderboard/{weekId}` doc with embedded entries array, merged across challenges each day |
| 7.14 | Question card clickable | Done | Clicking a question card navigates to edit page; switch/delete buttons stop propagation |

### Types
- `ChallengeQuestion`: id, type, question, imageUrl, imagePath, options (4), correctAnswer, difficulty, active, createdAt, usedAt
- `DailyChallenge`: id, questionIds[], scheduledDate, startTime, endTime, status, stats, topPerformers[], publishedBy, weekId, createdAt
- `ChallengeResponse`: id, challengeId, userId, userName, userTeam, tierName, tierColor, assignedQuestionId, selectedAnswer, isCorrect, pointsAwarded, respondedAt
- `WeeklyLeaderboardEntry`: userId, userName, userTeam, tierName, tierColor, daysPlayed, weekPoints

### Firestore
- `challenge_questions/{questionId}`
- `challenges/{challengeId}`
- `challenge_responses/{challengeId}_{userId}`
- `weekly_leaderboard/{weekId}`

### Cloud Functions
- `autoPublishDailyChallenge` — scheduled every 1 min; creates a new challenge doc at Kuwait midnight if none exists for today; writes scheduledDate, startTime (00:00), endTime (23:59:59), status 'active', weekId; publishes as "النظام التلقائي"
- `getTodaysChallenge` — onCall authed; finds the active challenge, lazily assigns a random question from the active pool to the user, creates a `challenge_responses/{challengeId}_{userId}` doc, increments `stats.assignedCount`
- `submitChallengeResponse` — onCall authed; stores `selectedAnswer` + `respondedAt`, increments `stats.respondedCount`; rejects if already answered or challenge not active
- `finalizeDailyChallenges` — scheduled every 1 min; finds challenges past endTime with status != ended, batch-grades all responses (looks up correct answer from `challenge_questions`), writes `isCorrect`/`pointsAwarded`, updates `stats.correctCount`, `topPerformers` (top 5 fastest correct), merges leaderboard entries, commits weekly bucket to `users.points` at 7/7

### Acceptance Criteria
- Admin can manage question bank (CRUD, toggle active, image upload)
- Question bank page with search, type/status filters, clickable cards
- Challenge dashboard shows active challenge with stats and weekly leaderboard
- History page shows past challenges with participation/accuracy stats
- Auto-publish creates challenges at midnight Kuwait time (no manual button)
- Each user gets a different random question from the active pool
- Finalize CF grades all responses and updates leaderboard
- Weekly streak: 7/7 commits points, missed day loses the bucket
- All builds (`npm run build`) and lint (`npm run lint`) pass clean

---

## M8 — Custom Push Notifications
**Status:** Done.
**Depends on:** M1.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 8.1 | Notifications hub page | Done | Tabs: Create New / History |
| 8.2 | Create notification form | Done | Title (required), body (required), image URL (optional) |
| 8.3 | Target audience selector | Done | All users / Barcelona fans / Real Madrid fans |
| 8.4 | Deep link input | Done | Optional URL for mobile navigation |
| 8.5 | Schedule picker | Done | Send now or schedule for later (date + time) |
| 8.6 | Notification history list | Done | Date, title, target, status (sent/scheduled/failed), delivery stats |
| 8.7 | Notification detail view | Done | Full content preview, target info, sent time, stats (sent/delivered/opened) |
| 8.8 | Send confirmation | Done | Confirm before sending |
| 8.9 | Empty state | Done | "لا توجد إشعارات بعد" |

### Types
- `PushNotification`: id, title, body, imageUrl, target, status, scheduledAt, sentAt, deepLink, stats, createdBy, createdAt

### Firestore
- `push_notifications/{notificationId}`

### Cloud Functions
- `sendPushNotification` — queries target users, sends via FCM
- `sendScheduledNotifications` — scheduled trigger for queued notifications

### Acceptance Criteria
- Admin can create, schedule, send, and view history of push notifications
- Targeting works for all/Barcelona/Real Madrid
- Delivery stats display correctly

### Match Event Notifications (8.10+ — added)
**Status:** Done.
**Depends on:** M1, M8.

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 8.10 | Match-event automatic fan-out | Done | `onMatchEventCreated` — every match event sends an Arabic notification to the fans of the teams in the match; skipped only for phase markers (shootout kicks included). Stamps `notifiedAt` on success. |
| 8.11 | Fan topics per match | Done | New topics `barcelona_match` / `realmadrid_match`; derived from home/away team ids (`barca`/`madrid`, name fallback) → Barça match → barca topic, Madrid match → madrid topic, Clásico → both. |
| 8.12 | VAR notification | Done | `sendMatchFanNotification(kind:'var')` onCall + LiveControl event-dialog button for goal/OG/red/in-match penalty types ("فحص VAR — إشعار للمشجعين"). |
| 8.13 | Penalty-awarded notification | Done | `sendMatchFanNotification(kind:'penalty_awarded')` — "🎯 ركلة جزاء لصالح {team}!" to the match's fan topics; LiveControl quick-action buttons (home/away). |
| 8.14 | Activity logging | Done | VAR/penalty-awarded sends logged as `notification.create` with targetType `match`. |
| 8.15 | Event-edit re-fan-out | Done | `onMatchEventUpdated` — editing an event re-sends the fan-out built from the **new** event data (presented as a fresh event, `data.updated: "1"`), skipping `phase` and pure `notifiedAt` stamps (loop guard via `hasMeaningfulChange`). |
| 8.16 | Removed (per change request) | Cancelled | Deletion of any event sends **no** notification (the earlier "removed after VAR check" fan-out was dropped on request). |
| 8.17 | Timeline VAR shortcut + clickable rows | Done | Gold `ic_var.svg` (referee holding VAR banner) IconButton on each VAR-capable event row next to edit/undo; whole row clickable → opens edit dialog; inner buttons/video stop propagation. Dialog VAR button shows only when editing an event. |
| 8.18 | VAR badge on event | Done | Sending a VAR notification marks the event doc `varAssigned: true` (on send success); the event row shows a gold VAR badge over its icon with "أُرسل إشعار فحص VAR لهذا الحدث". `varAssigned` excluded from the edit re-fan-out loop guard so tagging doesn't re-notify fans. |
| 8.19 | VAR referee decision | Done | Second click of the VAR button (once a check was announced) opens a decision dialog: "لا يوجد خطأ — الحدث صحيح" or "يوجد خطأ — إلغاء الحدث". Choice fans out a `var_decision` notification (match_var_decision) and writes `varDecision: 'error' | 'no_error'` to the event. When `error`, the event icon shows a red "مُلغى" badge (X). `varDecision` excluded from the update loop guard. |
| 8.20 | VAR decision refinements | Done | Cancelled events (`varDecision: 'error'`) are skipped by BOTH the `onMatchEventWritten` server recalc (match doc score/cards/subs) and the client `deriveMatchState` (LiveControl scoreboard derives score locally from events — this was why the score didn't visually change). After an error decision the dialog shows only the green (revert) option. Player name keeps its normal style (badge only). Fixed fan-target wording in the decision dialog. |
| 8.21 | VAR cancellation cause | Done | VAR badge on the event icon now appears ONLY when the event is cancelled (red X badge removed; tooltip shows the cause). Cancelling requires picking one of 4 causes (تسلل / مخالفة / لمسة يد / الكرة لم تتجاوز الخط) in a second dialog step; the cause goes into the fan notification body, the FCM data payload, and `varDecisionCause` on the event (cleared on revert). `varDecisionCause` excluded from the update loop guard. |
| 8.22 | Missed-penalty cause fan-out | Done | `pen_missed` events carry `penaltyMissCause`; `onMatchEventCreated`/`onMatchEventUpdated` build a different body per cause — 🧤 "تصدّى الحارس لركلة الجزاء…" (`saved`) vs ❌ "ركلة جزاء ضائعة!" (`off_target`) — and include `penaltyMissCause` in the FCM data payload. Editing an existing miss re-fans the updated message. |

### Notes
- **Mobile dependency:** devices must subscribe to the new topics `barcelona_match` / `realmadrid_match` (mobile currently only defines `*_news` topics and has no FCM wiring yet — mobile M10 scope). Until that lands, no device receives these pushes.
- Auto fan-out deliberately includes shootout kicks (no phase gating, per requirement).
- New files: `functions/src/matchNotifications.ts`, `admin/src/features/match/data/matchFanNotifications.service.ts`.

---

## M9 — Admin Activity Log (Settings Tab)
**Status:** Done.
**Depends on:** M1.

> **Relocation:** 2026-09 — moved OUT of the sidebar into Settings as the **Activity Log tab** (`/settings/log`). The old `/activity-log` route now redirects to `/settings/log`. Non-super-admin access is via the "سجل الأنشطة" button on the Profile page (Settings itself is super_admin-only in the sidebar). Recorded `8.B7` is untouched; the features in 9.x below were refactored (same components, now embedded with `showHeader={false}`).

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 9.1 | Activity log page | Done | Route: `/settings/log` — tab inside Settings; every admin sees their own log, super_admin sees all admins' logs |
| 9.2 | Log list | Done | Chronological list (timestamp desc) of all admin actions with cursor-based load-more |
| 9.3 | Filter bar | Done | By admin (dropdown, super_admin only), log type (category chips), date range (from/to DatePickers), search (text, client-side) |
| 9.4 | Log entry card | Done | Admin avatar/initials, color-coded action badge + type badge, target label, Kuwait timestamp, expandable type-specific details |
| 9.5 | Pagination | Done | Load-more button (infinite scroll pattern, 20/page cursor-based) |
| 9.6 | `logActivity()` helper | Done | `features/activity/data/activity.service`; fire-and-forget, called by every admin action |
| 9.7 | Action type badges | Done | Color-coded per category (match=blue, event=green, news=purple, diwaniya=orange, user=cyan, notification=pink, challenge=gold, settings=gray, session=teal) |
| 9.8 | Empty state | Done | "لا توجد أنشطة بعد" |

### Types
- `ActivityLogEntry`: id, adminId, adminName, targetType, action (`ActivityAction` union), targetId, targetLabel, details (type-specific payload), timestamp
- `ActivityAction`: `match.*`, `event.*`, `news.*`, `diwaniya.*`, `comment.*`, `report.create`, `user.points_adjust`, `user.broadcast`, `admin.*`, `notification.*`, `question.*`, `settings.*`, `session.*`

### Firestore
- `admins/{uid}/log/{logId}` — per-admin sub-collection; docs are heterogeneous, payload varies by `targetType`
- All logs for a super_admin are read through `collectionGroup('log')`

### Notes
- Logs survive admin revocation (sub-collections persist if `admins/{uid}` is deleted).
- Every admin action is logged: match/event CRUD + live control, news posts + update threads + renotify, diwaniya posts/comments/reports + moderation settings, user points + broadcast + admin role changes, notifications, challenge questions, session login/logout.
- Requires Firestore setup: enable collectionGroup on `log`, and composite indexes (auto-suggested by the console on first query error): targetType+timestamp, adminId+timestamp.

### Acceptance Criteria
- Every admin action is logged
- Filters work correctly (admin, log type, date range, search)
- Activity Log lives inside Settings as a tab (`/settings/log`); `/activity-log` redirects

---

## M10 — Settings & Dashboard (Rebuild)
**Status:** Done.
**Depends on:** M5, M9.

### Deliverables

| # | Sub-task | Status | Description |
|---|----------|--------|-------------|
| 10.1 | Settings page (tabbed layout) | Done | Route: `/settings` (index redirects to `/settings/log`) — MUI Tabs + nested `Outlet`; URL-deep-linkable tabs; super-admin-only paths redirect non-super-admins to `/settings/log` |
| 10.2 | Activity Log tab | Done | `/settings/log` — all admins; embeds M9 ActivityLogPage (`showHeader={false}`) |
| 10.3 | Admin Management tab | Done | `/settings/admins` — super_admin only; user search + promote-in-place (reuses `AdminPermissionsDialog` + `setAdminRole`), current admin cards with edit/revoke (reuses `admins.service`) |
| 10.4 | Tier Thresholds tab | Done | `/settings/tiers` — super_admin only; editable per-tier point boundaries (`settings/tiers`), saved via `saveTierThresholds()` |
| 10.5 | Ads Configuration tab | Done | `/settings/ads` — super_admin only; AdMob enable/test-mode switches, Android/iOS unit IDs, frequency cap, banner position (`settings/ads`) |
| 10.6 | Membership Plans tab | Done | `/settings/membership` — super_admin only; plan CRUD (tier, price, currency, duration, benefits) + read-only subscribers list (`membership_plans`, `membership_subscriptions`) |
| 10.7 | Sidebar/nav changes | Done | Removed standalone "سجل الأنشطة" item; Settings stays `superAdminOnly: true`; Profile page gained a "سجل الأنشطة" button → `/settings/log` for non-super-admins |
| 10.8 | Dashboard rebuild | Done | `/` rebuilt on real Firestore data via `useMatches()`: live in-play hero (fallback when idle), today's real fixtures, latest real events from the live match, real overview counts, quick actions → `/matches/new`, `/news/new`, `/challenges/bank`, `/diwaniya` — no mock data |

### Types
- `AdConfig`: enabled, adUnitIdAndroid, adUnitIdIos, frequencyCap, bannerPosition ('top'|'bottom'), testMode
- `MembershipPlan`: id, name, tier ('free'|'bronze'|'silver'|'gold'), price, currency, durationDays, benefits[], active, createdAt
- `MembershipSubscription`: id, userId, userName, userTeam, planId, planName, status ('active'|'expired'|'cancelled'), startedAt, expiresAt

### Firestore
- `settings/ads`
- `settings/tiers` (written by `saveTierThresholds`, read by `useTierThresholds`)
- `membership_plans/{planId}`
- `membership_subscriptions/{subscriptionId}` (written by mobile payment flow)

### Activity Logging
- Ads save → `settings.ads`, tier thresholds save → `settings.tiers`, plan create/update/delete → `settings.membership`

### Acceptance Criteria
- All 5 Settings tabs functional
- Super-admin-only tabs hidden from the sidebar and protected by in-page redirects for regular admins
- Admin management (promote/edit/revoke) works via Cloud Functions
- Ads config + tier thresholds + membership plan CRUD persist to Firestore
- Dashboard runs on real data only, with loading and empty states

---

## M11 — Polish & Deploy
**Status:** Not started — too early to begin; depends on finishing M2, M6, M10.
**Depends on:** All previous milestones.

### Deliverables

| # | Sub-task | Description |
|---|----------|-------------|
| 11.1 | `npm run build` | Zero TS errors |
| 11.2 | `npm run lint` | Zero warnings |
| 11.3 | Responsive layout | Works on tablet (768px) + desktop (1024px+) |
| 11.4 | RTL QA | All text, layouts, dialogs properly RTL |
| 11.5 | Arabic error states | All error/empty/loading states in Arabic |
| 11.6 | Arabic validation messages | Form validation in Arabic |
| 11.7 | Hostinger deployment | Static build uploaded to `public_html` |
| 11.8 | Firebase config | Environment variables via `VITE_*` |
| 11.9 | Cross-browser testing | Chrome, Firefox, Safari, Edge |
| 11.10 | Performance audit | No memory leaks, smooth transitions |

### Acceptance Criteria
- Build and lint pass
- Responsive on tablet + desktop
- RTL correct everywhere
- Deployed to Hostinger
- All Arabic text correct

---

## Known Issues & Bugs Backlog

**Status:** Open — to be fixed later. Bugs are numbered per feature; refs point to the current code so they can be located when work resumes.

### M8 — Custom Push Notifications

| # | Bug | Where | Status |
|---|-----|-------|--------|
| 8.B1 | **Status race on send-now** — `persistNotification` always writes `status: 'scheduled'` (ternary yields the same value for both branches). For send-now, the doc only becomes `sent`/`failed` after the `sendPushNotification` callable runs. If the callable throws (e.g. not deployed, permission denied), the doc is stuck in `scheduled` forever — the scheduler ignores it (no `scheduledAt`) and it never shows `failed`. Should write `status: 'scheduled'` only when scheduling, and handle callable failure by flipping the doc to `failed`. | `admin/src/features/notifications/data/notifications.service.ts:95` | Open |
| 8.B2 | **No re-send action for failed notifications** — detail dialog shows "حاول مرة أخرى" but there is no button; service has no re-send function (would re-invoke `sendPushNotification` for an existing id). Spec (F8) wants an admin re-send action. | `admin/src/features/notifications/ui/components/NotificationDetailDialog.tsx:77` | Open |
| 8.B3 | **Not full CRUD** — only create/list/detail exist. No edit and no delete, though F8 spec says "Full CRUD + send/schedule". | `admin/src/features/notifications/` | Open |
| 8.B4 | **Stats are device-only** — `stats.sentCount` only, no delivered/opened tracking. `sendEachForMulticast` response already provides success/failure/invalid-token counts that are not stored; opened needs mobile-side reporting. | `admin/src/features/notifications/domain/notifications.types.ts:5`, `functions/src/notifications.ts:67` | Open |
| 8.B5 | **Scale/robustness** — `deliverNotification` loads the entire `users` collection and every device token in one query and one multicast batch; no pagination/batching. Risky at scale (timeouts, memory). | `functions/src/notifications.ts:38-67` | Open |
| 8.B6 | **Two parallel push mechanisms** — custom notifications use per-device token multicast, while news fanout and the `/users/:id` broadcast dialog use FCM topics via `sendTopicNotification`. Inconsistent delivery paths; decide on one model (or unify). | `functions/src/notifications.ts` vs `functions/src/index.ts:278` / `admin/src/features/user/data/broadcast.service.ts` | Open |
| 8.B7 | **Schedule timezone ambiguity** — `datetime-local` is interpreted in the admin's browser timezone and persisted as epoch; the scheduler compares in UTC, but display always formats as fixed Kuwait time (+3). Admins outside Kuwait schedule for their own wall-clock, producing a shifted shown time. | `admin/src/features/notifications/ui/components/CreateNotificationForm.tsx:176`, `.../domain/notifications.types.ts:56` | Open |
