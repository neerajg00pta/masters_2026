import { supabase } from './supabase'
import type { Config, User, Team, Golfer, Selection, ScoreSnapshot } from './types'

interface AllData {
  config: Config
  users: User[]
  teams: Team[]
  golfers: Golfer[]
  selections: Selection[]
  snapshots: ScoreSnapshot[]
}

/** Fetch all 6 data tables in parallel */
export async function fetchAllData(): Promise<AllData> {
  const [configRes, usersRes, teamsRes, golfersRes, selectionsRes, snapshotsRes] = await Promise.all([
    supabase.from('config').select('*').single(),
    supabase.from('users').select('*').order('created_at', { ascending: true }),
    supabase.from('teams').select('*').order('created_at', { ascending: true }),
    supabase.from('golfers').select('*').order('sort_order', { ascending: true }),
    supabase.from('selections').select('*'),
    supabase.from('score_snapshots').select('*').order('snapshot_date', { ascending: false }),
  ])

  if (configRes.error) throw new Error(`Config: ${configRes.error.message}`)
  if (usersRes.error) throw new Error(`Users: ${usersRes.error.message}`)
  if (teamsRes.error) throw new Error(`Teams: ${teamsRes.error.message}`)
  if (golfersRes.error) throw new Error(`Golfers: ${golfersRes.error.message}`)
  if (selectionsRes.error) throw new Error(`Selections: ${selectionsRes.error.message}`)
  if (snapshotsRes.error) throw new Error(`Snapshots: ${snapshotsRes.error.message}`)

  const raw = configRes.data
  const config: Config = {
    poolLocked: raw.pool_locked ?? false,
    randomsAssigned: raw.randoms_assigned ?? false,
    liveScoring: raw.live_scoring ?? false,
  }

  const users: User[] = (usersRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    fullName: (r.full_name as string) ?? null,
    email: r.email as string,
    admin: (r.admin as boolean) ?? false,
    paid: (r.paid as boolean) ?? false,
    createdAt: r.created_at as string,
  }))

  const teams: Team[] = (teamsRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    teamName: r.team_name as string,
    createdAt: r.created_at as string,
  }))

  const golfers: Golfer[] = (golfersRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    espnName: (r.espn_name as string) ?? null,
    odds: (r.odds as string) ?? null,
    oddsNumeric: (r.odds_numeric as number) ?? 999,
    worldRank: (r.world_rank as number) ?? null,
    scoreToPar: (r.score_to_par as number) ?? 0,
    today: (r.today as number) ?? 0,
    thru: (r.thru as string) ?? '',
    status: (r.status as Golfer['status']) ?? 'active',
    sortOrder: (r.sort_order as number) ?? 999,
    scoreLocked: (r.score_locked as boolean) ?? false,
  }))

  const selections: Selection[] = (selectionsRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    teamId: r.team_id as string,
    golferId: r.golfer_id as string,
    isRandom: (r.is_random as boolean) ?? false,
    pickedAt: r.picked_at as string,
  }))

  const snapshots: ScoreSnapshot[] = (snapshotsRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    snapshotDate: r.snapshot_date as string,
    teamId: r.team_id as string,
    aggregateScore: (r.aggregate_score as number) ?? 0,
    rank: (r.rank as number) ?? 0,
  }))

  return { config, users, teams, golfers, selections, snapshots }
}

/** Create a new user and return the created record */
export async function createUser(input: { name: string; email: string; fullName: string }): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ name: input.name, email: input.email, full_name: input.fullName })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name ?? null,
    email: data.email,
    admin: data.admin ?? false,
    paid: data.paid ?? false,
    createdAt: data.created_at,
  }
}

/** Batch update golfer scores from live scoring */
export async function updateGolferScores(
  updates: Array<{ id: string; scoreToPar: number; today: number; thru: string; status: Golfer['status'] }>
): Promise<void> {
  for (const u of updates) {
    const { error } = await supabase
      .from('golfers')
      .update({
        score_to_par: u.scoreToPar,
        today: u.today,
        thru: u.thru,
        status: u.status,
      })
      .eq('id', u.id)

    if (error) {
      console.error(`Failed to update golfer ${u.id}:`, error.message)
    }
  }
}
