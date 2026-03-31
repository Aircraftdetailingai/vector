import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { generateRegistrationOptions } from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

const RP_NAME = 'Shiny Jets CRM';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'crm.shinyjets.com';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  // Get existing credentials to exclude
  const { data: existing } = await supabase
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('detailer_id', user.id);

  const excludeCredentials = (existing || []).map(c => ({
    id: c.credential_id,
    type: 'public-key',
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.email,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  // Store challenge temporarily
  await supabase
    .from('detailers')
    .update({ webauthn_challenge: options.challenge })
    .eq('id', user.id);

  return Response.json(options);
}
