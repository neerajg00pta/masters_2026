import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

// ESPN ID → Masters ID from masters-ids.ts (newly added ones)
const updates = [
  { name: 'Chris Gotterup', espn_id: '4690755', masters_id: '59095' },
  { name: 'Ben Griffin', espn_id: '4404992', masters_id: '54591' },
  { name: 'Michael Brennan', espn_id: '4921329', masters_id: '61522' },
  { name: 'Andrew Novak', espn_id: '11332', masters_id: '51997' },
  { name: 'Marco Penge', espn_id: '4585549', masters_id: '51003' },
  { name: 'Ryan Gerard', espn_id: '5076021', masters_id: '59018' },
  { name: 'Johnny Keefer', espn_id: '5217048', masters_id: '63454' },
  { name: 'Rasmus Neergaard-Petersen', espn_id: '4858859', masters_id: '52689' },
  { name: 'Kristoffer Reitan', espn_id: '4348470', masters_id: '49855' },
  { name: 'Naoyuki Kataoka', espn_id: '4837226', masters_id: '46879' },
  { name: 'Mason Howell', espn_id: '5289811', masters_id: '68607' },
  { name: 'Ethan Fang', espn_id: '5293232', masters_id: '68932' },
  { name: 'Fifa Laopakdee', espn_id: '5327297', masters_id: '70146' },
  { name: 'Jackson Herrington', espn_id: '5344766', masters_id: '70148' },
  { name: 'Brandon Holtz', espn_id: '2201886', masters_id: '70147' },
  { name: 'Mateo Pulcini', espn_id: '5344763', masters_id: '70145' },
  // Also fix Si Woo Kim and Harry Hall masters IDs from the updated file
  { name: 'Si Woo Kim', masters_id: '37455' },
  { name: 'Harry Hall', masters_id: '57975' },
]

for (const u of updates) {
  const payload = { masters_id: u.masters_id }
  if (u.espn_id) payload.espn_id = u.espn_id
  const { error } = await sb.from('pga_masters_golfers').update(payload).eq('name', u.name)
  console.log(error ? `FAIL ${u.name}: ${error.message}` : `OK: ${u.name} → masters_id=${u.masters_id}`)
}

// Verify
const { data } = await sb.from('pga_masters_golfers').select('name,masters_id').is('masters_id', null).eq('status', 'active')
console.log(`\n${data.length} active golfers still missing masters_id:`)
data.forEach(g => console.log(`  ${g.name}`))
