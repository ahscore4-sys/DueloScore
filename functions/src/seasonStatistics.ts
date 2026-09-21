import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { callerIsAdmin } from "./adminGuards";
import { getCountryFlagMap, flagForName } from "./countries";
import type { CountriesMap } from "./countries";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
export const SEASON_STAT_LEAGUE_IDS = [140, 2, 143, 556] as const;

// Lazy db accessor: initializing the app happens in index.ts AFTER this module
// is loaded, so we must not call getFirestore() at module scope (it would throw).
function getDb() {
  return getFirestore();
}

function teamRef(leagueId: number, teamId: number | string) {
  return getDb().doc(`competitions/${leagueId}/teams/${teamId}`);
}

function playerRef(leagueId: number, teamId: number | string, playerId: number | string) {
  return getDb().doc(`competitions/${leagueId}/teams/${teamId}/players/${playerId}`);
}

// ---------------------------------------------------------------------------
// Raw API-Football shapes for /teams/statistics and /players (season).
// ---------------------------------------------------------------------------

interface ApiTeamSeasonFixtures {
  played?: unknown;
  wins?: unknown;
  draws?: unknown;
  loses?: unknown;
}

interface ApiTeamSeasonGoalsPart {
  total?: unknown;
}

interface ApiTeamSeasonGoals {
  for: ApiTeamSeasonGoalsPart;
  against: ApiTeamSeasonGoalsPart;
}

interface ApiTeamSeasonCleanSheet {
  total?: unknown;
}

interface ApiTeamSeasonFailed {
  total?: unknown;
}

interface ApiTeamSeasonPenalty {
  total?: unknown;
  scored: { total?: unknown };
  missed: { total?: unknown };
}

interface ApiTeamSeasonCards {
  yellow?: unknown;
  red?: unknown;
}

interface ApiTeamSeasonRaw {
  league?: { id?: number; season?: number; name?: string };
  team?: { id: number; name: string; logo: string };
  form?: string | null;
  fixtures?: ApiTeamSeasonFixtures;
  goals?: ApiTeamSeasonGoals;
  clean_sheet?: ApiTeamSeasonCleanSheet;
  failed_to_score?: ApiTeamSeasonFailed;
  penalty?: ApiTeamSeasonPenalty;
  cards?: ApiTeamSeasonCards;
}

interface ApiPlayerStatisticsRaw {
  games?: {
    appearences?: number | null;
    lineups?: number | null;
    minutes?: number | null;
    position?: string | null;
    rating?: string | null;
    captain?: boolean;
    substitute?: boolean;
  };
  substitutes?: { in?: number | null; out?: number | null; bench?: number | null };
  shots?: { total?: number | null; on?: number | null };
  goals?: { total?: number | null; conceded?: number | null; assists?: number | null; saves?: number | null };
  passes?: { total?: number | null; key?: number | null; accuracy?: number | null };
  tackles?: { total?: number | null; blocks?: number | null; interceptions?: number | null };
  duels?: { total?: number | null; won?: number | null };
  dribbles?: { attempts?: number | null; success?: number | null; past?: number | null };
  fouls?: { drawn?: number | null; committed?: number | null };
  cards?: { yellow?: number | null; red?: number | null };
  penalty?: {
    won?: number | null;
    committed?: number | null;
    scored?: number | null;
    missed?: number | null;
    saved?: number | null;
  };
}

interface ApiPlayerSeasonEntryRaw {
  player?: { id: number; name: string; photo?: string | null; nationality?: string | null };
  statistics?: ApiPlayerStatisticsRaw[];
}

// ---------------------------------------------------------------------------
// Normalized (stored) shape — mirrors the admin-side doc types.
// ---------------------------------------------------------------------------

interface StoredTeamSeasonStatistics {
  form: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  cleanSheets: number;
  failedToScore: number;
  penaltyScored: number;
  penaltyMissed: number;
  penaltyTotal: number;
  yellowCards: number;
  redCards: number;
  updatedAt: number;
}

interface StoredPlayerSeasonStatistics {
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  rating: number | null;
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
  updatedAt: number;
}

