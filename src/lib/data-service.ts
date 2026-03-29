import { supabase } from './supabase'
import type { Config, User, Team, Golfer, Selection, ScoreSnapshot } from './types'
import type { MastersFieldEntry } from './masters-field'

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
    flagUrl: (r.flag_url as string) ?? null,
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
  const id = `u${Date.now()}`
  const { data, error } = await supabase
    .from('users')
    .insert({ id, name: input.name, email: input.email, full_name: input.fullName })
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

// === Team mutations ===

/** Create a new team for a user */
export async function createTeam(userId: string, teamName: string): Promise<Team> {
  const id = `t${Date.now()}`
  const { data, error } = await supabase
    .from('teams')
    .insert({ id, user_id: userId, team_name: teamName })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    userId: data.user_id,
    teamName: data.team_name,
    createdAt: data.created_at,
  }
}

/** Delete a team by ID */
export async function deleteTeam(teamId: string): Promise<void> {
  // First delete all selections for this team
  const { error: selError } = await supabase
    .from('selections')
    .delete()
    .eq('team_id', teamId)

  if (selError) throw new Error(selError.message)

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) throw new Error(error.message)
}

/** Rename a team */
export async function updateTeamName(teamId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({ team_name: name })
    .eq('id', teamId)

  if (error) throw new Error(error.message)
}

// === Selection mutations ===

/** Add a golfer to a team */
export async function addSelection(teamId: string, golferId: string, isRandom: boolean): Promise<Selection> {
  const id = `s${Date.now()}`
  const { data, error } = await supabase
    .from('selections')
    .insert({ id, team_id: teamId, golfer_id: golferId, is_random: isRandom })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    teamId: data.team_id,
    golferId: data.golfer_id,
    isRandom: data.is_random ?? false,
    pickedAt: data.picked_at,
  }
}

/** Remove a golfer from a team */
export async function removeSelection(teamId: string, golferId: string): Promise<void> {
  const { error } = await supabase
    .from('selections')
    .delete()
    .eq('team_id', teamId)
    .eq('golfer_id', golferId)

  if (error) throw new Error(error.message)
}

// === Config mutations ===

/** Update config fields (single-row table) */
export async function updateConfig(updates: Partial<Config>): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.poolLocked !== undefined) payload.pool_locked = updates.poolLocked
  if (updates.randomsAssigned !== undefined) payload.randoms_assigned = updates.randomsAssigned
  if (updates.liveScoring !== undefined) payload.live_scoring = updates.liveScoring

  const { error } = await supabase
    .from('config')
    .update(payload)
    .eq('id', 1)

  if (error) throw new Error(error.message)
}

// === User mutations ===

/** Update a user */
export async function updateUser(
  userId: string,
  updates: Partial<{ name: string; fullName: string; email: string; admin: boolean; paid: boolean }>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.fullName !== undefined) payload.full_name = updates.fullName
  if (updates.email !== undefined) payload.email = updates.email
  if (updates.admin !== undefined) payload.admin = updates.admin
  if (updates.paid !== undefined) payload.paid = updates.paid

  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

/** Delete a user and cascade delete their teams + selections */
export async function deleteUser(userId: string): Promise<void> {
  // Find all teams for this user
  const { data: userTeams, error: teamsErr } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', userId)

  if (teamsErr) throw new Error(teamsErr.message)

  // Delete selections for each team
  for (const t of userTeams ?? []) {
    const { error: selErr } = await supabase
      .from('selections')
      .delete()
      .eq('team_id', t.id)
    if (selErr) console.error(`Failed to delete selections for team ${t.id}:`, selErr.message)
  }

  // Delete teams
  const { error: delTeamsErr } = await supabase
    .from('teams')
    .delete()
    .eq('user_id', userId)
  if (delTeamsErr) throw new Error(delTeamsErr.message)

  // Delete snapshots for those teams
  for (const t of userTeams ?? []) {
    await supabase.from('score_snapshots').delete().eq('team_id', t.id)
  }

  // Delete the user
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

// === Golfer mutations ===

/** Upsert golfers from the masters field data */
export async function upsertGolfers(field: MastersFieldEntry[]): Promise<number> {
  const rows = field.map((entry, idx) => ({
    id: `g${idx + 1}`,
    name: entry.name,
    odds: entry.odds,
    odds_numeric: entry.oddsNumeric,
    world_rank: entry.worldRank,
    sort_order: idx + 1,
  }))

  const { error, count } = await supabase
    .from('golfers')
    .upsert(rows, { onConflict: 'id', count: 'exact' })

  if (error) throw new Error(error.message)
  return count ?? rows.length
}

/** Auto-seed golfers if table is empty */
export async function seedGolfersIfEmpty(field: MastersFieldEntry[]): Promise<boolean> {
  const { count } = await supabase.from('golfers').select('id', { count: 'exact', head: true })
  if (count && count > 0) return false
  await upsertGolfers(field)
  return true
}

/** Update a single golfer field */
export async function updateGolfer(
  golferId: string,
  updates: Partial<{
    name: string
    espnName: string | null
    scoreToPar: number
    today: number
    thru: string
    status: Golfer['status']
    scoreLocked: boolean
    flagUrl: string | null
  }>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.espnName !== undefined) payload.espn_name = updates.espnName
  if (updates.scoreToPar !== undefined) payload.score_to_par = updates.scoreToPar
  if (updates.today !== undefined) payload.today = updates.today
  if (updates.thru !== undefined) payload.thru = updates.thru
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.scoreLocked !== undefined) payload.score_locked = updates.scoreLocked
  if (updates.flagUrl !== undefined) payload.flag_url = updates.flagUrl

  const { error } = await supabase
    .from('golfers')
    .update(payload)
    .eq('id', golferId)

  if (error) throw new Error(error.message)
}

/** Bulk add selections (for random assignments) */
export async function bulkAddSelections(
  assignments: Array<{ teamId: string; golferId: string }>
): Promise<void> {
  const rows = assignments.map((a, i) => ({
    id: `sr${Date.now()}${i}`,
    team_id: a.teamId,
    golfer_id: a.golferId,
    is_random: true,
  }))

  const { error } = await supabase
    .from('selections')
    .insert(rows)

  if (error) throw new Error(error.message)
}

/** Save daily score snapshots */
export async function saveSnapshots(
  entries: Array<{ teamId: string; aggregateScore: number; rank: number }>
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  // Delete existing snapshots for today (idempotent)
  await supabase
    .from('score_snapshots')
    .delete()
    .eq('snapshot_date', today)

  const rows = entries.map(e => ({
    snapshot_date: today,
    team_id: e.teamId,
    aggregate_score: e.aggregateScore,
    rank: e.rank,
  }))

  const { error } = await supabase
    .from('score_snapshots')
    .insert(rows)

  if (error) throw new Error(error.message)
}

// === Score mutations ===

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
