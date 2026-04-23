import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://fjvtfwjqyqcgrzmahqym.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM'
)

const fixes = [
  { name: 'Sergio Garcia', espn_name: 'Sergio García' },
  { name: 'Alexander Noren', espn_name: 'Alex Noren' },
  { name: 'Nicolas Echavarria', espn_name: 'Nico Echavarria' },
  { name: 'Sami Valimaki', espn_name: 'Sami Välimäki' },
  { name: 'Angel Cabrera', espn_name: 'Ángel Cabrera' },
]

for (const f of fixes) {
  const { error } = await sb.from('pga_masters_golfers').update({ espn_name: f.espn_name }).eq('name', f.name)
  console.log(error ? `FAIL ${f.name}: ${error.message}` : `OK: ${f.name} → ${f.espn_name}`)
}
