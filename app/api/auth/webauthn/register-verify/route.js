import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'crm.shinyjets.com';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.shinyjets.com';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabase();

  // Get stored challenge
  const { data: detailer } = await supabase
    .from('detailers')
    .select('webauthn_challenge')
    .eq('id', user.id)
    .single();

  if (!detailer?.webauthn_challenge) {
    return Response.json({ error: 'No challenge found' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: detailer.webauthn_challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return Response.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    // Store credential
    const credentialIdBase64 = Buffer.from(credential.id).toString('base64url');
    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64url');

    const { error: insertError } = await supabase
      .from('webauthn_credentials')
      .insert({
        detailer_id: user.id,
        credential_id: credentialIdBase64,
        public_key: publicKeyBase64,
        counter: credential.counter,
        transports: body.credential.response?.transports || [],
        device_name: body.deviceName || 'This device',
      });

    if (insertError) {
      console.error('WebAuthn credential insert error:', insertError);
      return Response.json({ error: 'Failed to save credential' }, { status: 500 });
    }

    // Clear challenge
    await supabase.from('detailers').update({ webauthn_challenge: null }).eq('id', user.id);

    return Response.json({ success: true });
  } catch (err) {
    console.error('WebAuthn register verify error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
