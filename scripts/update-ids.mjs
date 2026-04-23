#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

const updates = [
  // New ESPN IDs
  { name: 'Rasmus Neergaard-Petersen', espn_id: '4858859' },
  { name: 'Johnny Keefer', espn_id: '5217048' },
  { name: 'Kristoffer Reitan', espn_id: '4348470' },
  { name: 'Michael Brennan', espn_id: '4921329' },
  { name: 'Naoyuki Kataoka', espn_id: '4837226' },
  { name: 'Mason Howell', espn_id: '5289811' },
  { name: 'Ethan Fang', espn_id: '5293232' },
  // ESPN ID corrections
  { name: 'Marco Penge', espn_id: '4585549' },
  { name: 'Ben Griffin', espn_id: '4404992' },
  { name: 'Harry Hall', espn_id: '4589438' },
  // Masters IDs
  { name: 'Si Woo Kim', masters_id: '37455' },
  { name: 'Daniel Berger', masters_id: '40026' },
  { name: 'Alexander Noren', masters_id: '27349' },
  { name: 'Tiger Woods', masters_id: '8793' },
  { name: 'Vijay Singh', masters_id: '6567' },
  { name: 'Jacob Bridgeman', masters_id: '60004' },
  { name: 'Matt McCarty', masters_id: '59141' },
  { name: 'Tom McKibbin', masters_id: '50823' },
  { name: 'Casey Jarvis', masters_id: '57688' },
  { name: 'Carlos Ortiz', masters_id: '33667' },
  { name: 'Sami Valimaki', masters_id: '52666' },
  { name: 'Thomas Detry', masters_id: '33653' },
  { name: 'Denny McCarthy', masters_id: '47993' },
  { name: 'Harry Hall', masters_id: '34099' },
]

for (const u of updates) {
  const payload = {}
  if (u.espn_id) payload.espn_id = u.espn_id
  if (u.masters_id) payload.masters_id = u.masters_id
  const { error } = await sb.from('pga_masters_golfers').update(payload).eq('name', u.name)
  console.log(error ? `FAIL ${u.name}: ${error.message}` : `OK: ${u.name} → ${JSON.stringify(payload)}`)
}

// Verify final coverage
const { data } = await sb.from('pga_masters_golfers').select('name,espn_id,masters_id').order('sort_order')
const noEspn = data.filter(g => !g.espn_id)
const noMasters = data.filter(g => !g.masters_id)
console.log(`\nFinal: ${data.length} golfers, ${data.length - noEspn.length} ESPN IDs, ${data.length - noMasters.length} Masters IDs`)
if (noEspn.length) console.log(`Missing ESPN: ${noEspn.map(g => g.name).join(', ')}`)
if (noMasters.length) console.log(`Missing Masters: ${noMasters.map(g => g.name).join(', ')}`)
