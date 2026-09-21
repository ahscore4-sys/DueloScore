import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { callerIsAdmin } from "./adminGuards";
import { syncTeamSeasonStatistics } from "./seasonStatistics";
import { resolveFlagFromCountries } from "./countries";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const COVERAGE_LEAGUE_IDS = [140, 2, 143, 556] as const;
const EXCLUDED_TEAM_IDS = new Set<number>([529, 541]);
const KUWAIT_OFFSET_MS = 3 * 3600 * 1000;
// A match older than this after kickoff is no longer actively covered
// (catches cancellations/abandoned fixtures and stops over-polling).
const KICKOFF_GUARD_MS = 6 * 3600 * 1000;
// Coverage starts this long before kickoff so pre-match data (especially the
// announced lineups) is captured before the match begins.
const LINEUP_LOOKAHEAD_MS = 1 * 3600 * 1000;
// Throttle for lineups/injuries attempts while they are not published yet.
const LINEUP_RETRY_MS = 5 * 60 * 1000;
const CANDIDATE_LIMIT = 60;
const POLL_SAMPLES = 3;
const POLL_GAP_MS = 20 * 1000;
// How often the heavy per-fixture stats (player + team) are captured during a
// minute. 1 = every sample (~20s, same cadence as the score poll); 3 = only the
// first sample (~once per minute) if the API quota needs breathing room.
const STATS_POLL_SAMPLES = 1;
const PRUNE_AFTER_MS = 2 * 24 * 3600 * 1000;
const PRUNE_BATCH = 200;

type CoverageStatus = "not_started" | "in_progress" | "finished" | "postponed";
type ApiStatusResult = CoverageStatus | "excluded";

interface ApiFixtureStatus {
  short: string;
  elapsed: number | null;
  extra: number | null;
}

interface ApiFixtureCore {
  id: number;
  timestamp: number;
  status: ApiFixtureStatus;
}

interface ApiFixtureTeam {
  id: number;
  name: string;
  logo: string;
}

interface ApiFixtureLeague {
  id: number;
  name: string;
  season: number;
  round: string;
}

interface ApiFixtureVenue {
  id: number | null;
  name: string | null;
  city: string | null;
}

interface ApiFixtureRaw {
  fixture: ApiFixtureCore;
  league: ApiFixtureLeague;
  teams: { home: ApiFixtureTeam; away: ApiFixtureTeam };
  goals: { home: number | null; away: number | null };
  venue: ApiFixtureVenue | null;
}

interface ApiFixturesResponse {
  response: ApiFixtureRaw[];
}

// --- Live per-fixture statistics (player + team) for covered matches ---
// Mirrors the shape the mobile app already reads from `matches/{id}`:
//   statistics = { home: [{type,value}...], away: [...] }
//   playerStatistics = { home: Record<apiId, {playerId,name,photo,stats}>, away: ... }
// so the app can render coverage-match stats with the same code paths.

interface ApiFixtureStatItem {
  type: string;
  value: string | null;
}

interface ApiFixtureStatisticsTeam {
  team: { id: number; name: string };
  statistics: ApiFixtureStatItem[];
}

interface ApiFixtureStatisticsResponse {
  response: ApiFixtureStatisticsTeam[];
}

// Cap safety net for the /fixtures/players page loop (real squads span 2 pages).
const MAX_PLAYER_STATS_PAGES = 5;

type RawPlayerGroup = {
  games?: { minutes: number | null; rating: string | null; number?: number | null; position?: string | null; captain?: boolean; substitute?: boolean };
  substitutes?: { in?: number | null; out?: number | null; bench?: number | null };
  shots?: { total: number | null; on: number | null };
  goals?: { total: number | null; conceded: number | null; assists: number | null; saves: number | null };
  passes?: { total: number | null; key: number | null; accuracy: number | null };
  tackles?: { total: number | null; blocks: number | null; interceptions: number | null };
  duels?: { total: number | null; won: number | null };
  dribbles?: { attempts: number | null; success: number | null; past: number | null };
  fouls?: { drawn: number | null; committed: number | null };
  cards?: { yellow: number | null; red: number | null };
  penalty?: { won: number | null; committed: number | null; scored: number | null; missed: number | null; saved: number | null };
};

interface ApiFixturePlayer {
  id: number;
  name: string;
  photo?: string | null;
}

interface ApiFixturePlayerEntry {
  player: ApiFixturePlayer;
  statistics: RawPlayerGroup[];
}

interface ApiFixturePlayersTeam {
  team: { id: number; name: string };
  players: ApiFixturePlayerEntry[];
}

interface ApiPlayersPageResponse {
  response?: ApiFixturePlayersTeam[];
  paging?: { current?: number; total?: number };
}

interface PlayerFixtureStatistics {
  minutes: number | null;
  rating: number | null;
  number: number | null;
  position: string | null;
  captain: boolean;
  substitute: boolean;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  conceded: number | null;
  assists: number | null;
  saves: number | null;
  passesTotal: number | null;
  passesKey: number | null;
  passesAccuracy: number | null;
  tacklesTotal: number | null;
  tacklesBlocks: number | null;
  tacklesInterceptions: number | null;
  duelsTotal: number | null;
  duelsWon: number | null;
  dribbleAttempts: number | null;
  dribbleSuccess: number | null;
  dribblePast: number | null;
  foulsDrawn: number | null;
  foulsCommitted: number | null;
  cardsYellow: number | null;
  cardsRed: number | null;
  penaltyWon: number | null;
  penaltyCommitted: number | null;
  penaltyScored: number | null;
  penaltyMissed: number | null;
  penaltySaved: number | null;
  subsIn: number | null;
  subsOut: number | null;
  subsBench: number | null;
}

interface PlayerFixtureEntry {
  playerId: string;
  name: string;
  photo?: string | null;
  stats: PlayerFixtureStatistics;
}

