#!/usr/bin/env node
/**
 * Reset the Masters pool for 2026:
 * 1. Delete all selections, teams, score_snapshots
 * 2. Delete all non-admin users (keep Neeraj + Patrick)
 * 3. Replace golfers with 2026 Masters invite list + ESPN/Masters IDs
 * 4. Reset config
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fjvtfwjqyqcgrzmahqym.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// Admin user IDs to keep
const KEEP_USERS = ['u1', 'u1774711986264'] // Neeraj, Patrick

// ESPN ID → Masters ID mapping (from masters-ids.ts)
const ESPN_TO_MASTERS = new Map([
  ['9478', '46046'],     // Scottie Scheffler
  ['3470', '28237'],     // Rory McIlroy
  ['10046', '47959'],    // Bryson DeChambeau
  ['9780', '46970'],     // Jon Rahm
  ['4375972', '52955'],  // Ludvig Åberg
  ['10140', '48081'],    // Xander Schauffele
  ['5539', '30911'],     // Tommy Fleetwood
  ['10592', '50525'],    // Collin Morikawa
  ['4425906', '57366'],  // Cameron Young
  ['569', '22405'],      // Justin Rose
  ['9037', '40098'],     // Matt Fitzpatrick
  ['5579', '34360'],     // Patrick Reed
  ['5860', '32839'],     // Hideki Matsuyama
  ['4364873', '46717'],  // Viktor Hovland
  ['6798', '36689'],     // Brooks Koepka
  ['11378', '52215'],    // Robert MacIntyre
  ['4848', '33448'],     // Justin Thomas
  ['5553', '34363'],     // Tyrrell Hatton
  ['5467', '34046'],     // Jordan Spieth
  ['4587', '33204'],     // Shane Lowry
  ['6007', '35450'],     // Patrick Cantlay
  ['4419142', '56630'],  // Akshay Bhatia
  ['9126', '39997'],     // Corey Conners
  ['9131', '35891'],     // Cameron Smith
  ['388', '24502'],      // Adam Scott
  ['8973', '39977'],     // Max Homa
  ['1680', '28089'],     // Jason Day
  ['4410932', '37378'],  // Min Woo Lee
  ['5409', '34098'],     // Russell Henley
  ['9938', '47504'],     // Sam Burns
  ['8961', '49960'],     // Sepp Straka
  ['11119', '51766'],    // Wyndham Clark
  ['11382', '39971'],    // Sungjae Im
  ['5408', '34099'],     // Harris English
  ['10166', '39324'],    // J.J. Spaun
  ['3448', '30925'],     // Dustin Johnson
  ['158', '21209'],      // Sergio Garcia
  ['9530', '46442'],     // Maverick McNealy
  ['4513', '33141'],     // Keegan Bradley
  ['4251', '29936'],     // Ryan Fox
  ['10906', '46414'],    // Aaron Rai
  ['10364', '48117'],    // Kurt Kitayama
  ['11250', '52453'],    // Nicolai Højgaard
  ['11253', '52686'],    // Rasmus Højgaard
  ['1225', '27644'],     // Brian Harman
  ['4408316', '51349'],  // Nicolas Echavarria
  ['4426181', '55893'],  // Sam Stevens
  ['10058', '47995'],    // Davis Riley
  ['308', '1810'],       // Phil Mickelson
  ['5080439', '63343'],  // Aldrich Potgieter
  ['8974', '39975'],     // Michael Kim
  ['9221', '35296'],     // Haotong Li
  ['11101', '45486'],    // Max Greyserman (using Joaquín Niemann's slot - will fix)
  ['3792', '25493'],     // Nick Taylor
  ['780', '25804'],      // Bubba Watson
  ['1097', '26331'],     // Charl Schwartzel
  ['686', '24024'],      // Zach Johnson
  ['4304', '32139'],     // Danny Willett
  ['65', '20848'],       // Angel Cabrera
  ['91', '1226'],        // Fred Couples
  ['453', '10423'],      // Mike Weir
  ['329', '6373'],       // José María Olazábal
  ['9525', '46443'],     // Brian Campbell
  ['3550', '31323'],     // Gary Woodland
  ['9843', '111651'],    // Jake Knapp
])

// Name → ESPN ID lookup (reverse of above + extras)
const NAME_TO_ESPN = new Map([
  ['Scottie Scheffler', '9478'],
  ['Rory McIlroy', '3470'],
  ['Bryson DeChambeau', '10046'],
  ['Jon Rahm', '9780'],
  ['Ludvig Aberg', '4375972'],
  ['Xander Schauffele', '10140'],
  ['Tommy Fleetwood', '5539'],
  ['Collin Morikawa', '10592'],
  ['Cameron Young', '4425906'],
  ['Justin Rose', '569'],
  ['Matt Fitzpatrick', '9037'],
  ['Patrick Reed', '5579'],
  ['Chris Gotterup', '4686838'],
  ['Hideki Matsuyama', '5860'],
  ['Viktor Hovland', '4364873'],
  ['Brooks Koepka', '6798'],
  ['Robert MacIntyre', '11378'],
  ['Justin Thomas', '4848'],
  ['Tyrrell Hatton', '5553'],
  ['Jordan Spieth', '5467'],
  ['Shane Lowry', '4587'],
  ['Patrick Cantlay', '6007'],
  ['Ben Griffin', '4426175'],
  ['Akshay Bhatia', '4419142'],
  ['Si Woo Kim', '4602673'],  // Tom Kim's ESPN ID — need to find Si Woo
  ['Corey Conners', '9126'],
  ['Cameron Smith', '9131'],
  ['Adam Scott', '388'],
  ['Max Homa', '8973'],
  ['Jason Day', '1680'],
  ['Min Woo Lee', '4410932'],
  ['Russell Henley', '5409'],
  ['Sam Burns', '9938'],
  ['Sepp Straka', '8961'],
  ['Wyndham Clark', '11119'],
  ['Sungjae Im', '11382'],
  ['Marco Penge', '10891'],
  ['Harris English', '5408'],
  ['J.J. Spaun', '10166'],
  ['Jacob Bridgeman', '4920078'],
  ['Dustin Johnson', '3448'],
  ['Alexander Noren', '5285'],
  ['Sergio Garcia', '158'],
  ['Maverick McNealy', '9530'],
  ['Ryan Gerard', '4916924'],
  ['Keegan Bradley', '4513'],
  ['Ryan Fox', '4251'],
  ['Aaron Rai', '10906'],
  ['Harry Hall', '10865'],
  ['Rasmus Neergaard-Petersen', null],
  ['John Keefer', null],
  ['Tom McKibbin', '10576'],
  ['Brian Harman', '1225'],
  ['Kurt Kitayama', '10364'],
  ['Nicolas Echavarria', '4408316'],
  ['Sam Stevens', '4426181'],
  ['Rasmus Hojgaard', '11253'],
  ['Casey Jarvis', '5209210'],
  ['Tiger Woods', '462'],
  ['Carlos Ortiz', '6020'],
  ['Phil Mickelson', '308'],
  ['Aldrich Potgieter', '5080439'],
  ['Andrew Novak', '10508'],
  ['Michael Kim', '8974'],
  ['Hao-Tong Li', '9221'],
  ['Max Greyserman', '11101'],
  ['Nick Taylor', '3792'],
  ['Bubba Watson', '780'],
  ['Sami Valimaki', '10916'],
  ['Kristoffer Reitan', null],
  ['Davis Riley', '10058'],
  ['Charl Schwartzel', '1097'],
  ['Michael Brennan', null],
  ['Brian Campbell', '9525'],
  ['Zach Johnson', '686'],
  ['Danny Willett', '4304'],
  ['Angel Cabrera', '65'],
  ['Jackson Herrington', null],
  ['Naoyuki Kataoka', null],
  ['Mike Weir', '453'],
  ['Brandon Holtz', null],
  ['Fifa Laopakdee', null],
  ['Mateo Pulcini', null],
  ['Fred Couples', '91'],
  ['Vijay Singh', '401'],
  ['Mason Howell', null],
  ['Ethan Fang', null],
  ['Jose Maria Olazabal', '329'],
  ['Gary Woodland', '3550'],
  ['Jake Knapp', '9843'],
  ['Nicolai Hojgaard', '11250'],
  ['Daniel Berger', '9025'],
  ['Matt McCarty', '4901368'],
  ['Denny McCarthy', '10054'],
  ['Thomas Detry', '4837'],
])

// Fix Si Woo Kim ESPN ID
NAME_TO_ESPN.set('Si Woo Kim', '4686830')

// Build the 2026 field (from masters-field.ts)
const FIELD = [
  { name: 'Scottie Scheffler', odds: 4 },
  { name: 'Rory McIlroy', odds: 7 },
  { name: 'Bryson DeChambeau', odds: 10 },
  { name: 'Jon Rahm', odds: 12 },
  { name: 'Ludvig Aberg', odds: 16 },
  { name: 'Xander Schauffele', odds: 18 },
  { name: 'Tommy Fleetwood', odds: 18 },
  { name: 'Collin Morikawa', odds: 22 },
  { name: 'Cameron Young', odds: 27 },
  { name: 'Justin Rose', odds: 30 },
  { name: 'Matt Fitzpatrick', odds: 30 },
  { name: 'Patrick Reed', odds: 30 },
  { name: 'Chris Gotterup', odds: 35 },
  { name: 'Hideki Matsuyama', odds: 35 },
  { name: 'Viktor Hovland', odds: 35 },
  { name: 'Brooks Koepka', odds: 38 },
  { name: 'Robert MacIntyre', odds: 40 },
  { name: 'Justin Thomas', odds: 40 },
  { name: 'Tyrrell Hatton', odds: 40 },
  { name: 'Jordan Spieth', odds: 40 },
  { name: 'Shane Lowry', odds: 45 },
  { name: 'Patrick Cantlay', odds: 50 },
  { name: 'Ben Griffin', odds: 55 },
  { name: 'Akshay Bhatia', odds: 60 },
  { name: 'Si Woo Kim', odds: 60 },
  { name: 'Corey Conners', odds: 60 },
  { name: 'Cameron Smith', odds: 66 },
  { name: 'Adam Scott', odds: 66 },
  { name: 'Max Homa', odds: 66 },
  { name: 'Jason Day', odds: 66 },
  { name: 'Min Woo Lee', odds: 66 },
  { name: 'Russell Henley', odds: 66 },
  { name: 'Sam Burns', odds: 70 },
  { name: 'Sepp Straka', odds: 70 },
  { name: 'Wyndham Clark', odds: 80 },
  { name: 'Sungjae Im', odds: 80 },
  { name: 'Marco Penge', odds: 80 },
  { name: 'Gary Woodland', odds: 80 },
  { name: 'Jake Knapp', odds: 80 },
  { name: 'Harris English', odds: 90 },
  { name: 'J.J. Spaun', odds: 90 },
  { name: 'Jacob Bridgeman', odds: 90 },
  { name: 'Dustin Johnson', odds: 90 },
  { name: 'Daniel Berger', odds: 90 },
  { name: 'Alexander Noren', odds: 100 },
  { name: 'Sergio Garcia', odds: 100 },
  { name: 'Matt McCarty', odds: 100 },
  { name: 'Maverick McNealy', odds: 110 },
  { name: 'Ryan Gerard', odds: 110 },
  { name: 'Keegan Bradley', odds: 120 },
  { name: 'Nicolai Hojgaard', odds: 120 },
  { name: 'Ryan Fox', odds: 120 },
  { name: 'Aaron Rai', odds: 130 },
  { name: 'Harry Hall', odds: 130 },
  { name: 'Rasmus Neergaard-Petersen', odds: 130 },
  { name: 'Johnny Keefer', odds: 130 },
  { name: 'Tom McKibbin', odds: 140 },
  { name: 'Brian Harman', odds: 150 },
  { name: 'Kurt Kitayama', odds: 150 },
  { name: 'Nicolas Echavarria', odds: 150 },
  { name: 'Sam Stevens', odds: 150 },
  { name: 'Rasmus Hojgaard', odds: 150 },
  { name: 'Casey Jarvis', odds: 150 },
  { name: 'Tiger Woods', odds: 150 },
  { name: 'Carlos Ortiz', odds: 150 },
  { name: 'Phil Mickelson', odds: 200 },
  { name: 'Aldrich Potgieter', odds: 200 },
  { name: 'Andrew Novak', odds: 200 },
  { name: 'Michael Kim', odds: 200 },
  { name: 'Hao-Tong Li', odds: 250 },
  { name: 'Max Greyserman', odds: 250 },
  { name: 'Nick Taylor', odds: 250 },
  { name: 'Bubba Watson', odds: 250 },
  { name: 'Sami Valimaki', odds: 300 },
  { name: 'Kristoffer Reitan', odds: 300 },
  { name: 'Davis Riley', odds: 300 },
  { name: 'Thomas Detry', odds: 350 },
  { name: 'Charl Schwartzel', odds: 350 },
  { name: 'Michael Brennan', odds: 400 },
  { name: 'Brian Campbell', odds: 400 },
  { name: 'Zach Johnson', odds: 400 },
  { name: 'Danny Willett', odds: 500 },
  { name: 'Angel Cabrera', odds: 500 },
  { name: 'Jackson Herrington', odds: 1000 },
  { name: 'Naoyuki Kataoka', odds: 1000 },
  { name: 'Mike Weir', odds: 1000 },
  { name: 'Brandon Holtz', odds: 1000 },
  { name: 'Fifa Laopakdee', odds: 1000 },
  { name: 'Mateo Pulcini', odds: 1000 },
  { name: 'Fred Couples', odds: 1000 },
  { name: 'Vijay Singh', odds: 1000 },
  { name: 'Mason Howell', odds: 1000 },
  { name: 'Ethan Fang', odds: 1000 },
  { name: 'Jose Maria Olazabal', odds: 2000 },
]

// Map ESPN name variations
const ESPN_NAME_MAP = new Map([
  ['Ludvig Aberg', 'Ludvig Åberg'],
  ['Nicolai Hojgaard', 'Nicolai Højgaard'],
  ['Rasmus Hojgaard', 'Rasmus Højgaard'],
  ['Jose Maria Olazabal', 'José María Olazábal'],
  ['Hao-Tong Li', 'Haotong Li'],
  ['Johnny Keefer', 'Johnny Keefer'],
])

async function reset() {
  console.log('=== Masters Pool Reset ===\n')

  // 1. Delete all selections
  console.log('1. Deleting all selections...')
  const { error: selErr, count: selCount } = await sb
    .from('pga_masters_selections').delete().neq('id', '').select('id', { count: 'exact', head: true })
  // Supabase delete needs a filter, use gte to match all
  const { error: selErr2 } = await sb.from('pga_masters_selections').delete().gte('id', '')
  console.log(selErr2 ? `   ERROR: ${selErr2.message}` : '   Done')

  // 2. Delete all teams
  console.log('2. Deleting all teams...')
  const { error: teamErr } = await sb.from('pga_masters_teams').delete().gte('id', '')
  console.log(teamErr ? `   ERROR: ${teamErr.message}` : '   Done')

  // 3. Delete all score_snapshots
  console.log('3. Deleting all score_snapshots...')
  const { error: snapErr } = await sb.from('pga_masters_score_snapshots').delete().gte('id', 0)
  console.log(snapErr ? `   ERROR: ${snapErr.message}` : '   Done')

  // 4. Delete non-admin users
  console.log('4. Deleting non-admin users (keeping Neeraj + Patrick)...')
  const { data: allUsers } = await sb.from('pga_masters_users').select('id,name,admin')
  const toDelete = (allUsers ?? []).filter(u => !KEEP_USERS.includes(u.id))
  console.log(`   Found ${toDelete.length} users to delete...`)
  for (const u of toDelete) {
    const { error } = await sb.from('pga_masters_users').delete().eq('id', u.id)
    if (error) console.log(`   ERROR deleting ${u.name}: ${error.message}`)
  }
  console.log(`   Kept: ${(allUsers ?? []).filter(u => KEEP_USERS.includes(u.id)).map(u => u.name).join(', ')}`)

  // 5. Delete all golfers
  console.log('5. Deleting all existing golfers...')
  const { error: golfErr } = await sb.from('pga_masters_golfers').delete().gte('id', '')
  console.log(golfErr ? `   ERROR: ${golfErr.message}` : '   Done')

  // 6. Insert new golfers
  console.log('6. Inserting 2026 Masters field...')
  const rows = FIELD.map((p, idx) => {
    const espnId = NAME_TO_ESPN.get(p.name) ?? null
    const espnName = ESPN_NAME_MAP.get(p.name) ?? p.name
    const mastersId = espnId ? (ESPN_TO_MASTERS.get(espnId) ?? null) : null

    return {
      id: `g${idx + 1}`,
      name: p.name,
      espn_name: espnName,
      espn_id: espnId,
      masters_id: mastersId,
      odds: `+${p.odds * 100}`,
      odds_numeric: p.odds,
      sort_order: idx + 1,
      score_to_par: 0,
      today: 0,
      thru: '',
      status: 'active',
      score_locked: false,
      world_rank: null,
      flag_url: null,
    }
  })

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await sb.from('pga_masters_golfers').insert(batch)
    if (error) {
      console.log(`   ERROR inserting batch ${i}: ${error.message}`)
    }
  }

  // Report ESPN/Masters ID coverage
  const withEspn = rows.filter(r => r.espn_id)
  const withMasters = rows.filter(r => r.masters_id)
  const missing = rows.filter(r => !r.espn_id)
  console.log(`   Inserted ${rows.length} golfers`)
  console.log(`   ESPN IDs: ${withEspn.length}/${rows.length}`)
  console.log(`   Masters IDs: ${withMasters.length}/${rows.length}`)
  if (missing.length > 0) {
    console.log(`   Missing ESPN IDs: ${missing.map(r => r.name).join(', ')}`)
  }

  // 7. Reset config
  console.log('7. Resetting config...')
  const { error: cfgErr } = await sb.from('pga_masters_config').update({
    pool_locked: false,
    randoms_assigned: false,
    live_scoring: false,
  }).eq('id', 1)
  console.log(cfgErr ? `   ERROR: ${cfgErr.message}` : '   Done')

  console.log('\n=== Reset complete! ===')
}

reset().catch(err => { console.error('FATAL:', err); process.exit(1) })
