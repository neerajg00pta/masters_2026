#!/usr/bin/env node
/**
 * Dry-run the random assignment algorithm — does NOT write to DB.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

// Replicate the algorithm from random-assignment.ts
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const { data: golfers } = await sb.from('pga_masters_golfers').select('*').order('odds_numeric')
const { data: teams } = await sb.from('pga_masters_teams').select('*')
const { data: selections } = await sb.from('pga_masters_selections').select('*')

const readyTeams = teams.filter(t => t.confirmed)
const teamsNeedingRandom = readyTeams.filter(t =>
  !selections.some(s => s.team_id === t.id && s.is_random)
)

const usedGolferIds = new Set(selections.map(s => s.golfer_id))
const available = golfers.filter(g => !usedGolferIds.has(g.id) && g.status === 'active')

console.log(`=== Random Assignment Dry Run ===`)
console.log(`Active golfers: ${golfers.filter(g => g.status === 'active').length}`)
console.log(`Already picked (in selections): ${usedGolferIds.size}`)
console.log(`Available pool: ${available.length}`)
console.log(`Confirmed teams: ${readyTeams.length}`)
console.log(`Teams needing random: ${teamsNeedingRandom.length}`)
console.log(`Mode: ${teamsNeedingRandom.length <= available.length ? 'UNIQUE (by odds)' : 'ROUND ROBIN (shuffled, duplicates)'}`)
console.log()

console.log(`=== Available Pool (${available.length} golfers) ===`)
const byOdds = [...available].sort((a, b) => a.odds_numeric - b.odds_numeric)
byOdds.forEach((g, i) => console.log(`  ${(i+1).toString().padStart(2)}. ${g.odds.padStart(8)}  ${g.name}`))

// Run the assignment
const shuffledTeams = shuffle(teamsNeedingRandom)
const assignments = []

if (available.length >= shuffledTeams.length) {
  for (let i = 0; i < shuffledTeams.length; i++) {
    assignments.push({ teamId: shuffledTeams[i].id, golferId: byOdds[i].id })
  }
} else {
  const shuffledGolfers = shuffle(available)
  for (let i = 0; i < shuffledTeams.length; i++) {
    assignments.push({ teamId: shuffledTeams[i].id, golferId: shuffledGolfers[i % shuffledGolfers.length].id })
  }
}

// Gupta swaps
const NEERAJ_TEAM = 't1775160844293'
const KURT = 'g59'
const GUPTA_KID_TEAMS = ['t1775435861588', 't1775532018246']
const ALL_GUPTA = new Set([NEERAJ_TEAM, ...GUPTA_KID_TEAMS])
const top8 = byOdds.filter(g => g.id !== KURT).slice(0, 8)

const neerajEntry = assignments.find(a => a.teamId === NEERAJ_TEAM)
const kurtHolder = assignments.find(a => a.golferId === KURT && !ALL_GUPTA.has(a.teamId))
if (neerajEntry && kurtHolder) {
  const temp = neerajEntry.golferId
  neerajEntry.golferId = KURT
  kurtHolder.golferId = temp
}

for (const kidTeamId of GUPTA_KID_TEAMS) {
  const kidEntry = assignments.find(a => a.teamId === kidTeamId)
  if (!kidEntry || top8.length === 0) continue
  const target = top8[Math.floor(Math.random() * top8.length)]
  const holder = assignments.find(a => a.golferId === target.id && !ALL_GUPTA.has(a.teamId))
  if (holder) {
    const temp = kidEntry.golferId
    kidEntry.golferId = target.id
    holder.golferId = temp
  }
}

// Display results
const golferMap = new Map(golfers.map(g => [g.id, g]))
const teamMap = new Map(teams.map(t => [t.id, t]))

console.log()
console.log(`=== Assignments (${assignments.length}) ===`)

// Count golfer frequency
const freq = new Map()
for (const a of assignments) freq.set(a.golferId, (freq.get(a.golferId) ?? 0) + 1)

// Sort by golfer odds for display
const sortedAssignments = [...assignments].sort((a, b) => {
  const ga = golferMap.get(a.golferId)
  const gb = golferMap.get(b.golferId)
  return (ga?.odds_numeric ?? 999) - (gb?.odds_numeric ?? 999)
})

for (const a of sortedAssignments) {
  const g = golferMap.get(a.golferId)
  const t = teamMap.get(a.teamId)
  const isGupta = ALL_GUPTA.has(a.teamId) ? ' *** GUPTA' : ''
  const count = freq.get(a.golferId)
  console.log(`  ${g?.odds?.padStart(8)} ${g?.name?.padEnd(28)} → ${t?.team_name?.padEnd(24)}${count > 1 ? ` (${count}x)` : ''}${isGupta}`)
}

console.log()
console.log(`=== Golfer Frequency ===`)
const freqSorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
for (const [gid, count] of freqSorted) {
  const g = golferMap.get(gid)
  if (count > 1) console.log(`  ${g?.name?.padEnd(28)} ${count}x`)
}
console.log(`  (${freqSorted.filter(([,c]) => c === 1).length} golfers assigned 1x)`)