// Lazy db accessor: the app is initialized in index.ts AFTER this module is
// loaded, so getFirestore() must not be called at module scope.
function getDb() {
  return getFirestore();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapApiStatus(short: string): ApiStatusResult {
  switch (short) {
    case "TBD":
    case "NS":
      return "not_started";
    case "PST":
    case "POST":
      return "postponed";
    case "SUSP":
      return "in_progress";
    case "1H":
    case "HT":
    case "2H":
    case "ET":
    case "BT":
    case "P":
    case "INT":
    case "LIVE":
      return "in_progress";
    case "FT":
    case "AET":
    case "PEN":
    case "AWD":
    case "WO":
      return "finished";
    case "CAN":
    case "ABD":
      return "excluded";
    default:
      return "not_started";
  }
}

function kuwaitDateOffset(days: number): string {
  const shifted = new Date(Date.now() + days * 24 * 3600 * 1000 + KUWAIT_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function kuwaitParts(timestampSec: number): { date: string; kickoff: string } {
  const shifted = new Date(timestampSec * 1000 + KUWAIT_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = shifted.getUTCDate();
  const hh = shifted.getUTCHours();
  const mm = shifted.getUTCMinutes();
  return { date: `${y}-${m}-${String(d).padStart(2, "0")}`, kickoff: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` };
}

async function fetchFixtures(queryParams: URLSearchParams): Promise<ApiFixtureRaw[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.error("API_FOOTBALL_KEY not set in environment");
    return [];
  }

  const url = new URL("/fixtures", API_FOOTBALL_BASE);
  queryParams.forEach((value, keyName) => url.searchParams.set(keyName, value));

  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchFixtures: HTTP ${res.status} for ${url.toString()}`);
      return [];
    }
    const data = (await res.json()) as ApiFixturesResponse;
    return Array.isArray(data.response) ? data.response : [];
  } catch (err) {
    console.error("fetchFixtures: error", err);
    return [];
  }
}

async function fetchFixtureById(fixtureId: number): Promise<ApiFixtureRaw | null> {
  const fixtures = await fetchFixtures(new URLSearchParams({ id: String(fixtureId) }));
  return fixtures[0] ?? null;
}

// Cached team meta used to attach country + flag to coverage matches. Kept in
// `coverage_teams/{apiId}` so each team is fetched from the API at most once.
interface ApiTeamMetaRaw {
  team?: { id?: number; name?: string; logo?: string; country?: string | null };
}

const TEAM_META_CACHE = new Map<number, { id: number; name: string; logo: string; country: string | null; flag: string | null }>();

async function fetchTeamMeta(teamId: number): Promise<{ id: number; name: string; logo: string; country: string | null; flag: string | null } | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  const url = new URL("/teams", API_FOOTBALL_BASE);
  url.searchParams.set("id", String(teamId));
  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: ApiTeamMetaRaw[] };
    const team = data.response?.[0]?.team;
    if (!team?.id) return null;
    const country = team.country ?? null;
    const flag = await resolveFlagFromCountries(country);
    return { id: team.id, name: team.name ?? "", logo: team.logo ?? "", country, flag };
  } catch (err) {
    console.error(`fetchTeamMeta: error for team ${teamId}`, err);
    return null;
  }
}

async function resolveCoverageTeamMeta(
  teamId: number,
  fallback: { name: string; logo: string },
): Promise<{ id: number; name: string; logo: string; country: string | null; flag: string | null }> {
  const cached = TEAM_META_CACHE.get(teamId);
  if (cached) return cached;

  const ref = getDb().doc(`coverage_teams/${teamId}`);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data() as Record<string, unknown>;
    const meta = {
      id: teamId,
      name: (d.name as string) ?? fallback.name,
      logo: (d.logo as string) ?? fallback.logo,
      country: (d.country as string) ?? null,
      flag: (d.flag as string) ?? null,
    };
    TEAM_META_CACHE.set(teamId, meta);
    return meta;
  }

  const fetched = await fetchTeamMeta(teamId);
  const meta =
    fetched && fetched.id === teamId
      ? fetched
      : { id: teamId, name: fallback.name, logo: fallback.logo, country: null, flag: null };
  await ref.set(meta, { merge: true });
  TEAM_META_CACHE.set(teamId, meta);
  return meta;
}

