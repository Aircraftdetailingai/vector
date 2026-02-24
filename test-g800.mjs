import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)="(.*)"/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('aircraft').select('*').or('model.ilike.%G800%,model.ilike.%Gulfstream%G800%').limit(5);
console.log(JSON.stringify(data, null, 2));
