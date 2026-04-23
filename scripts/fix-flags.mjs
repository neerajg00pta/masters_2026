#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)
const espnFlag = cc => `https://a.espncdn.com/i/teamlogos/countries/500/${cc}.png`
const fixes = [
  ['Alexander Noren', espnFlag('swe')],       // Swedish, not Korean
  ['Carlos Ortiz', espnFlag('mex')],           // Mexican, not USA
  ['Tom McKibbin', espnFlag('nir')],           // Northern Irish, not USA
  ['Vijay Singh', espnFlag('fij')],            // Fijian
  ['Si Woo Kim', espnFlag('kor')],             // South Korean
  ['Chris Gotterup', espnFlag('usa')],         // American
  ['Jacob Bridgeman', espnFlag('usa')],        // American
  ['Ryan Gerard', espnFlag('usa')],            // American
  ['Casey Jarvis', espnFlag('rsa')],           // South African
  ['Sami Valimaki', espnFlag('fin')],          // Finnish, not Swedish
  ['Jackson Herrington', espnFlag('usa')],
  ['Brandon Holtz', espnFlag('usa')],
  ['Mateo Pulcini', espnFlag('arg')],          // Argentine
  ['Fifa Laopakdee', espnFlag('tha')],         // Thai
]
for (const [name, url] of fixes) {
  const { error } = await sb.from('pga_masters_golfers').update({ flag_url: url }).eq('name', name)
  console.log(error ? `FAIL ${name}: ${error.message}` : `OK: ${name}`)
}