// Persisted leaderboard row — mirrors `LeaderboardEntry` on the admin side so the
// mobile app can render top-scorers / top-assists / top-rated from the team doc
// without scanning the players subcollection.
interface LeaderboardEntry {
  playerId: number;
  name: string;
  photo: string;
  value: number;
}

const fnum = (v: number | null | undefined): number | null => (v == null ? null : v);

// API-Football returns many season aggregates as `{ total, home, away }` objects.
// totalFrom extracts the `total` number regardless of the value being a number or object.
function totalFrom(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value && typeof value === "object") {
    return totalFrom((value as Record<string, unknown>).total);
  }
  return 0;
}

// `cards.{yellow,red}` is a per-minute-range map (e.g. {"46-60": {"total": 5}}) — sum all buckets.
function sumCardRanges(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  let sum = 0;
  for (const bucket of Object.values(value as Record<string, unknown>)) {
    sum += totalFrom(bucket);
  }
  return sum;
}

interface ApiResult<T> {
  response: T[] | null;
  paging?: { current: number; total: number };
  errors: Record<string, string>;
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<ApiResult<T> | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.error("API_FOOTBALL_KEY not set in environment");
    return { response: null, errors: { key: "API_FOOTBALL_KEY not configured" } };
  }

  const url = new URL(path, API_FOOTBALL_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`apiGet: HTTP ${res.status} for ${path}`);
      return { response: null, errors: { http: `HTTP ${res.status}` } };
    }
    const json = (await res.json()) as {
      response?: T[];
      paging?: { current?: number; total?: number };
      errors?: Record<string, string>;
    };
    const paging =
      json.paging && typeof json.paging.total === "number"
        ? { current: json.paging.current ?? 1, total: json.paging.total }
        : undefined;
    return { response: json.response ?? null, paging, errors: json.errors ?? {} };
  } catch (err) {
    console.error(`apiGet: error for ${path}`, err);
    return { response: null, errors: { network: String(err) } };
  }
}

function mapTeamSeason(entry: ApiTeamSeasonRaw): StoredTeamSeasonStatistics {
  const fixtures = entry.fixtures ?? {};
  const goalsFor = totalFrom(entry.goals?.for?.total);
  const goalsAgainst = totalFrom(entry.goals?.against?.total);

  return {
    form: entry.form ?? null,
    played: totalFrom(fixtures.played),
    wins: totalFrom(fixtures.wins),
    draws: totalFrom(fixtures.draws),
    losses: totalFrom(fixtures.loses),
    goalsFor,
    goalsAgainst,
    goalsDiff: goalsFor - goalsAgainst,
    cleanSheets: totalFrom(entry.clean_sheet),
    failedToScore: totalFrom(entry.failed_to_score),
    penaltyScored: totalFrom(entry.penalty?.scored),
    penaltyMissed: totalFrom(entry.penalty?.missed),
    penaltyTotal: totalFrom(entry.penalty),
    yellowCards: sumCardRanges(entry.cards?.yellow),
    redCards: sumCardRanges(entry.cards?.red),
    updatedAt: Date.now(),
  };
}

