import { supabase } from './supabase'
import type { Config, User, Team, Golfer, Selection, ScoreSnapshot } from './types'
import type { MastersFieldEntry } from './masters-field'

// === Snake-to-camel mapping helpers ===

function mapConfig(row: any): Config {
  return {
    poolLocked: row.pool_locked,
    randomsAssigned: row.randoms_assigned,
    liveScoring: row.live_scoring ?? false,
  }
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name ?? null,
    email: row.email,
    admin: row.admin,
    paid: row.paid,
    createdAt: row.created_at,
  }
}

function mapTeam(row: any): Team {
  return {
    id: row.id,
    userId: row.user_id,
    teamName: row.team_name,
    createdAt: row.created_at,
  }
}

function mapGolfer(row: any): Golfer {
  return {
    id: row.id,
    name: row.name,
    espnName: row.espn_name ?? null,
    odds: row.odds ?? null,
    oddsNumeric: row.odds_numeric ?? 9999,
    worldRank: row.world_rank ?? null,
    scoreToPar: row.score_to_par ?? 0,
    today: row.today ?? 0,
    thru: row.thru ?? '',
    status: row.status ?? 'active',
    sortOrder: row.sort_order ?? 9999,
    scoreLocked: row.score_locked ?? false,
  }
}

function mapSelection(row: any): Selection {
  return {
    id: row.id,
    teamId: row.team_id,
    golferId: row.golfer_id,
    isRandom: row.is_random,
    pickedAt: row.picked_at,
  }
}

function mapSnapshot(row: any): ScoreSnapshot {
  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    teamId: row.team_id,
    aggregateScore: row.aggregate_score,
    rank: row.rank,
  }
}

// === Reads ===

export async function getConfig(): Promise<Config> {
  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw error
  return mapConfig(data)
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at')
  if (error) throw error
  return (data ?? []).map(mapUser)
}

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at')
  if (error) throw error
  return (data ?? []).map(mapTeam)
}

export async function getGolfers(): Promise<Golfer[]> {
  const { data, error } = await supabase
    .from('golfers')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map(mapGolfer)
}

export async function getSelections(): Promise<Selection[]> {
  const { data, error } = await supabase
    .from('selections')
    .select('*')
  if (error) throw error
  return (data ?? []).map(mapSelection)
}

export async function getSnapshots(date?: string): Promise<ScoreSnapshot[]> {
  const targetDate = date ?? yesterdayDateString()
  const { data, error } = await supabase
    .from('score_snapshots')
    .select('*')
    .eq('snapshot_date', targetDate)
  if (error) throw error
  return (data ?? []).map(mapSnapshot)
}

export async function fetchAllData() {
  const [config, users, teams, golfers, selections, snapshots] = await Promise.all([
    getConfig(),
    getUsers(),
    getTeams(),
    getGolfers(),
    getSelections(),
    getSnapshots(),
  ])
  return { config, users, teams, golfers, selections, snapshots }
}

// === Config writes ===

export async function updateConfig(updater: (c: Config) => Config): Promise<Config> {
  const { data: row, error: readErr } = await supabase
    .from('config')
    .select('*')
    .eq('id', 1)
    .single()
  if (readErr) throw readErr

  const current = mapConfig(row)
  const updated = updater(current)

  const { error } = await supabase
    .from('config')
    .update({
      pool_locked: updated.poolLocked,
      randoms_assigned: updated.randomsAssigned,
      live_scoring: updated.liveScoring,
    })
    .eq('id', 1)
  if (error) throw error
  return updated
}

// === User writes ===

export async function createUser(data: {
  name: string
  email: string
  fullName?: string
}): Promise<User> {
  const newUser = {
    id: `u${Date.now()}`,
    name: data.name,
    email: data.email,
    full_name: data.fullName ?? null,
    admin: false,
    paid: false,
    created_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('users').insert(newUser)
  if (error) throw error
  return mapUser(newUser)
}

export async function deleteUser(id: string): Promise<void> {
  // Cascade: delete selections for all user's teams, then teams, then user
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', id)
  const teamIds = (teams ?? []).map((t: any) => t.id)

  if (teamIds.length > 0) {
    const { error: selErr } = await supabase
      .from('selections')
      .delete()
      .in('team_id', teamIds)
    if (selErr) throw selErr

    const { error: teamErr } = await supabase
      .from('teams')
      .delete()
      .eq('user_id', id)
    if (teamErr) throw teamErr
  }

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'fullName' | 'email' | 'admin' | 'paid'>>
): Promise<void> {
  const row: Record<string, any> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.fullName !== undefined) row.full_name = updates.fullName
  if (updates.email !== undefined) row.email = updates.email
  if (updates.admin !== undefined) row.admin = updates.admin
  if (updates.paid !== undefined) row.paid = updates.paid

  const { error } = await supabase.from('users').update(row).eq('id', id)
  if (error) throw error
}

