import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

const { data: teams } = await sb.from('pga_masters_teams').select('*').eq('confirmed', true)
const { data: users } = await sb.from('pga_masters_users').select('*')
const { data: sels } = await sb.from('pga_masters_selections').select('*')
const { data: golfers } = await sb.from('pga_masters_golfers').select('*').order('odds_numeric')

const userMap = Object.fromEntries(users.map(u => [u.id, u]))
const golferMap = Object.fromEntries(golfers.map(g => [g.id, g]))

const picks = sels.filter(s => !s.is_random)
const freq = {}
for (const s of picks) freq[s.golfer_id] = (freq[s.golfer_id] || 0) + 1

console.log('=== MOST PICKED ===')
Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([gid, count]) => {
  const g = golferMap[gid]
  console.log(`  ${String(count).padStart(2)}x  ${(g?.odds || '').padStart(8)}  ${g?.name}`)
})

const pickedSet = new Set(picks.map(s => s.golfer_id))
console.log('\n=== BEST UNPICKED ===')
golfers.filter(g => !pickedSet.has(g.id) && g.odds_numeric < 200 && g.status === 'active').slice(0, 10).forEach(g => {
  console.log(`        ${g.odds.padStart(8)}  ${g.name}`)
})

console.log('\n=== TEAMS BY AVG ODDS (best to worst) ===')
const teamStats = teams.map(t => {
  const tSels = picks.filter(s => s.team_id === t.id)
  const odds = tSels.map(s => golferMap[s.golfer_id]?.odds_numeric || 999)
  const avg = odds.length ? odds.reduce((a, b) => a + b, 0) / odds.length : 999
  const names = tSels.map(s => golferMap[s.golfer_id]?.name || '?')
  return { name: t.team_name, owner: userMap[t.user_id]?.name || '?', avg, names }
}).sort((a, b) => a.avg - b.avg)

console.log('  TOP 5:')
teamStats.slice(0, 5).forEach(t => {
  console.log(`    ${t.name} (${t.owner}) — avg +${Math.round(t.avg * 100)}`)
  console.log(`      ${t.names.join(', ')}`)
})
console.log('  BOTTOM 5:')
teamStats.slice(-5).forEach(t => {
  console.log(`    ${t.name} (${t.owner}) — avg +${Math.round(t.avg * 100)}`)
})

const scheffler = picks.filter(s => golferMap[s.golfer_id]?.name === 'Scottie Scheffler').length
const rory = picks.filter(s => golferMap[s.golfer_id]?.name === 'Rory McIlroy').length
const bryson = picks.filter(s => golferMap[s.golfer_id]?.name === 'Bryson DeChambeau').length
const rahm = picks.filter(s => golferMap[s.golfer_id]?.name === 'Jon Rahm').length
const spieth = picks.filter(s => golferMap[s.golfer_id]?.name === 'Jordan Spieth').length
const tiger = picks.filter(s => golferMap[s.golfer_id]?.name === 'Tiger Woods').length

console.log('\n=== FUN FACTS ===')
console.log(`  Total teams: ${teams.length}`)
console.log(`  Unique golfers picked: ${pickedSet.size} / ${golfers.filter(g=>g.status==='active').length} active`)
console.log(`  Scheffler: ${scheffler} teams (${Math.round(scheffler/teams.length*100)}%)`)
console.log(`  Rory: ${rory} teams (${Math.round(rory/teams.length*100)}%)`)
console.log(`  Bryson: ${bryson} teams`)
console.log(`  Rahm: ${rahm} teams`)
console.log(`  Spieth: ${spieth} teams`)
console.log(`  Tiger Woods: ${tiger} teams (withdrawn!)`)

// Dup penalty leaders
console.log('\n=== BIGGEST DUP PENALTIES ===')
Object.entries(freq).filter(([,c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([gid, count]) => {
  const g = golferMap[gid]
  console.log(`  ${g?.name}: ${count} teams → +${count - 1} dup penalty`)
})