function mapPlayerSeason(groups: ApiPlayerStatisticsRaw[] | undefined): StoredPlayerSeasonStatistics {
  const g = groups?.[0] ?? {};
  const rating: number | null = g.games?.rating != null && g.games.rating !== "" ? Number.parseFloat(g.games.rating) : null;
  return {
    appearances: fnum(g.games?.appearences),
    lineups: fnum(g.games?.lineups),
    minutes: fnum(g.games?.minutes),
    rating: Number.isFinite(rating ?? NaN) ? rating : null,
    position: g.games?.position ?? null,
    captain: Boolean(g.games?.captain),
    substitute: Boolean(g.games?.substitute),
    shotsTotal: fnum(g.shots?.total),
    shotsOn: fnum(g.shots?.on),
    goals: fnum(g.goals?.total),
    conceded: fnum(g.goals?.conceded),
    assists: fnum(g.goals?.assists),
    saves: fnum(g.goals?.saves),
    passesTotal: fnum(g.passes?.total),
    passesKey: fnum(g.passes?.key),
    passesAccuracy: fnum(g.passes?.accuracy),
    tacklesTotal: fnum(g.tackles?.total),
    tacklesBlocks: fnum(g.tackles?.blocks),
    tacklesInterceptions: fnum(g.tackles?.interceptions),
    duelsTotal: fnum(g.duels?.total),
    duelsWon: fnum(g.duels?.won),
    dribbleAttempts: fnum(g.dribbles?.attempts),
    dribbleSuccess: fnum(g.dribbles?.success),
    dribblePast: fnum(g.dribbles?.past),
    foulsDrawn: fnum(g.fouls?.drawn),
    foulsCommitted: fnum(g.fouls?.committed),
    cardsYellow: fnum(g.cards?.yellow),
    cardsRed: fnum(g.cards?.red),
    penaltyWon: fnum(g.penalty?.won),
    penaltyCommitted: fnum(g.penalty?.committed),
    penaltyScored: fnum(g.penalty?.scored),
    penaltyMissed: fnum(g.penalty?.missed),
    penaltySaved: fnum(g.penalty?.saved),
    subsIn: fnum(g.substitutes?.in),
    subsOut: fnum(g.substitutes?.out),
    subsBench: fnum(g.substitutes?.bench),
    updatedAt: Date.now(),
  };
}

// Tries the requested season first, then falls back to the previous season.
// Returns the season the API actually reported (`league.season`) so it can be
// used as the storage key — that way teams not in this season's competitions
// still surface their latest available stats instead of blank dialogs.
async function fetchTeamSeason(
  teamApiId: number,
  leagueId: number,
  season: number,
): Promise<{
  stats: StoredTeamSeasonStatistics | null;
  season: number;
  teamName: string | null;
  teamLogo: string | null;
  errors: Record<string, string>;
}> {
  const errors: Record<string, string> = {};
  const candidates = [season, season - 1].filter((s) => s >= 2000 && Number.isFinite(s));

  for (const candidate of candidates) {
    const raw = await apiGet<ApiTeamSeasonRaw>("/teams/statistics", {
      team: String(teamApiId),
      league: String(leagueId),
      season: String(candidate),
    });
    Object.assign(errors, raw?.errors);

    // `/teams/statistics` returns `response` as a single OBJECT (or an empty array
    // when there is no data) — never a per-result array like fixtures/players.
    const rawResponse = raw?.response as unknown;
    const entry = Array.isArray(rawResponse) ? rawResponse[0] : (rawResponse as ApiTeamSeasonRaw | undefined);
    if (entry?.team) {
      const actualSeason = entry.league?.season ?? candidate;
      return {
        stats: mapTeamSeason(entry),
        season: actualSeason,
        teamName: entry.team.name ?? null,
        teamLogo: entry.team.logo ?? null,
        errors,
      };
    }
    console.log(`fetchTeamSeason: no team stats for team ${teamApiId} league ${leagueId} season ${candidate}`);
  }

  return { stats: null, season, teamName: null, teamLogo: null, errors };
}

// One `/teams?league&season` call returns every team's country — used to derive
// team flag only when the stored team doc has no country yet.
async function fetchLeagueTeamCountries(leagueId: number, season: number): Promise<Map<number, string>> {
  const raw = await apiGet<{ team: { id?: number; country?: string | null } }>("/teams", {
    league: String(leagueId),
    season: String(season),
  });
  const map = new Map<number, string>();
  for (const row of raw?.response ?? []) {
    if (row.team?.id != null && row.team.country) map.set(row.team.id, row.team.country);
  }
  return map;
}