async function fetchFixtureStatistics(fixtureId: number): Promise<ApiFixtureStatisticsTeam[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.error("API_FOOTBALL_KEY not set in environment");
    return [];
  }
  const url = new URL("/fixtures/statistics", API_FOOTBALL_BASE);
  url.searchParams.set("fixture", String(fixtureId));
  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchFixtureStatistics: HTTP ${res.status} for fixture ${fixtureId}`);
      return [];
    }
    const data = (await res.json()) as ApiFixtureStatisticsResponse;
    return Array.isArray(data.response) ? data.response : [];
  } catch (err) {
    console.error("fetchFixtureStatistics: error", err);
    return [];
  }
}

// The /fixtures/players endpoint caps a page at ~20 players, so both squads can
// span multiple pages. Follows pagination and merges team groups per page.
async function fetchFixturePlayers(fixtureId: number): Promise<ApiFixturePlayersTeam[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.error("API_FOOTBALL_KEY not set in environment");
    return [];
  }
  const teams = new Map<number, ApiFixturePlayersTeam>();
  let page = 1;
  let totalPages = 1;
  do {
    const url = new URL("/fixtures/players", API_FOOTBALL_BASE);
    url.searchParams.set("fixture", String(fixtureId));
    url.searchParams.set("page", String(page));
    try {
      const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
      if (!res.ok) {
        console.error(`fetchFixturePlayers: HTTP ${res.status} for fixture ${fixtureId} page ${page}`);
        return [...teams.values()];
      }
      const data = (await res.json()) as ApiPlayersPageResponse;
      for (const group of data.response ?? []) {
        const existing = teams.get(group.team?.id);
        if (existing) existing.players.push(...(group.players ?? []));
        else if (group.team?.id != null) teams.set(group.team.id, { team: group.team, players: [...(group.players ?? [])] });
      }
      totalPages = Math.min(data.paging?.total ?? 1, MAX_PLAYER_STATS_PAGES);
    } catch (err) {
      console.error("fetchFixturePlayers: error", err);
      return [...teams.values()];
    }
    page++;
  } while (page <= totalPages);
  return [...teams.values()];
}

function nothingPlayerStats(): PlayerFixtureStatistics {
  return {
    minutes: null, rating: null, number: null, position: null, captain: false, substitute: false,
    shotsTotal: null, shotsOn: null, goals: null, conceded: null, assists: null, saves: null,
    passesTotal: null, passesKey: null, passesAccuracy: null, tacklesTotal: null, tacklesBlocks: null,
    tacklesInterceptions: null, duelsTotal: null, duelsWon: null, dribbleAttempts: null,
    dribbleSuccess: null, dribblePast: null, foulsDrawn: null, foulsCommitted: null, cardsYellow: null,
    cardsRed: null, penaltyWon: null, penaltyCommitted: null, penaltyScored: null, penaltyMissed: null,
    penaltySaved: null, subsIn: null, subsOut: null, subsBench: null,
  };
}

function mapPlayerStats(groups: RawPlayerGroup[]): PlayerFixtureStatistics {
  const g = groups[0] ?? {};
  const base = nothingPlayerStats();
  const card = (v: number | null | undefined): number | null => (v == null ? null : v);
  base.minutes = card(g.games?.minutes);
  base.rating = g.games?.rating != null && g.games.rating !== "" ? Number.parseFloat(g.games.rating) : null;
  base.number = card(g.games?.number);
  base.position = g.games?.position ?? null;
  base.captain = Boolean(g.games?.captain);
  base.substitute = Boolean(g.games?.substitute);
  base.shotsTotal = card(g.shots?.total);
  base.shotsOn = card(g.shots?.on);
  base.goals = card(g.goals?.total);
  base.conceded = card(g.goals?.conceded);
  base.assists = card(g.goals?.assists);
  base.saves = card(g.goals?.saves);
  base.passesTotal = card(g.passes?.total);
  base.passesKey = card(g.passes?.key);
  base.passesAccuracy = card(g.passes?.accuracy);
  base.tacklesTotal = card(g.tackles?.total);
  base.tacklesBlocks = card(g.tackles?.blocks);
  base.tacklesInterceptions = card(g.tackles?.interceptions);
  base.duelsTotal = card(g.duels?.total);
  base.duelsWon = card(g.duels?.won);
  base.dribbleAttempts = card(g.dribbles?.attempts);
  base.dribbleSuccess = card(g.dribbles?.success);
  base.dribblePast = card(g.dribbles?.past);
  base.foulsDrawn = card(g.fouls?.drawn);
  base.foulsCommitted = card(g.fouls?.committed);
  base.cardsYellow = card(g.cards?.yellow);
  base.cardsRed = card(g.cards?.red);
  base.penaltyWon = card(g.penalty?.won);
  base.penaltyCommitted = card(g.penalty?.committed);
  base.penaltyScored = card(g.penalty?.scored);
  base.penaltyMissed = card(g.penalty?.missed);
  base.penaltySaved = card(g.penalty?.saved);
  base.subsIn = card(g.substitutes?.in);
  base.subsOut = card(g.substitutes?.out);
  base.subsBench = card(g.substitutes?.bench);
  return base;
}

function toEntries(group: ApiFixturePlayersTeam): Record<string, PlayerFixtureEntry> {
  const out: Record<string, PlayerFixtureEntry> = {};
  for (const entry of group.players ?? []) {
    if (entry.player?.id == null) continue;
    out[String(entry.player.id)] = {
      playerId: String(entry.player.id),
      name: entry.player.name ?? "—",
      photo: entry.player.photo ?? null,
      stats: mapPlayerStats(entry.statistics),
    };
  }
  return out;
}

// Fetches team + per-player statistics for one fixture and merges them into
// coverage_matches/{fixtureId} (same field names as matches/{id}).
async function storeFixtureLiveStats(fixtureId: number): Promise<void> {
  const [statsTeams, playerTeams] = await Promise.all([
    fetchFixtureStatistics(fixtureId),
    fetchFixturePlayers(fixtureId),
  ]);
  const hasStats = statsTeams.length >= 1 && statsTeams[0].statistics.length > 0;
  const hasPlayers = playerTeams.length >= 1;
  if (!hasStats && !hasPlayers) return;

  const payload: Record<string, unknown> = {};
  if (hasStats) {
    payload.statistics = {
      home: statsTeams[0]?.statistics ?? [],
      away: statsTeams[1]?.statistics ?? [],
    };
    payload.statisticsUpdatedAt = Date.now();
  }
  if (hasPlayers) {
    payload.playerStatistics = {
      home: toEntries(playerTeams[0]),
      away: toEntries(playerTeams[1] ?? playerTeams[0]),
    };
    payload.playerStatisticsUpdatedAt = Date.now();
    // Same player-ratings map shape as matches/{id}.ratings (mobile + admin read
    // live ratings from on-pitch player cards).
    const ratings: Record<string, number> = {};
    for (const group of playerTeams) {
      for (const entry of group.players ?? []) {
        const rating = entry.statistics?.[0]?.games?.rating;
        const parsed =
          rating != null && rating !== "" ? Number.parseFloat(rating) : null;
        if (parsed != null && Number.isFinite(parsed) && entry.player?.id != null) {
          ratings[String(entry.player.id)] = parsed;
        }
      }
    }
    if (Object.keys(ratings).length > 0) payload.ratings = ratings;
  }

  await getDb().doc(`coverage_matches/${fixtureId}`).set(payload, { merge: true });

  // Plans may have been built earlier (pre-match) before per-player stats with
  // photos were available. Now that we have fresh photos/names, enrich existing
  // plans so player avatars + names render, without re-fetching lineups.
  if (hasPlayers) {
    try {
      await enrichPlansWithPhotos(
        fixtureId,
        payload.playerStatistics as Record<string, Record<string, PlayerFixtureEntry>>,
      );
    } catch (err) {
      console.error(`storeFixtureLiveStats: enrich plans failed for ${fixtureId}`, err);
    }
  }
}

// Backfills `photo`/`name` into an existing `plans` playerData from the newest
// per-player fixture statistics, so avatars appear even for matches whose plans
// were captured before photos were available.
async function enrichPlansWithPhotos(
  fixtureId: number,
  playerStatistics: Record<string, Record<string, PlayerFixtureEntry>>,
): Promise<void> {
  const doc = await getDb().doc(`coverage_matches/${fixtureId}`).get();
  if (!doc.exists) return;
  const data = doc.data() ?? {};
  const plans = data.plans as CoveragePlans | undefined;
  if (!plans) return;

  const home = (data.home as { id?: unknown })?.id;
  const away = (data.away as { id?: unknown })?.id;
  if (typeof home !== "number" || typeof away !== "number") return;

  let changed = false;
  const enriched: CoveragePlans = { ...plans };
  const planBySide: Array<{ id: number; plan: CoverageTeamPlan }> = [];
  for (const [key, plan] of Object.entries(plans)) {
    const teamId = Number(key);
    if (!Number.isFinite(teamId)) continue;
    planBySide.push({ id: teamId, plan });
  }

  for (const { id, plan } of planBySide) {
    const side = id === home ? "home" : id === away ? "away" : null;
    if (!side) continue;
    const entries = playerStatistics[side];
    if (!entries) continue;
    const playerData = { ...plan.playerData };
    let planChanged = false;
    for (const [pid, entry] of Object.entries(entries)) {
      const key = String(entry.playerId ?? pid);
      const existing = playerData[key];
      if (existing && existing.photo) continue;
      if (!existing && !entry.name && !entry.photo) continue;
      playerData[key] = {
        id: key,
        name: (existing?.name && existing.name !== "—" ? existing.name : null) ?? entry.name ?? "—",
        number: existing?.number ?? null,
        pos: existing?.pos ?? "",
        grid: existing?.grid ?? null,
        photo: existing?.photo ?? entry.photo ?? null,
      };
      planChanged = true;
    }
    if (planChanged) {
      enriched[String(id)] = { ...plan, playerData };
      changed = true;
    }
  }

  if (changed) {
    await getDb()
      .doc(`coverage_matches/${fixtureId}`)
      .set({ plans: enriched, lineupsUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
}

// --- Full match detail for covered matches (lineups, injuries, events) ---
// Lineups/injuries/ratings are stored embedded on `coverage_matches/{id}` in the
// mobile-compatible shape (`plans` mirrors matches/{id}.plans TeamPlan, ratings
// mirrors matches/{id}.ratings). Events go to the `events` subcollection exactly
// like matches/{id}/events so the app's existing code paths render them.

interface ApiLineupPlayer {
  id: number | null;
  name: string | null;
  number: number | null;
  pos: string | null;
  grid?: string | null;
}

interface ApiLineupEntry {
  player: ApiLineupPlayer;
}

interface ApiLineupTeamRaw {
  team: { id: number; name: string; logo: string };
  formation?: string | null;
  startXI?: ApiLineupEntry[];
  substitutes?: ApiLineupEntry[];
  coach?: { id: number | null; name: string | null; photo?: string | null } | null;
}

interface ApiLineupsResponse {
  response?: ApiLineupTeamRaw[];
}

interface ApiInjuryRaw {
  player?: { id: number | null; name: string | null; photo?: string | null };
  team?: { id: number | null; name?: string | null };
  type?: string | null;
  reason?: string | null;
}

interface ApiInjuriesResponse {
  response?: ApiInjuryRaw[];
}

interface ApiEventRaw {
  time?: { elapsed: number | null; extra: number | null };
  team?: { id: number | null; name?: string | null } | null;
  player?: { id: number | null; name: string | null } | null;
  assist?: { id: number | null; name: string | null } | null;
  type?: string | null;
  detail?: string | null;
  comments?: string | null;
}

interface ApiEventsResponse {
  response?: ApiEventRaw[];
}

interface CoveragePlanPlayerData {
  id: string;
  name: string;
  nameAr?: string | null;
  number: number | null;
  pos: string;
  grid?: string | null;
  photo?: string | null;
}

interface CoveragePlanCoach {
  name: string | null;
  photo?: string | null;
}

interface CoverageTeamPlan {
  formation: string;
  lineup: string[];
  bench: string[];
  injured: string[];
  suspended: string[];
  captain: string | null;
  playerData: Record<string, CoveragePlanPlayerData>;
  coach: CoveragePlanCoach | null;
}

type CoveragePlans = Record<string, CoverageTeamPlan>;

interface CoverageEventDocument {
  id: string;
  minute: string;
  elapsed: number;
  extra: number;
  type: string;
  detail: string | null;
  team: "home" | "away" | null;
  player: string;
  playerName: string;
  playerOut?: string;
  playerOutName?: string;
  assistPlayer?: string;
  assistName?: string;
  secondYellow?: boolean;
  penaltyMissCause?: "saved" | "off_target";
}

async function fetchFixtureLineups(fixtureId: number): Promise<ApiLineupTeamRaw[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];
  const url = new URL("/fixtures/lineups", API_FOOTBALL_BASE);
  url.searchParams.set("fixture", String(fixtureId));
  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchFixtureLineups: HTTP ${res.status} for fixture ${fixtureId}`);
      return [];
    }
    const data = (await res.json()) as ApiLineupsResponse;
    return Array.isArray(data.response) ? data.response : [];
  } catch (err) {
    console.error("fetchFixtureLineups: error", err);
    return [];
  }
}

