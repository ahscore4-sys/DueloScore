import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { callerIsAdmin } from "./adminGuards";
import { SEASON_STAT_LEAGUE_IDS } from "./seasonStatistics";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const COUNTRIES_DOC = "settings/countries";
const COUNTRIES_TTL_MS = 24 * 3600 * 1000;

interface ApiCountry {
  name: string;
  code: string;
  flag: string;
}

interface ApiCountriesResponse {
  response?: ApiCountry[];
}

export interface CountriesMap {
  [name: string]: { code: string; flag: string };
}

function getDb() {
  return getFirestore();
}

// Nationalities / countries whose name doesn't exactly match the `/countries`
// list (sub-national flags, dash/hyphen variations, old country names).
const COUNTRY_NAME_MAP: Record<string, string> = {
  England: "England",
  "Korea Republic": "Korea Republic",
  "South Korea": "Korea Republic",
  "Cote d'Ivoire": "Cote d'Ivoire",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Ivory Coast": "Cote d'Ivoire",
  "DR Congo": "DR Congo",
  "Congo DR": "DR Congo",
  "Congo-Kinshasa": "DR Congo",
  "Czech Republic": "Czechia",
  Curacao: "Curaçao",
  "Curaçao": "Curaçao",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "East Timor": "Timor-Leste",
  "Swaziland": "Eswatini",
  Macedonia: "North Macedonia",
  Burma: "Myanmar",
  "United Republic of Tanzania": "Tanzania",
  "United States": "USA",
  "U.S.A.": "USA",
  "St. Kitts and Nevis": "Saint Kitts and Nevis",
  "St. Vincent and the Grenadines": "Saint Vincent and the Grenadines",
  "Sao Tome & Principe": "Sao Tome and Principe",
  "Cape Verde": "Cape Verde",
  "Antigua and Barbuda": "Antigua-and-Barbuda",
  "Antigua & Barbuda": "Antigua-and-Barbuda",
  "Trinidad & Tobago": "Trinidad and Tobago",
};

// Flags that intentionally don't equal the /countries country flags (FIFA blocks
// England/Scotland/Wales/N. Ireland as separate flags; api-sports serves these).
const SPECIAL_FLAGS: Record<string, string> = {
  England: "https://media.api-sports.io/flags/gb-eng.svg",
  Scotland: "https://media.api-sports.io/flags/gb-sct.svg",
  Wales: "https://media.api-sports.io/flags/gb-wls.svg",
  "Northern Ireland": "https://media.api-sports.io/flags/gb-nir.svg",
};