// Fetches every squad player's season statistics, following pagination (the
// `/players` endpoint caps a page at ~20 rows, so a full squad can span 2+
// pages) and falling back to the previous season when the requested one is
// empty (e.g. a cup that hasn't started yet).
async function fetchPlayersSeason(
  teamApiId: number,
  leagueId: number,
  season: number,
): Promise<{ entries: ApiPlayerSeasonEntryRaw[]; season: number; errors: Record<string, string> }> {
  const errors: Record<string, string> = {};
  const candidates = [season, season - 1].filter((s) => s >= 2000 && Number.isFinite(s));
  const MAX_PAGES = 20;

  for (const candidate of candidates) {
    const entries: ApiPlayerSeasonEntryRaw[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const raw = await apiGet<ApiPlayerSeasonEntryRaw>("/players", {
        team: String(teamApiId),
        league: String(leagueId),
        season: String(candidate),
        page: String(page),
      });
      Object.assign(errors, raw?.errors);
      if (!raw) break;

      entries.push(...(raw.response ?? []));
      totalPages = Math.min(raw.paging?.total ?? 1, MAX_PAGES);
      page++;
    } while (page <= totalPages);

    if (entries.length > 0) return { entries, season: candidate, errors };
    console.log(`fetchPlayersSeason: no players for team ${teamApiId} league ${leagueId} season ${candidate}`);
  }

  return { entries: [], season, errors };
}

// Derives the persisted leaderboards (top scorers, top assists, top rated) from
// the squad's season stats. Sorted high→low; only players with a positive value
// are included. Stored on the team doc so mobile reads them in one document.
function buildLeaderboards(entries: ApiPlayerSeasonEntryRaw[]): {
  topScorers: LeaderboardEntry[];
  topAssists: LeaderboardEntry[];
  topRated: LeaderboardEntry[];
} {
  const scorers: LeaderboardEntry[] = [];
  const assists: LeaderboardEntry[] = [];
  const rated: LeaderboardEntry[] = [];

  for (const row of entries) {
    const p = row.player;
    if (!p?.id) continue;
    const stats = mapPlayerSeason(row.statistics);
    const base = { playerId: p.id, name: p.name ?? "", photo: p.photo ?? "" };
    if ((stats.goals ?? 0) > 0) scorers.push({ ...base, value: stats.goals as number });
    if ((stats.assists ?? 0) > 0) assists.push({ ...base, value: stats.assists as number });
    if (stats.rating != null && stats.rating > 0) rated.push({ ...base, value: Math.round(stats.rating * 100) / 100 });
  }

  const byValue = (a: LeaderboardEntry, b: LeaderboardEntry) => b.value - a.value;
  return {
    topScorers: scorers.sort(byValue),
    topAssists: assists.sort(byValue),
    topRated: rated.sort(byValue),
  };
}