async function fetchFixtureInjuries(fixtureId: number): Promise<ApiInjuryRaw[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];
  const url = new URL("/injuries", API_FOOTBALL_BASE);
  url.searchParams.set("fixture", String(fixtureId));
  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchFixtureInjuries: HTTP ${res.status} for fixture ${fixtureId}`);
      return [];
    }
    const data = (await res.json()) as ApiInjuriesResponse;
    return Array.isArray(data.response) ? data.response : [];
  } catch (err) {
    console.error("fetchFixtureInjuries: error", err);
    return [];
  }
}

async function fetchFixtureEvents(fixtureId: number): Promise<ApiEventRaw[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];
  const url = new URL("/fixtures/events", API_FOOTBALL_BASE);
  url.searchParams.set("fixture", String(fixtureId));
  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchFixtureEvents: HTTP ${res.status} for fixture ${fixtureId}`);
      return [];
    }
    const data = (await res.json()) as ApiEventsResponse;
    return Array.isArray(data.response) ? data.response : [];
  } catch (err) {
    console.error("fetchFixtureEvents: error", err);
    return [];
  }
}

function isSuspendedReason(reason: string | null | undefined): boolean {
  return Boolean(reason && /suspend/i.test(reason));
}

// Builds the `plans` map (mobile TeamPlan-compatible) for a fixture from the
// lineups + injuries. Capture id (from playerStatistics) and coach are attached.
// Player photos are merged from playerStatistics (the lineups endpoint has none).
// Injured/suspended players (from /injuries) are also added to `playerData` so
// their names/photos resolve in the UI instead of raw ids.
function buildPlansForFixture(
  lineups: ApiLineupTeamRaw[],
  injuries: ApiInjuryRaw[],
  homeId: number,
  awayId: number,
  playerStatistics: unknown,
): CoveragePlans {
  const plans: CoveragePlans = {};
  const injuredByTeam = new Map<number, ApiInjuryRaw[]>();
  const suspendedByTeam = new Map<number, ApiInjuryRaw[]>();
  for (const injury of injuries) {
    const teamId = injury.team?.id;
    if (teamId == null) continue;
    const bucket = isSuspendedReason(injury.reason)
      ? suspendedByTeam
      : injuredByTeam;
    const arr = bucket.get(teamId) ?? [];
    arr.push(injury);
    bucket.set(teamId, arr);
  }

  const statsByTeam = new Map<
    number,
    {
      playerId: string;
      captain: boolean;
      photo?: string | null;
    }[]
  >();
  const ps = (playerStatistics ?? {}) as {
    home?: Record<string, { playerId?: string; name?: string; photo?: string | null; stats?: { captain?: boolean } }>;
    away?: Record<string, { playerId?: string; name?: string; photo?: string | null; stats?: { captain?: boolean } }>;
  };
  const teams: Array<{ id: number; side: keyof typeof ps }> = [
    { id: homeId, side: "home" },
    { id: awayId, side: "away" },
  ];
  for (const team of teams) {
    const entries = ps[team.side];
    if (!entries) continue;
    statsByTeam.set(
      team.id,
      Object.values(entries).map((entry) => ({
        playerId: entry.playerId ?? "",
        captain: Boolean(entry.stats?.captain),
        photo: entry.photo ?? null,
      })),
    );
  }
  const profileByTeam = new Map<number, Map<string, { photo?: string | null; name?: string }>>();
  for (const team of teams) {
    const entries = ps[team.side];
    if (!entries) continue;
    const map = new Map<string, { photo?: string | null; name?: string }>();
    for (const [key, entry] of Object.entries(entries)) {
      const pid = String(entry.playerId ?? key);
      map.set(pid, { photo: entry.photo ?? null, name: entry.name });
    }
    profileByTeam.set(team.id, map);
  }

  const addInjuryPlayers = (data: Record<string, CoveragePlanPlayerData>, ids: string[], profile: Map<string, { photo?: string | null; name?: string }>, source: ApiInjuryRaw[]) => {
    for (const item of source) {
      const id = item.player?.id;
      if (id == null) continue;
      const key = String(id);
      if (data[key]) continue; // already in lineup/bench
      const meta = profile.get(key);
      data[key] = {
        id: key,
        name: item.player?.name ?? meta?.name ?? "—",
        number: null,
        pos: "",
        photo: meta?.photo ?? item.player?.photo ?? null,
      };
      ids.push(key);
    }
  };

  for (const raw of lineups) {
    const apiTeamId = raw.team?.id;
    if (apiTeamId == null) continue;
    const profile = profileByTeam.get(apiTeamId) ?? new Map<string, { photo?: string | null; name?: string }>();
    const playerData: Record<string, CoveragePlanPlayerData> = {};
    const lineup: string[] = [];
    const bench: string[] = [];
    for (const xi of raw.startXI ?? []) {
      const id = xi.player?.id;
      if (id == null) continue;
      const key = String(id);
      const meta = profile.get(key);
      playerData[key] = {
        id: key,
        name: xi.player.name || meta?.name || "—",
        number: xi.player.number ?? null,
        pos: xi.player.pos ?? "",
        grid: xi.player.grid ?? null,
        photo: meta?.photo ?? null,
      };
      lineup.push(key);
    }
    for (const sub of raw.substitutes ?? []) {
      const id = sub.player?.id;
      if (id == null) continue;
      const key = String(id);
      const meta = profile.get(key);
      playerData[key] = {
        id: key,
        name: sub.player.name || meta?.name || "—",
        number: sub.player.number ?? null,
        pos: sub.player.pos ?? "",
        grid: sub.player.grid ?? null,
        photo: meta?.photo ?? null,
      };
      bench.push(key);
    }

    const isHome = apiTeamId === homeId;
    const side = isHome ? "home" : apiTeamId === awayId ? "away" : null;
    const injured: string[] = [];
    const suspended: string[] = [];
    addInjuryPlayers(playerData, injured, profile, injuredByTeam.get(apiTeamId) ?? []);
    addInjuryPlayers(playerData, suspended, profile, suspendedByTeam.get(apiTeamId) ?? []);

    // Every player seen in the per-player statistics also gets a playerData
    // entry, so any id referenced anywhere (lineup, bench, subs, events, pitch)
    // resolves to a real name/photo instead of showing a raw id.
    const lineupIds = new Set<string>([...lineup, ...bench, ...injured, ...suspended]);
    const stats = (playerStatistics ?? {}) as {
      home?: Record<string, { playerId?: string; name?: string; photo?: string | null; stats?: { number?: number; position?: string } }>;
      away?: Record<string, { playerId?: string; name?: string; photo?: string | null; stats?: { number?: number; position?: string } }>;
    };
    const sideEntries = side ? stats[side] ?? {} : {};
    for (const [key, entry] of Object.entries(sideEntries)) {
      const pid = String(entry.playerId ?? key);
      if (lineupIds.has(pid)) continue;
      const meta = profile.get(pid);
      playerData[pid] = {
        id: pid,
        name: entry.name || meta?.name || "—",
        number: entry.stats?.number ?? null,
        pos: entry.stats?.position ?? "",
        photo: meta?.photo ?? entry.photo ?? null,
      };
    }

    let captain: string | null = null;
    for (const entry of statsByTeam.get(apiTeamId) ?? []) {
      if (entry.captain) {
        captain = entry.playerId ?? null;
        break;
      }
    }

    const plan: CoverageTeamPlan = {
      formation: raw.formation ?? "",
      lineup,
      bench,
      injured,
      suspended,
      captain,
      playerData,
      coach: raw.coach?.name
        ? { name: raw.coach.name, photo: raw.coach.photo ?? null }
        : null,
    };

    if (side === "home") plans[String(homeId)] = plan;
    else if (side === "away") plans[String(awayId)] = plan;
    else plans[String(apiTeamId)] = plan;
  }
  return plans;
}

