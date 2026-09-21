import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const LEAGUE_IDS = [140, 2] as const;
const DEFAULT_SEASON = new Date().getFullYear();

// Lazy db accessor: initializing the app happens in index.ts AFTER this module
// is loaded, so we must not call getFirestore() at module scope (it would throw).
function getDb() {
  return getFirestore();
}

interface ApiStandingsTeamRaw {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

interface ApiLeagueRaw {
  id: number;
  name: string;
  logo: string;
  season: number;
  standings: ApiStandingsTeamRaw[][];
}

interface ApiStandingsResponseRaw {
  response: Array<{ league: ApiLeagueRaw }>;
}

interface CachedStandingsTeam {
  id: string;
  name: string;
  logo: string;
  short: string;
  rank: number;
  points: number;
  goalsDiff: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string | null;
}

async function fetchLeagueStandings(leagueId: number, season: number): Promise<{
  leagueId: number;
  name: string;
  logo: string;
  season: number;
  groups: Record<string, CachedStandingsTeam[]>;
} | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.error("API_FOOTBALL_KEY not set in environment");
    return null;
  }

  const url = new URL("/standings", API_FOOTBALL_BASE);
  url.searchParams.set("league", String(leagueId));
  url.searchParams.set("season", String(season));

  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchLeagueStandings: HTTP ${res.status} for league ${leagueId}`);
      return null;
    }
    const data = (await res.json()) as ApiStandingsResponseRaw;
    const entry = data.response?.[0];
    if (!entry) return null;

    const league = entry.league;
    const groups: Record<string, CachedStandingsTeam[]> = {};

    for (let i = 0; i < league.standings.length; i++) {
      const groupRows = league.standings[i];
      if (!groupRows || groupRows.length === 0) continue;

      const firstRow = groupRows[0];
      const groupName =
        firstRow.group || (league.standings.length === 1 ? league.name : `Group ${String.fromCharCode(65 + i)}`);

      groups[groupName] = groupRows.map((r) => ({
        id: String(r.team.id),
        name: r.team.name,
        logo: r.team.logo,
        short: (r.team.name || "").slice(0, 3).toUpperCase(),
        rank: r.rank,
        points: r.points,
        goalsDiff: r.goalsDiff,
        played: r.all.played,
        won: r.all.win,
        drawn: r.all.draw,
        lost: r.all.lose,
        goalsFor: r.all.goals.for,
        goalsAgainst: r.all.goals.against,
        form: r.form,
      }));
    }

    if (Object.keys(groups).length === 0) return null;

    return {
      leagueId,
      name: league.name,
      logo: league.logo,
      season: league.season,
      groups,
    };
  } catch (err) {
    console.error(`fetchLeagueStandings: error for league ${leagueId}`, err);
    return null;
  }
}

async function refreshAllStandings(): Promise<void> {
  const season = DEFAULT_SEASON;

  for (const leagueId of LEAGUE_IDS) {
    try {
      const table = await fetchLeagueStandings(leagueId, season);
      if (!table) {
        console.log(`refreshStandings: no data for league ${leagueId}`);
        continue;
      }

      await getDb().doc(`standings/${leagueId}`).set(
        {
          leagueId: table.leagueId,
          name: table.name,
          logo: table.logo,
          season: table.season,
          updatedAt: FieldValue.serverTimestamp(),
          groups: table.groups,
        },
        { merge: true },
      );

      console.log(`refreshStandings: updated league ${leagueId} with ${Object.keys(table.groups).length} groups`);
    } catch (err) {
      console.error(`refreshStandings: failed for league ${leagueId}`, err);
    }
  }
}

export const refreshStandings = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Asia/Kuwait",
  },
  async () => {
    console.log("refreshStandings: started scheduled run");
    await refreshAllStandings();
    console.log("refreshStandings: completed scheduled run");
  },
);

async function callerIsAdmin(request: CallableRequest): Promise<boolean> {
  const tokenRole = request.auth?.token?.role;
  if (tokenRole === "admin" || tokenRole === "super_admin") return true;

  const callerUid = request.auth?.uid;
  if (!callerUid) return false;

  const snap = await getDb().doc(`admins/${callerUid}`).get();
  if (!snap.exists) return false;
  const role = snap.get("role");
  if (role === "super_admin" || snap.get("super_admin") === true) return true;
  return role === "admin";
}

export const triggerStandingsRefresh = onCall(async (request: CallableRequest) => {
  if (!(await callerIsAdmin(request))) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  console.log("triggerStandingsRefresh: manual refresh triggered by admin");
  await refreshAllStandings();
  return { ok: true };
});