async function syncLeague(
  teamApiId: number,
  leagueId: number,
  season: number,
  ctx: { flagMap: CountriesMap; resolveCountry: (teamApiId: number) => Promise<string | null> },
): Promise<{ teamStats: StoredTeamSeasonStatistics | null; playerCount: number; season: number; errors: Record<string, string> }> {
  const team = await fetchTeamSeason(teamApiId, leagueId, season);

  // All squad players' season statistics for this competition, synced independently
  // of team-level stats so a single refresh covers the whole squad at once.
  const players = await fetchPlayersSeason(teamApiId, leagueId, team.stats ? team.season : season);
  Object.assign(team.errors, players.errors);

  const entries = players.entries;
  const leaderboards = buildLeaderboards(entries);
  const hasLeaderboards =
    leaderboards.topScorers.length > 0 ||
    leaderboards.topAssists.length > 0 ||
    leaderboards.topRated.length > 0;

  // Team doc season (leaderboards live alongside the team aggregates so mobile
  // reads them from a single document); player docs keep the season the API
  // actually reported for the squad.
  const resolvedSeason = team.stats ? team.season : players.season;
  const teamSeasonKey = String(resolvedSeason);
  const playerSeasonKey = String(players.season);

  // Upsert per-season stats + leaderboards without clobbering other seasons or
  // admin edits. Include name/logo only when missing, so a stats-only sync never
  // creates a nameless team doc (which would break the competition teams page)
  // and never overwrites an admin's Arabic translation.
  if (team.stats || hasLeaderboards) {
    const teamBase = teamRef(leagueId, teamApiId);
    const teamSnap = await teamBase.get();
    const existingTeam = (teamSnap.data() as { name?: string; logo?: string | null; statistics?: Record<string, unknown> } | undefined) ?? {};

    // Never create a brand-new nameless doc from leaderboards alone — only enrich
    // a team doc that already exists (or one being created from team stats now).
    if (team.stats || teamSnap.exists) {
      const existingSeason = ((existingTeam.statistics ?? {})[teamSeasonKey] as Record<string, unknown> | undefined) ?? {};
      const seasonStats: Record<string, unknown> = { ...existingSeason, ...(team.stats ?? {}) };
      if (hasLeaderboards) {
        seasonStats.topScorers = leaderboards.topScorers;
        seasonStats.topAssists = leaderboards.topAssists;
        seasonStats.topRated = leaderboards.topRated;
      }

      const teamPayload: Record<string, unknown> = {
        id: teamApiId,
        statistics: { ...(existingTeam.statistics ?? {}), [teamSeasonKey]: seasonStats },
        statisticsUpdatedAt: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!existingTeam.name && team.teamName) teamPayload.name = team.teamName;
      if (!existingTeam.logo && team.teamLogo) teamPayload.logo = team.teamLogo;
      // Team country flag: prefer the stored country (set when the admin fetched
      // the squad); fall back to a one-time per-league teams fetch.
      const storedCountry = (existingTeam as Record<string, unknown>).country as string | null | undefined;
      const teamCountry = storedCountry ?? (await ctx.resolveCountry(teamApiId));
      if (teamCountry) {
        teamPayload.country = teamCountry;
        const teamFlag = flagForName(ctx.flagMap, teamCountry);
        if (teamFlag) teamPayload.flag = teamFlag;
      }
      await teamBase.set(teamPayload, { merge: true });
    }
  }

  if (entries.length === 0) {
    return { teamStats: team.stats, playerCount: 0, season: resolvedSeason, errors: team.errors };
  }

  let playerCount = 0;
  const BATCH = 500;
  const db = getDb();

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = db.batch();
    for (const entryRow of entries.slice(i, i + BATCH)) {
      const p = entryRow.player;
      if (!p?.id) continue;
      const stats = mapPlayerSeason(entryRow.statistics);
      const pRef = playerRef(leagueId, teamApiId, p.id);
      const existing = (await pRef.get().catch(() => null))?.data() as { statistics?: Record<string, unknown> } | undefined;
      const nationality = p.nationality ?? null;
      const pPayload: Record<string, unknown> = {
        id: p.id,
        name: p.name ?? "",
        photo: p.photo ?? "",
        statistics: { ...((existing?.statistics as Record<string, unknown>) ?? {}), [playerSeasonKey]: stats },
        statisticsUpdatedAt: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (nationality) {
        pPayload.nationality = nationality;
        const pFlag = flagForName(ctx.flagMap, nationality);
        if (pFlag) pPayload.flag = pFlag;
      }
      batch.set(pRef, pPayload, { merge: true });
      playerCount++;
    }
    await batch.commit();
  }

  return { teamStats: team.stats, playerCount, season: resolvedSeason, errors: team.errors };
}

export async function syncTeamSeasonStatistics(
  teamApiId: number,
  season: number,
  leagueIds: readonly number[] = SEASON_STAT_LEAGUE_IDS,
): Promise<{ leagues: number[]; teamLeagues: number[]; playerLeagues: number[]; players: number; seasons: number[]; detail: string }> {
  if (!Number.isFinite(teamApiId) || teamApiId <= 0) {
    return { leagues: [], teamLeagues: [], playerLeagues: [], players: 0, seasons: [], detail: "Invalid team id" };
  }

  const syncedLeagues: number[] = [];
  const teamLeagues: number[] = [];
  const playerLeagues: number[] = [];
  const syncedSeasons = new Set<number>();
  let totalPlayers = 0;
  const apiErrors: string[] = [];

  const flagMap = await getCountryFlagMap();
  const teamCountries = new Map<number, Map<number, string>>();

  for (const leagueId of leagueIds) {
    try {
      // Lazily warm the league's team→country map only when the stored doc lacks
      // a country (avoids an extra `/teams` call on every ordinary sync).
      const result = await syncLeague(teamApiId, leagueId, season, {
        flagMap,
        resolveCountry: async (id) => {
          const cacheKey = leagueId;
          if (!teamCountries.has(cacheKey)) {
            teamCountries.set(cacheKey, await fetchLeagueTeamCountries(leagueId, season));
          }
          return teamCountries.get(cacheKey)?.get(id) ?? null;
        },
      });
      for (const msg of Object.values(result.errors)) {
        if (msg) apiErrors.push(msg);
      }
      totalPlayers += result.playerCount;
      if (result.teamStats) teamLeagues.push(leagueId);
      if (result.playerCount > 0) playerLeagues.push(leagueId);
      if (result.teamStats || result.playerCount > 0) {
        syncedLeagues.push(leagueId);
        syncedSeasons.add(result.season);
        console.log(`syncTeamSeasonStatistics: synced team ${teamApiId} league ${leagueId} season ${result.season} (team=${result.teamStats ? "yes" : "no"}, ${result.playerCount} players)`);
      }
    } catch (err) {
      console.error(`syncTeamSeasonStatistics: failed team ${teamApiId} league ${leagueId}`, err);
      apiErrors.push(String(err));
    }
  }

  const detail =
    syncedLeagues.length > 0
      ? ""
      : apiErrors.length > 0
        ? apiErrors.filter((m, i) => apiErrors.indexOf(m) === i).slice(0, 3).join(" · ")
        : `No team statistics returned for the season (${season})`;

  if (syncedLeagues.length === 0) {
    console.warn(`syncTeamSeasonStatistics: no data for team ${teamApiId} season ${season} in any league — ${detail}`);
  }

  return { leagues: syncedLeagues, teamLeagues, playerLeagues, players: totalPlayers, seasons: [...syncedSeasons], detail };
}