// Fetches lineups + injuries and merges the mobile-compatible `plans` map into
// the coverage doc. No-op when `plans` already exists unless `force` is passed.
// When `retryMs` is set, empty responses are throttled (writes `lineupsAttemptedAt`)
// so pre-match polling does not hammer the API before lineups are published.
async function storeFixtureLineupsAndInjuries(
  fixtureId: number,
  opts: { force?: boolean; retryMs?: number } = {},
): Promise<boolean> {
  const docRef = getDb().doc(`coverage_matches/${fixtureId}`);
  const snap = await docRef.get();
  if (!snap.exists) return false;
  const current = snap.data() as Record<string, unknown>;
  if (!opts.force && current.plans) return false;

  const retryMs = opts.retryMs ?? 0;
  if (!opts.force && retryMs > 0) {
    const lastAttempt = current.lineupsAttemptedAt as number | undefined;
    if (typeof lastAttempt === "number" && Date.now() - lastAttempt < retryMs) return false;
  }

  const homeId = (current.home as { id?: unknown })?.id;
  const awayId = (current.away as { id?: unknown })?.id;
  if (typeof homeId !== "number" || typeof awayId !== "number") return false;

  const [lineups, injuries] = await Promise.all([
    fetchFixtureLineups(fixtureId),
    fetchFixtureInjuries(fixtureId),
  ]);
  if (lineups.length === 0) {
    if (retryMs > 0) {
      await docRef.set({ lineupsAttemptedAt: Date.now() }, { merge: true });
    }
    return false;
  }

  const plans = buildPlansForFixture(lineups, injuries, homeId, awayId, current.playerStatistics);
  await docRef.set({ plans, lineupsUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

function formatEventMinute(elapsed: number, extra: number): string {
  return extra > 0 ? `${elapsed}+${extra}'` : `${elapsed}'`;
}

function oppositeTeam(team: "home" | "away"): "home" | "away" {
  return team === "home" ? "away" : "home";
}

// Maps /fixtures/events API entries to the same MatchEvent semantics used by the
// admin LiveControl importer, keyed by a stable doc id per event.
function mapFixtureEvents(
  events: ApiEventRaw[],
  homeId: number,
  awayId: number,
): CoverageEventDocument[] {
  const out: CoverageEventDocument[] = [];
  for (const api of events) {
    const apiTeamId = api.team?.id;
    const apiTeam =
      apiTeamId === homeId ? "home" : apiTeamId === awayId ? "away" : null;
    if (!apiTeam || api.time?.elapsed == null) continue;
    const elapsed = api.time.elapsed;
    const extra = api.time.extra ?? 0;
    const minute = formatEventMinute(elapsed, extra);
    const apiPlayerId = api.player?.id != null ? String(api.player.id) : "";
    const apiPlayerName = api.player?.name ?? "";
    const apiAssistId = api.assist?.id != null ? String(api.assist.id) : "";
    const apiAssistName = api.assist?.name ?? "";

    let type: string | null = null;
    let secondYellow = false;
    let team: "home" | "away" = apiTeam;
    if (api.type === "Goal" && api.detail === "Normal Goal") type = "goal";
    else if (api.type === "Goal" && api.detail === "Own Goal") {
      type = "og";
      team = oppositeTeam(apiTeam);
    } else if (api.type === "Goal" && api.detail === "Penalty") type = "pen_scored";
    else if (api.type === "Goal" && api.detail === "Missed Penalty") type = "pen_missed";
    else if (api.type === "Card" && api.detail === "Yellow Card") type = "yellow";
    else if (api.type === "Card" && api.detail === "Red Card") type = "red";
    else if (api.type === "Card" && api.detail === "Second Yellow card") {
      type = "red";
      secondYellow = true;
    } else if (api.type === "subst") type = "sub";
    if (!type) continue;

    const isSub = type === "sub";
    const player = isSub
      ? apiAssistId || apiAssistName || apiPlayerId || apiPlayerName
      : apiPlayerId || apiPlayerName;
    const playerName = isSub ? apiAssistName || apiAssistId : apiPlayerName || apiPlayerId;
    const playerOut = isSub ? apiPlayerId || apiPlayerName : undefined;
    const playerOutName = isSub ? apiPlayerName || apiPlayerId : undefined;
    const assistPlayer = type === "goal" ? apiAssistId || apiAssistName || undefined : undefined;
    const assistName = type === "goal" ? apiAssistName || apiAssistId || undefined : undefined;

    const doc: CoverageEventDocument = {
      id: `${elapsed}_${extra}_${type}_${apiTeamId}_${player}`.replace(/\s+/g, "_"),
      minute,
      elapsed,
      extra,
      type,
      detail: api.detail ?? null,
      team,
      player,
      playerName,
      ...(isSub && playerOut ? { playerOut, playerOutName } : {}),
      ...(assistPlayer ? { assistPlayer, assistName } : {}),
      ...(secondYellow ? { secondYellow: true } : {}),
    };

    if (type === "pen_missed") {
      doc.penaltyMissCause =
        api.comments && /saved/i.test(api.comments) ? "saved" : "off_target";
    }

    out.push(doc);
  }
  return out;
}

// Live capture of the events subcollection. Upserts current events (stable doc
// ids) and removes stale ones — but never wipes the timeline on an empty/missing
// API response.
async function storeFixtureEvents(fixtureId: number): Promise<number> {
  const docRef = getDb().doc(`coverage_matches/${fixtureId}`);
  const snap = await docRef.get();
  if (!snap.exists) return 0;
  const data = snap.data() as Record<string, unknown>;
  const homeId = (data.home as { id?: unknown })?.id;
  const awayId = (data.away as { id?: unknown })?.id;
  if (typeof homeId !== "number" || typeof awayId !== "number") return 0;

  const mapped = mapFixtureEvents(await fetchFixtureEvents(fixtureId), homeId, awayId);
  const eventsRef = getDb()
    .collection("coverage_matches")
    .doc(String(fixtureId))
    .collection("events");

  const existing = await eventsRef.get();
  if (mapped.length === 0 && existing.size > 0) return existing.size;

  const keep = new Set(mapped.map((e) => e.id));
  const stale = existing.docs.filter((d) => !keep.has(d.id)).map((d) => d.ref);

  const batch = getDb().batch();
  for (const ref of stale) batch.delete(ref);
  for (const event of mapped) {
    batch.set(eventsRef.doc(event.id), event, { merge: true });
  }
  await batch.commit();
  await docRef.set({ eventsUpdatedAt: Date.now() }, { merge: true });
  return mapped.length;
}

async function upsertFixture(fixture: ApiFixtureRaw): Promise<boolean> {
  const homeId = fixture.teams?.home?.id;
  const awayId = fixture.teams?.away?.id;
  if (!homeId || !awayId) return false;
  if (EXCLUDED_TEAM_IDS.has(homeId) || EXCLUDED_TEAM_IDS.has(awayId)) return false;
  if (!(COVERAGE_LEAGUE_IDS as readonly number[]).includes(fixture.league.id)) return false;

  const status = mapApiStatus(fixture.fixture.status?.short ?? "NS");
  if (status === "excluded") return false;

  const { date, kickoff } = kuwaitParts(fixture.fixture.timestamp);
  const venue = fixture.venue;
  const stadium = venue?.name
    ? venue.city
      ? `${venue.name} — ${venue.city}`
      : venue.name
    : "";

  const homeMeta = await resolveCoverageTeamMeta(homeId, {
    name: fixture.teams.home.name,
    logo: fixture.teams.home.logo,
  });
  const awayMeta = await resolveCoverageTeamMeta(awayId, {
    name: fixture.teams.away.name,
    logo: fixture.teams.away.logo,
  });

  const payload: Record<string, unknown> = {
    fixtureId: fixture.fixture.id,
    competitionId: fixture.league.id,
    competition: fixture.league.name,
    round: fixture.league.round,
    season: fixture.league.season,
    date,
    kickoff,
    timestamp: fixture.fixture.timestamp * 1000,
    home: { id: homeId, name: fixture.teams.home.name, logo: fixture.teams.home.logo, flag: homeMeta.flag },
    away: { id: awayId, name: fixture.teams.away.name, logo: fixture.teams.away.logo, flag: awayMeta.flag },
    homeScore: fixture.goals?.home ?? null,
    awayScore: fixture.goals?.away ?? null,
    status,
    apiStatus: fixture.fixture.status?.short ?? "NS",
    apiElapsed: fixture.fixture.status?.elapsed ?? null,
    apiExtra: fixture.fixture.status?.extra ?? null,
    stadium,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Once an admin edits a match (round/season/stadium translations), the API
  // must never clobber those edits back — preserve the admin's values.
  const existing = await getDb().doc(`coverage_matches/${fixture.fixture.id}`).get().catch(() => null);
  const existingData = existing?.exists ? existing.data() : null;
  if (existingData && existingData.editedAt) {
    delete payload.round;
    delete payload.season;
    delete payload.competition;
    delete payload.stadium;
    delete payload.date;
    delete payload.kickoff;
  }

  await getDb().doc(`coverage_matches/${fixture.fixture.id}`).set(payload, { merge: true });
  return true;
}

async function pruneCoverageMatches(): Promise<void> {
  const cutoff = Date.now() - PRUNE_AFTER_MS;
  const snap = await getDb()
    .collection("coverage_matches")
    .where("timestamp", "<", cutoff)
    .orderBy("timestamp", "asc")
    .limit(PRUNE_BATCH)
    .get();

  let removed = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.saved === true || data.editedAt || data.status === "postponed") continue;
    await docSnap.ref.delete();
    removed++;
  }
  if (removed > 0) console.log(`pruneCoverageMatches: removed ${removed} stale unsaved matches`);
}

// Daily seed: fetch today's fixtures (Kuwait calendar) for the 4 coverage
// leagues and cache them. Runs once at midnight Kuwait time.
async function runDailyFetch(): Promise<number> {
  const season = new Date().getFullYear();
  const fromDate = kuwaitDateOffset(-3);
  const toDate = kuwaitDateOffset(1);

  let upserted = 0;
  for (const leagueId of COVERAGE_LEAGUE_IDS) {
    const params = new URLSearchParams({
      league: String(leagueId),
      season: String(season),
      from: fromDate,
      to: toDate,
    });
    const fixtures = await fetchFixtures(params);
    for (const fixture of fixtures) {
      if (await upsertFixture(fixture)) upserted++;
    }
  }

  await pruneCoverageMatches();
  return upserted;
}

// One live poll pass: cover (a) every stored match whose kickoff is within the
// lookahead window (so announced pre-match lineups are captured) and which is
// not finished yet (per-id fetch, reliable status/FT detection), plus (b) any
// match currently live that we don't have in Firestore yet (live=all discovery
// — handles overnight/overtime overlaps).
async function runLiveSample(discover: boolean, captureStats: boolean): Promise<{ updated: number; active: number }> {
  const now = Date.now();
  const snap = await getDb()
    .collection("coverage_matches")
    .where("timestamp", "<=", now + LINEUP_LOOKAHEAD_MS)
    .where("status", "in", ["not_started", "in_progress"])
    .orderBy("timestamp", "asc")
    .limit(CANDIDATE_LIMIT)
    .get();

  const pending: Array<{ id: number; kickoff: number }> = [];
  for (const docSnap of snap.docs) {
    const kickoff = typeof docSnap.get("timestamp") === "number" ? (docSnap.get("timestamp") as number) : now;
    if (kickoff < now - KICKOFF_GUARD_MS) continue; // stale (cancelled/abandoned): stop covering
    pending.push({ id: Number(docSnap.id), kickoff });
  }

  let updated = 0;
  const BATCH = 10;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const fixture = await fetchFixtureById(p.id);
          if (!fixture) return false;
          const ok = await upsertFixture(fixture);
          if (ok && captureStats) {
            const apiStatus = mapApiStatus(fixture.fixture.status?.short ?? "NS");
            if (apiStatus === "in_progress") {
              // Live per-fixture stats (player + team) sampled on the same ~20s
              // cadence as the score poll.
              try {
                await storeFixtureLiveStats(fixture.fixture.id);
              } catch (err) {
                console.error(`runLiveSample: live stats failed for fixture ${p.id}`, err);
              }
              // Live events timeline on the same cadence.
              try {
                await storeFixtureEvents(fixture.fixture.id);
              } catch (err) {
                console.error(`runLiveSample: live events failed for fixture ${p.id}`, err);
              }
            }
          }
          // Lineups + injuries are captured both pre-match (once announced) and
          // live. Throttled so we do not hammer the API while they are unpublished.
          if (ok) {
            try {
              await storeFixtureLineupsAndInjuries(fixture.fixture.id, { retryMs: LINEUP_RETRY_MS });
            } catch (err) {
              console.error(`runLiveSample: live lineups failed for fixture ${p.id}`, err);
            }
          }
          return ok;
        } catch (err) {
          console.error(`runLiveSample: error for fixture ${p.id}`, err);
          return false;
        }
      }),
    );
    updated += results.filter(Boolean).length;
  }

  let liveDiscovered = 0;
  if (discover) {
    const liveFixtures = await fetchFixtures(new URLSearchParams({ live: "all" }));
    for (const fixture of liveFixtures) {
      try {
        if (!(await upsertFixture(fixture))) continue;
        liveDiscovered++;
        if (captureStats && mapApiStatus(fixture.fixture.status?.short ?? "NS") === "in_progress") {
          try {
            await storeFixtureLiveStats(fixture.fixture.id);
          } catch (err) {
            console.error(`runLiveSample: live stats failed for discovered fixture ${fixture.fixture.id}`, err);
          }
        }
        try {
          await storeFixtureLineupsAndInjuries(fixture.fixture.id, { retryMs: LINEUP_RETRY_MS });
        } catch (err) {
          console.error(`runLiveSample: live lineups failed for discovered fixture ${fixture.fixture.id}`, err);
        }
      } catch (err) {
        console.error("runLiveSample: live discovery error", err);
      }
    }
  }

  return { updated: updated + liveDiscovered, active: pending.length + liveDiscovered };
}