// === Team writes ===

export async function createTeam(userId: string, teamName: string): Promise<Team> {
  const newTeam = {
    id: `t${Date.now()}`,
    user_id: userId,
    team_name: teamName,
    created_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('teams').insert(newTeam)
  if (error) throw error
  return mapTeam(newTeam)
}

export async function deleteTeam(teamId: string): Promise<void> {
  // Cascade: delete selections first
  const { error: selErr } = await supabase
    .from('selections')
    .delete()
    .eq('team_id', teamId)
  if (selErr) throw selErr

  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) throw error
}

export async function updateTeamName(teamId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({ team_name: name })
    .eq('id', teamId)
  if (error) throw error
}

// === Golfer writes ===

export async function upsertGolfers(entries: MastersFieldEntry[]): Promise<void> {
  const rows = entries.map((e, i) => ({
    id: `g${i + 1}`,
    name: e.name,
    espn_name: null,
    odds: e.odds,
    odds_numeric: e.oddsNumeric,
    world_rank: e.worldRank,
    score_to_par: 0,
    today: 0,
    thru: '',
    status: 'active',
    sort_order: i + 1,
    score_locked: false,
  }))

  const { error } = await supabase
    .from('golfers')
    .upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function updateGolfer(
  id: string,
  updates: Partial<Pick<Golfer, 'name' | 'espnName' | 'odds' | 'oddsNumeric' | 'worldRank' | 'scoreToPar' | 'today' | 'thru' | 'status' | 'scoreLocked' | 'sortOrder'>>
): Promise<void> {
  const row: Record<string, any> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.espnName !== undefined) row.espn_name = updates.espnName
  if (updates.odds !== undefined) row.odds = updates.odds
  if (updates.oddsNumeric !== undefined) row.odds_numeric = updates.oddsNumeric
  if (updates.worldRank !== undefined) row.world_rank = updates.worldRank
  if (updates.scoreToPar !== undefined) row.score_to_par = updates.scoreToPar
  if (updates.today !== undefined) row.today = updates.today
  if (updates.thru !== undefined) row.thru = updates.thru
  if (updates.status !== undefined) row.status = updates.status
  if (updates.scoreLocked !== undefined) row.score_locked = updates.scoreLocked
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

  const { error } = await supabase.from('golfers').update(row).eq('id', id)
  if (error) throw error
}

export async function updateGolferScores(
  updates: Array<{
    id: string
    scoreToPar: number
    today: number
    thru: string
    status: 'active' | 'cut' | 'withdrawn'
  }>
): Promise<void> {
  // Batch update: upsert each golfer's scores
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
      .eq('score_locked', false)  // only update unlocked golfers
    if (error) throw error
  }
}

// === Selection writes ===

export async function addSelection(
  teamId: string,
  golferId: string,
  isRandom: boolean
): Promise<Selection> {
  const newSel = {
    id: `s${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    team_id: teamId,
    golfer_id: golferId,
    is_random: isRandom,
    picked_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('selections').insert(newSel)
  if (error) throw error
  return mapSelection(newSel)
}

export async function removeSelection(teamId: string, golferId: string): Promise<void> {
  const { error } = await supabase
    .from('selections')
    .delete()
    .eq('team_id', teamId)
    .eq('golfer_id', golferId)
  if (error) throw error
}

export async function bulkAddSelections(
  items: Array<{ teamId: string; golferId: string; isRandom: boolean }>
): Promise<void> {
  const rows = items.map((item, i) => ({
    id: `s${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`,
    team_id: item.teamId,
    golfer_id: item.golferId,
    is_random: item.isRandom,
    picked_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('selections').insert(rows)
  if (error) throw error
}

// === Snapshot writes ===

export async function saveSnapshots(
  entries: Array<{ teamId: string; aggregateScore: number; rank: number }>
): Promise<void> {
  const today = todayDateString()
  const rows = entries.map(e => ({
    snapshot_date: today,
    team_id: e.teamId,
    aggregate_score: e.aggregateScore,
    rank: e.rank,
  }))

  const { error } = await supabase
    .from('score_snapshots')
    .upsert(rows, { onConflict: 'snapshot_date,team_id' })
  if (error) throw error
}

// === Date helpers ===

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
