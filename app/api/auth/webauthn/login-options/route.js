import { createClient } from '@supabase/supabase-js';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'crm.shinyjets.com';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const { email } = await request.json();
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

  const supabase = getSupabase();

  // Find detailer
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!detailer) {
    return Response.json({ error: 'No account found' }, { status: 404 });
  }

  // Get credentials
  const { data: credentials } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('detailer_id', detailer.id);

  if (!credentials || credentials.length === 0) {
    return Response.json({ error: 'No passkeys registered' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: credentials.map(c => ({
      id: c.credential_id,
      type: 'public-key',
      transports: c.transports || ['internal'],
    })),
    userVerification: 'preferred',
  });

  // Store challenge
  await supabase
    .from('detailers')
    .update({ webauthn_challenge: options.challenge })
    .eq('id', detailer.id);

  return Response.json(options);
}
