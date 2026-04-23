#!/usr/bin/env node
/**
 * Update golfer odds to latest lines + populate Masters history (2021-2025)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

// Latest odds (BetMGM Apr 1 2026 + easyofficepools composite)
// Format: name → [american_odds_string, odds_numeric (fractional numerator)]
const UPDATED_ODDS = {
  'Scottie Scheffler': ['+500', 5],
  'Rory McIlroy': ['+1000', 10],
  'Bryson DeChambeau': ['+1000', 10],
  'Jon Rahm': ['+1200', 12],
  'Ludvig Aberg': ['+1400', 14],
  'Xander Schauffele': ['+1400', 14],
  'Tommy Fleetwood': ['+2200', 22],
  'Collin Morikawa': ['+2500', 25],
  'Cameron Young': ['+2200', 22],
  'Justin Rose': ['+2800', 28],
  'Matt Fitzpatrick': ['+2500', 25],
  'Patrick Reed': ['+3300', 33],
  'Chris Gotterup': ['+3500', 35],
  'Hideki Matsuyama': ['+3500', 35],
  'Viktor Hovland': ['+3300', 33],
  'Brooks Koepka': ['+3300', 33],
  'Robert MacIntyre': ['+4000', 40],
  'Justin Thomas': ['+4000', 40],
  'Tyrrell Hatton': ['+4000', 40],
  'Jordan Spieth': ['+3300', 33],
  'Shane Lowry': ['+4500', 45],
  'Patrick Cantlay': ['+5000', 50],
  'Ben Griffin': ['+5500', 55],
  'Akshay Bhatia': ['+6000', 60],
  'Si Woo Kim': ['+6000', 60],
  'Corey Conners': ['+6000', 60],
  'Cameron Smith': ['+6600', 66],
  'Adam Scott': ['+6600', 66],
  'Max Homa': ['+6600', 66],
  'Jason Day': ['+6600', 66],
  'Min Woo Lee': ['+6600', 66],
  'Russell Henley': ['+6600', 66],
  'Sam Burns': ['+7000', 70],
  'Sepp Straka': ['+7000', 70],
  'Daniel Berger': ['+7000', 70],
  'Wyndham Clark': ['+8000', 80],
  'Sungjae Im': ['+8000', 80],
  'Marco Penge': ['+8000', 80],
  'Gary Woodland': ['+8000', 80],
  'Jake Knapp': ['+6000', 60],
  'Harris English': ['+9000', 90],
  'J.J. Spaun': ['+9000', 90],
  'Jacob Bridgeman': ['+9000', 90],
  'Dustin Johnson': ['+9000', 90],
  'Alexander Noren': ['+10000', 100],
  'Sergio Garcia': ['+10000', 100],
  'Matt McCarty': ['+10000', 100],
  'Maverick McNealy': ['+11000', 110],
  'Ryan Gerard': ['+11000', 110],
  'Keegan Bradley': ['+12000', 120],
  'Nicolai Hojgaard': ['+12000', 120],
  'Ryan Fox': ['+12000', 120],
  'Aaron Rai': ['+13000', 130],
  'Harry Hall': ['+13000', 130],
  'Rasmus Neergaard-Petersen': ['+13000', 130],
  'Johnny Keefer': ['+13000', 130],
  'Tom McKibbin': ['+14000', 140],
  'Brian Harman': ['+15000', 150],
  'Kurt Kitayama': ['+12000', 120],
  'Nicolas Echavarria': ['+20000', 200],
  'Sam Stevens': ['+15000', 150],
  'Rasmus Hojgaard': ['+15000', 150],
  'Casey Jarvis': ['+20000', 200],
  'Tiger Woods': ['+15000', 150],
  'Carlos Ortiz': ['+15000', 150],
  'Phil Mickelson': ['+20000', 200],
  'Aldrich Potgieter': ['+20000', 200],
  'Andrew Novak': ['+20000', 200],
  'Michael Kim': ['+20000', 200],
  'Hao-Tong Li': ['+25000', 250],
  'Max Greyserman': ['+25000', 250],
  'Nick Taylor': ['+25000', 250],
  'Bubba Watson': ['+25000', 250],
  'Sami Valimaki': ['+30000', 300],
  'Kristoffer Reitan': ['+30000', 300],
  'Davis Riley': ['+30000', 300],
  'Thomas Detry': ['+35000', 350],
  'Charl Schwartzel': ['+35000', 350],
  'Michael Brennan': ['+40000', 400],
  'Brian Campbell': ['+40000', 400],
  'Zach Johnson': ['+40000', 400],
  'Danny Willett': ['+50000', 500],
  'Angel Cabrera': ['+50000', 500],
  'Jackson Herrington': ['+200000', 2000],
  'Naoyuki Kataoka': ['+200000', 2000],
  'Mike Weir': ['+100000', 1000],
  'Brandon Holtz': ['+200000', 2000],
  'Fifa Laopakdee': ['+200000', 2000],
  'Mateo Pulcini': ['+200000', 2000],
  'Fred Couples': ['+100000', 1000],
  'Vijay Singh': ['+100000', 1000],
  'Mason Howell': ['+200000', 2000],
  'Ethan Fang': ['+200000', 2000],
  'Jose Maria Olazabal': ['+200000', 2000],
}

// Load history data
const historyData = JSON.parse(readFileSync('masters-history-2021-2025.json', 'utf-8'))
const history = historyData.results

async function run() {
  console.log('=== Updating Pool Data ===\n')

  // Get all golfers
  const { data: golfers } = await sb.from('pga_masters_golfers').select('id,name').order('sort_order')
  console.log(`Found ${golfers.length} golfers\n`)

  let oddsUpdated = 0, historyUpdated = 0, errors = 0

  for (const g of golfers) {
    const payload = {}

    // Update odds
    const odds = UPDATED_ODDS[g.name]
    if (odds) {
      payload.odds = odds[0]
      payload.odds_numeric = odds[1]
    }

    // Update history
    const h = history[g.name]
    if (h) {
      payload.masters_2025 = h[0]
      payload.masters_2024 = h[1]
      payload.masters_2023 = h[2]
      payload.masters_2022 = h[3]
      payload.masters_2021 = h[4]
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await sb.from('pga_masters_golfers').update(payload).eq('id', g.id)
      if (error) {
        console.log(`ERROR ${g.name}: ${error.message}`)
        errors++
      } else {
        if (odds) oddsUpdated++
        if (h) historyUpdated++
      }
    } else {
      console.log(`SKIP: ${g.name} — no odds or history data`)
    }
  }

  // Re-sort by odds_numeric
  console.log('\nRe-sorting by odds...')
  const { data: sorted } = await sb.from('pga_masters_golfers').select('id,name,odds_numeric').order('odds_numeric', { ascending: true })
  for (let i = 0; i < sorted.length; i++) {
    await sb.from('pga_masters_golfers').update({ sort_order: i + 1 }).eq('id', sorted[i].id)
  }

  console.log(`\nDone! Odds: ${oddsUpdated}, History: ${historyUpdated}, Errors: ${errors}`)
}

run().catch(err => { console.error('FATAL:', err); process.exit(1) })