async function runManualRefresh(): Promise<number> {
  const seeded = await runDailyFetch();
  const sample = await runLiveSample(true, true);
  return seeded + sample.updated;
}

export const dailyCoverageFetch = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Kuwait",
    timeoutSeconds: 300,
  },
  async () => {
    console.log("dailyCoverageFetch: started");
    try {
      const count = await runDailyFetch();
      console.log(`dailyCoverageFetch: seeded ${count} matches for today (Kuwait)`);
    } catch (err) {
      console.error("dailyCoverageFetch: error", err);
    }
  },
);

// Covers every minute; while any match is live it samples the API 3× per
// invocation (≈ every 20s). Idle minutes cost one live=all discovery call.
export const liveCoverageTick = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: "Asia/Kuwait",
    timeoutSeconds: 300,
  },
  async () => {
    for (let i = 0; i < POLL_SAMPLES; i++) {
      const discover = i === 0;
      const captureStats = i % STATS_POLL_SAMPLES === 0;
      try {
        const result = await runLiveSample(discover, captureStats);
        if (result.updated > 0) {
          console.log(`liveCoverageTick: updated ${result.updated} matches (sample ${i + 1}/${POLL_SAMPLES})`);
        }
        // Nothing active at all -> idle; stop the extra samples this minute.
        if (result.active === 0) return;
      } catch (err) {
        console.error("liveCoverageTick: error", err);
        return;
      }
      if (i < POLL_SAMPLES - 1) await sleep(POLL_GAP_MS);
    }
  },
);