export const refreshTeamSeasonStatistics = onCall(
  {
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (request: CallableRequest) => {
    if (!(await callerIsAdmin(request))) {
      throw new HttpsError("permission-denied", "Admin privileges required.");
    }

    const teamApiId = request.data?.teamApiId as number | undefined;
    if (!teamApiId || !Number.isFinite(teamApiId)) {
      throw new HttpsError("invalid-argument", "teamApiId (number) is required.");
    }

    const season = request.data?.season as number | undefined ?? new Date().getFullYear();
    const result = await syncTeamSeasonStatistics(teamApiId, season);
    return { ok: result.leagues.length > 0, ...result, season };
  },
);

// ---------------------------------------------------------------------------
// Barcelona / Real Madrid matches: when a match transitions to `final`,
// sync current-season statistics for both teams (and their opponent).
// ---------------------------------------------------------------------------

function apiIdOfTeam(id: unknown): number | null {
  if (id === "barca") return 529;
  if (id === "madrid") return 541;
  if (typeof id === "number" && Number.isFinite(id) && id > 0) return id;
  if (typeof id === "string" && /^\d+$/.test(id)) return Number.parseInt(id, 10);
  if (typeof id === "string" && id.startsWith("api_")) {
    const numPart = Number.parseInt(id.slice(4), 10);
    if (Number.isFinite(numPart) && numPart > 0) return numPart;
  }
  return null;
}

interface MatchTeamData {
  id?: unknown;
}

export const onMatchFinalized = onDocumentWritten(
  { document: "matches/{matchId}", timeoutSeconds: 300 },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after?.exists) return;

    const nextStatus = after.get("status");
    if (nextStatus !== "final") return;

    const prevStatus = before?.exists ? before.get("status") : undefined;
    if (prevStatus === "final") return;

    const matchData = after.data() as { home?: MatchTeamData; away?: MatchTeamData } | undefined;
    const season = new Date().getFullYear();
    const teamIds = [apiIdOfTeam(matchData?.home?.id), apiIdOfTeam(matchData?.away?.id)]
      .filter((id): id is number => id != null);

    // Scope the sync to the match's exact competition when known; older matches
    // without `leagueId` fall back to all tracked competitions.
    const leagueIdRaw = after.get("leagueId");
    const leagueId = typeof leagueIdRaw === "number" && Number.isFinite(leagueIdRaw) ? leagueIdRaw : null;
    const leagueIds = leagueId != null ? [leagueId] : undefined;

    for (const teamId of teamIds) {
      try {
        await syncTeamSeasonStatistics(teamId, season, leagueIds);
      } catch (err) {
        console.error(`onMatchFinalized: season stats sync failed for team ${teamId}`, err);
      }
    }
  },
);