import { useCallback, useEffect, useRef, useState } from 'react'
import type { UpcomingFixture } from '../domain/match.types'
import { fetchAllUpcoming } from '../data/apiFootball.service'
import { saveMatch } from '../data/match.service'
import { TEAM_API_MAP, API_LEAGUE_TO_COMPETITION } from '../domain/match.constants'

export function useUpcomingFixtures(existingFixtureIds?: Set<number>) {
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set())
  const [importError, setImportError] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!loadedRef.current) setLoading(true)
    setError(null)
    setImportError(null)
    try {
      const data = await fetchAllUpcoming()
      if (existingFixtureIds) {
        data.forEach((f) => { f.alreadyImported = existingFixtureIds.has(f.fixtureId) })
      }
      setFixtures(data)
      loadedRef.current = true
    } catch {
      setError('فشل جلب المباريات')
    } finally {
      setLoading(false)
    }
  }, [existingFixtureIds])

  useEffect(() => { refresh() }, [refresh])

  const importMatch = useCallback(async (fixture: UpcomingFixture) => {
    const homeInternalId = TEAM_API_MAP[fixture.home.id]
    const awayInternalId = TEAM_API_MAP[fixture.away.id]
    const utc = new Date(fixture.timestamp * 1000)
    const date = utc.toISOString().slice(0, 10)
    const kickoff = utc.toISOString().slice(11, 16)

    setImportingIds((prev) => new Set(prev).add(fixture.fixtureId))
    setImportError(null)

    try {
      await saveMatch({
        home: {
          id: homeInternalId || `api_${fixture.home.id}`,
          name: fixture.home.name,
          short: fixture.home.name.slice(0, 3).toUpperCase(),
          color: homeInternalId ? (homeInternalId === 'barca' ? '#0057A8' : '#E7E9EE') : '#666',
          logo: fixture.home.logo,
        },
        away: {
          id: awayInternalId || `api_${fixture.away.id}`,
          name: fixture.away.name,
          short: fixture.away.name.slice(0, 3).toUpperCase(),
          color: awayInternalId ? (awayInternalId === 'barca' ? '#0057A8' : '#E7E9EE') : '#666',
          logo: fixture.away.logo,
        },
        competition: API_LEAGUE_TO_COMPETITION[fixture.league.name] ?? fixture.league.name,
        round: fixture.round?.replace(/\D/g, '') || '',
        season: String(new Date().getFullYear()),
        date,
        kickoff,
        stadium: fixture.venue || '',
        channels: [],
        commentators: [],
        status: 'not_started',
        score: { home: 0, away: 0 },
        fixtureId: fixture.fixtureId,
        leagueId: fixture.league.id,
        controlPhase: 'not_started',
        clockBaseSeconds: 0,
        clockStartedAt: null,
        clockRunning: false,
        addedTime: {},
        penalties: { home: 0, away: 0 },
        penaltyKicks: [],
      })

      fixture.alreadyImported = true
      setFixtures((prev) => prev.map((f) => f.fixtureId === fixture.fixtureId ? { ...f, alreadyImported: true } : f))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ المباراة في Firestore'
      setImportError(`"${fixture.home.name} vs ${fixture.away.name}": ${msg}`)
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev)
        next.delete(fixture.fixtureId)
        return next
      })
    }
  }, [])

  const importAll = useCallback(async () => {
    const toImport = fixtures.filter((f) => !f.alreadyImported && !importingIds.has(f.fixtureId))
    const results = await Promise.allSettled(toImport.map((f) => importMatch(f)))
    const errors = results
      .map((r, i) => (r.status === 'rejected' ? toImport[i] : null))
      .filter((f): f is NonNullable<typeof f> => f !== null)
    if (errors.length > 0) {
      setImportError(`فشل إضافة ${errors.length} مباراة من أصل ${toImport.length}`)
    }
  }, [fixtures, importMatch, importingIds])

  return { fixtures, loading, error, importError, importingIds, refresh, importMatch, importAll }
}