export const triggerCoverageRefresh = onCall(
  {
    timeoutSeconds: 300,
  },
  async (request: CallableRequest) => {
    if (!(await callerIsAdmin(request))) {
      throw new HttpsError("permission-denied", "Admin privileges required.");
    }

    console.log("triggerCoverageRefresh: manual refresh triggered by admin");
    const count = await runManualRefresh();
    return { ok: true, count };
  },
);

// On-demand full detail backfill for a single coverage match: events timeline,
// lineups + injuries (forced refresh), fixture stats + ratings. Used from the
// match detail page to hydrate saved/finished/postponed/backdated matches that
// the live tick no longer covers.
export const refreshCoverageMatchDetails = onCall(
  {
    timeoutSeconds: 300,
  },
  async (request: CallableRequest) => {
    if (!(await callerIsAdmin(request))) {
      throw new HttpsError("permission-denied", "Admin privileges required.");
    }

    const fixtureId = request.data?.fixtureId;
    const id = typeof fixtureId === "number" ? fixtureId : Number(fixtureId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new HttpsError("invalid-argument", "A valid fixtureId is required.");
    }

    console.log(`refreshCoverageMatchDetails: refreshing details for fixture ${id}`);
    const result: Record<string, boolean | number> = { ok: true };
    try {
      await storeFixtureLiveStats(id);
      result.stats = true;
    } catch (err) {
      console.error(`refreshCoverageMatchDetails: stats failed for ${id}`, err);
      result.stats = false;
    }
    try {
      const lineups = await storeFixtureLineupsAndInjuries(id, { force: true });
      result.lineups = lineups;
    } catch (err) {
      console.error(`refreshCoverageMatchDetails: lineups failed for ${id}`, err);
      result.lineups = false;
    }
    try {
      const events = await storeFixtureEvents(id);
      result.events = events;
    } catch (err) {
      console.error(`refreshCoverageMatchDetails: events failed for ${id}`, err);
      result.events = 0;
    }
    return result;
  },
);

