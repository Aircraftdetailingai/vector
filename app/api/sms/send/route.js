import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { sendSms, formatPhoneE164 } from '@/lib/sms';
import { hasPremiumAccess } from '@/lib/pricing-tiers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  // SMS temporarily disabled pending 10DLC approval
  return Response.json({ error: 'SMS is temporarily disabled. Will be re-enabled after 10DLC approval.' }, { status: 503 });

  /* eslint-disable no-unreachable */
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Column-stripping retry for detailer fetch
  let detailer = null;
  let detailerCols = 'id, plan, is_admin, sms_enabled, twilio_phone';
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('detailers')
      .select(detailerCols)
      .eq('id', user.id)
      .single();

    if (!error) {
      detailer = data;
      break;
    }

    const colMatch = error.message?.match(/column (\w+)\.(\w+) does not exist/)
      || error.message?.match(/Could not find the '([^']+)' column/);
    if (colMatch) {
      const badCol = colMatch[2] || colMatch[1];
      console.log(`=== SMS SEND === stripping missing column: ${badCol}`);
      detailerCols = detailerCols.split(',').map(c => c.trim()).filter(c => c !== badCol).join(', ');
      continue;
    }

    console.error('=== SMS SEND === detailer fetch error:', error);
    break;
  }

  if (!detailer) {
    console.error('=== SMS SEND === detailer is null after fetch');
    return Response.json({ error: 'Could not load account' }, { status: 500 });
  }

  if (!hasPremiumAccess(detailer?.plan, detailer?.is_admin)) {
    return Response.json({ error: 'SMS requires Business plan' }, { status: 403 });
  }

  if (detailer?.sms_enabled === false) {
    return Response.json({ error: 'SMS is disabled in your settings' }, { status: 403 });
  }

  const { to, body } = await request.json();

  if (!to || !body) {
    return Response.json({ error: 'to and body are required' }, { status: 400 });
  }

  console.log('=== SMS ROUTE CALLED === to:', to, 'from:', detailer.twilio_phone || 'default');
  const result = await sendSms({ to, body, from: detailer.twilio_phone || undefined });

  return Response.json(result, { status: result.success ? 200 : 500 });
}