async function fetchCountries(): Promise<ApiCountry[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.error("API_FOOTBALL_KEY not set in environment");
    return [];
  }
  const url = new URL("/countries", API_FOOTBALL_BASE);
  try {
    const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.error(`fetchCountries: HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as ApiCountriesResponse;
    return Array.isArray(data.response) ? data.response : [];
  } catch (err) {
    console.error("fetchCountries: error", err);
    return [];
  }
}

function toMap(countries: ApiCountry[]): CountriesMap {
  const map: CountriesMap = {};
  for (const c of countries) {
    if (!c?.name || !c?.flag) continue;
    map[c.name] = { code: c.code ?? "", flag: c.flag };
  }
  return map;
}

// Names as returned by /countries use canonical spellings (e.g. "Curaçao",
// "Cote d'Ivoire") — resolve API-Football variants against them.
function normalizedKey(name: string): string {
  const n = COUNTRY_NAME_MAP[name] ?? name;
  return n
    .trim()
    .toLowerCase()
    .replace(/[\'\u2019]/g, "")
    .replace(/\s+/g, " ");
}

function resolveFromMap(map: CountriesMap, name: string | null | undefined): string | null {
  if (!name) return null;
  if (SPECIAL_FLAGS[name]) return SPECIAL_FLAGS[name];
  const canonical = COUNTRY_NAME_MAP[name] ?? name;
  const direct = map[canonical];
  if (direct?.flag) return direct.flag;
  const target = normalizedKey(name);
  const hit = Object.values(map).find((_, idx) => normalizedKey(Object.keys(map)[idx]) === target);
  return hit?.flag ?? null;
}

let cachedMap: CountriesMap | null = null;
let cachedAt = 0;

export async function getCountryFlagMap(force?: boolean): Promise<CountriesMap> {
  const now = Date.now();
  if (!force && cachedMap && now - cachedAt < COUNTRIES_TTL_MS) return cachedMap;

  const snap = await getDb().doc(COUNTRIES_DOC).get();
  const list = (snap.exists ? snap.get("list") : null) as CountriesMap | null | undefined;
  const fetchedAt = (snap.exists ? snap.get("fetchedAt") : null) as number | null | undefined;
  if (list && Object.keys(list).length > 0 && (!fetchedAt || now - fetchedAt < COUNTRIES_TTL_MS)) {
    cachedMap = list;
    cachedAt = now;
    return list;
  }

  const fresh = toMap(await fetchCountries());
  if (Object.keys(fresh).length > 0) {
    cachedMap = fresh;
    cachedAt = now;
    await getDb().doc(COUNTRIES_DOC).set(
      { list: fresh, fetchedAt: Date.now(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  return fresh;
}

export async function resolveFlagFromCountries(name: string | null | undefined): Promise<string | null> {
  return resolveFromMap(await getCountryFlagMap(), name ?? null);
}

// Convenience sync resolver once the map is already loaded.
export function flagForName(map: CountriesMap, name: string | null | undefined): string | null {
  return resolveFromMap(map, name ?? null);
}

export const countriesRefresh = onSchedule(
  {
    schedule: "0 1 * * *",
    timeZone: "Asia/Kuwait",
    timeoutSeconds: 60,
  },
  async () => {
    await getCountryFlagMap(true);
    console.log("countriesRefresh: country flag lookup refreshed");
  },
);

export const refreshCountriesLookup = onCall({ timeoutSeconds: 120 }, async (request) => {
  if (!(await callerIsAdmin(request))) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
  const map = await getCountryFlagMap(true);
  return { ok: Object.keys(map).length > 0, countries: Object.keys(map).length };
});

// One-time backfill: resolves `flag` on every stored competition team/player doc
// from its stored `country` / `nationality` (no extra player API calls; teams
// without a stored country are filled once per league via `/teams?league&season`).
export const backfillCountryFlags = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    if (!(await callerIsAdmin(request))) {
      throw new HttpsError("permission-denied", "Admin privileges required.");
    }

    const map = await getCountryFlagMap();
    const db = getDb();
    let teams = 0;
    let players = 0;
    const leagueCountryCache = new Map<number, Map<number, string>>();

    async function leagueCountries(leagueId: number, season: number): Promise<Map<number, string>> {
      const cached = leagueCountryCache.get(leagueId);
      if (cached) return cached;
      const found = new Map<number, string>();
      const key = process.env.API_FOOTBALL_KEY;
      if (key) {
        const url = new URL("/teams", API_FOOTBALL_BASE);
        url.searchParams.set("league", String(leagueId));
        url.searchParams.set("season", String(season));
        try {
          const res = await fetch(url.toString(), { headers: { "x-apisports-key": key } });
          if (res.ok) {
            const json = (await res.json()) as { response?: { team?: { id?: number; country?: string | null } }[] };
            for (const row of json.response ?? []) {
              if (row.team?.id != null && row.team.country) found.set(row.team.id, row.team.country);
            }
          }
        } catch (err) {
          console.error(`backfillCountryFlags: teams fetch failed league ${leagueId}`, err);
        }
      }
      leagueCountryCache.set(leagueId, found);
      return found;
    }

    const season = new Date().getFullYear();

    for (const leagueId of SEASON_STAT_LEAGUE_IDS) {
      const teamSnap = await db.collection(`competitions/${leagueId}/teams`).get();
      for (const doc of teamSnap.docs) {
        const teamApiId = Number(doc.id);
        let country = doc.get("country") as string | null | undefined;
        let flag = doc.get("flag") as string | null | undefined;
        if (!country) {
          const lc = await leagueCountries(leagueId, season);
          country = lc.get(teamApiId) ?? null;
        }
        const resolved = flagForName(map, country);
        if (resolved && resolved !== flag) {
          await doc.ref.update({ flag: resolved, country: country ?? doc.get("country") ?? null });
          teams++;
        }

        const playerSnap = await doc.ref.collection("players").get();
        let touched = 0;
        const batch = db.batch();
        for (const p of playerSnap.docs) {
          const nationality = p.get("nationality") as string | null | undefined;
          if (!nationality) continue;
          const pFlag = flagForName(map, nationality);
          if (pFlag && pFlag !== p.get("flag")) {
            batch.update(p.ref, { flag: pFlag, nationality });
            touched++;
          }
        }
        if (touched > 0) {
          await batch.commit();
          players += touched;
        }
      }
    }

    return { ok: true, teams, players };
  },
);