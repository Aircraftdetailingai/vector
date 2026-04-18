import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.company !== undefined) updates.company = body.company;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.google_business_url !== undefined) updates.google_business_url = body.google_business_url;
  // Mailing address (for invoice "remit to" block + onboarding)
  if (body.mailing_address_line1 !== undefined) updates.mailing_address_line1 = body.mailing_address_line1 || null;
  if (body.mailing_address_line2 !== undefined) updates.mailing_address_line2 = body.mailing_address_line2 || null;
  if (body.mailing_city !== undefined) updates.mailing_city = body.mailing_city || null;
  if (body.mailing_state !== undefined) updates.mailing_state = body.mailing_state || null;
  if (body.mailing_zip !== undefined) updates.mailing_zip = body.mailing_zip || null;
  if (body.mailing_country !== undefined) updates.mailing_country = body.mailing_country || 'US';
  // ACH bank info — sensitive, stored here but NOT returned by /api/user/me
  // unless include_remit=1 is passed. Validate shape lightly before accepting.
  if (body.ach_routing_number !== undefined) {
    const r = (body.ach_routing_number || '').replace(/\D/g, '');
    updates.ach_routing_number = r || null;
  }
  if (body.ach_account_number !== undefined) {
    const a = (body.ach_account_number || '').replace(/\D/g, '');
    updates.ach_account_number = a || null;
  }
  if (body.ach_account_name !== undefined) updates.ach_account_name = body.ach_account_name || null;
  if (body.ach_bank_name !== undefined) updates.ach_bank_name = body.ach_bank_name || null;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('detailers')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update profile:', error);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return Response.json({ success: true });
}
