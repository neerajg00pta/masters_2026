#!/usr/bin/env node
/**
 * Fetch country flag URLs from ESPN athlete API for all golfers with ESPN IDs.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

async function run() {
  const { data: golfers } = await sb.from('pga_masters_golfers').select('id,name,espn_id,flag_url').order('sort_order')
  const needFlags = golfers.filter(g => g.espn_id && !g.flag_url)
  console.log(`Fetching flags for ${needFlags.length} golfers...\n`)

  let ok = 0, fail = 0

  for (const g of needFlags) {
    try {
      const url = `https://site.web.api.espn.com/apis/common/v3/sports/golf/pga/athletes/${g.espn_id}`
      const resp = await fetch(url)
      if (!resp.ok) { console.log(`SKIP ${g.name}: HTTP ${resp.status}`); fail++; continue }
      const data = await resp.json()

      // Try multiple paths for flag URL
      const flag = data?.athlete?.flag?.href
        ?? data?.flag?.href
        ?? data?.athlete?.citizenship?.country?.flag?.href
        ?? null

      if (flag) {
        await sb.from('pga_masters_golfers').update({ flag_url: flag }).eq('id', g.id)
        console.log(`OK: ${g.name} → ${flag}`)
        ok++
      } else {
        // Try to construct from country code
        const cc = data?.athlete?.citizenship?.country?.abbreviation
          ?? data?.citizenship?.country?.abbreviation
          ?? null
        if (cc) {
          const constructed = `https://a.espncdn.com/i/teamlogos/countries/500/${cc.toLowerCase()}.png`
          await sb.from('pga_masters_golfers').update({ flag_url: constructed }).eq('id', g.id)
          console.log(`OK: ${g.name} → ${constructed} (constructed)`)
          ok++
        } else {
          console.log(`MISS: ${g.name} — no flag data`)
          fail++
        }
      }
    } catch (err) {
      console.log(`ERR: ${g.name} — ${err.message}`)
      fail++
    }
  }

  console.log(`\nDone: ${ok} flags set, ${fail} missed`)
}

run().catch(err => { console.error('FATAL:', err); process.exit(1) })