export const saveCoverageMatchOnFinish = onDocumentWritten(
  { document: "coverage_matches/{matchId}", timeoutSeconds: 300 },
  async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) return;

    const data = after.data() as {
      status?: string;
      saved?: boolean;
      season?: number;
      competitionId?: number;
      home?: { id?: number };
      away?: { id?: number };
    } | undefined;
    if (!data || data.status !== "finished") return;
    if (data.saved === true) return;

    const season = data.season ?? new Date().getFullYear();
    const homeId = data.home?.id;
    const awayId = data.away?.id;

    // One-time final snapshot of the per-fixture stats (the live tick stops
    // covering a match once it flips to finished, so capture it here).
    const fixtureId = Number(event.params.matchId);
    if (Number.isFinite(fixtureId) && fixtureId > 0) {
      try {
        await storeFixtureLiveStats(fixtureId);
      } catch (err) {
        console.error(`saveCoverageMatchOnFinish: final fixture stats failed for ${fixtureId}`, err);
      }
      // Final events timeline (goals/cards settle, VAR reversals land).
      try {
        await storeFixtureEvents(fixtureId);
      } catch (err) {
        console.error(`saveCoverageMatchOnFinish: final events failed for ${fixtureId}`, err);
      }
      // Lineups + injuries are stable; only backfill when missing entirely.
      try {
        await storeFixtureLineupsAndInjuries(fixtureId);
      } catch (err) {
        console.error(`saveCoverageMatchOnFinish: final lineups failed for ${fixtureId}`, err);
      }
    }

    // Scope the sync to the match's exact competition (falls back to all tracked
    // competitions for legacy docs that lack `competitionId`).
    const competitionId =
      typeof data.competitionId === "number" && Number.isFinite(data.competitionId)
        ? data.competitionId
        : null;
    const leagueIds = competitionId != null ? [competitionId] : undefined;

    if (homeId && Number.isFinite(homeId)) {
      try {
        await syncTeamSeasonStatistics(homeId, season, leagueIds);
      } catch (err) {
        console.error(`saveCoverageMatchOnFinish: season stats sync failed for home team ${homeId}`, err);
      }
    }
    if (awayId && Number.isFinite(awayId)) {
      try {
        await syncTeamSeasonStatistics(awayId, season, leagueIds);
      } catch (err) {
        console.error(`saveCoverageMatchOnFinish: season stats sync failed for away team ${awayId}`, err);
      }
    }

    await getDb()
      .doc(`coverage_matches/${event.params.matchId}`)
      .update({
        saved: true,
        savedAt: FieldValue.serverTimestamp(),
      });
  },
);