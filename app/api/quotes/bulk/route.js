import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { sendQuoteSentEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

export async function POST(request) {
  const supabase = getSupabase();

  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, ids } = await request.json();

  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'action and ids[] required' }, { status: 400 });
  }

  // Verify all quotes belong to this user
  const { data: quotes, error: fetchErr } = await supabase
    .from('quotes')
    .select('id, detailer_id, status, client_email, client_name, share_link, aircraft_model, aircraft_type, total_price')
    .in('id', ids)
    .eq('detailer_id', user.id);

  if (fetchErr) {
    return Response.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!quotes || quotes.length === 0) {
    return Response.json({ error: 'No matching quotes found' }, { status: 404 });
  }

  const validIds = quotes.map(q => q.id);

  // --- SEND ---
  if (action === 'send') {
    const sendable = quotes.filter(q => q.client_email && ['draft', 'sent'].includes(q.status));
    if (sendable.length === 0) {
      return Response.json({ error: 'No quotes with customer email in draft/sent status' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('quotes')
      .update({ status: 'sent', sent_at: now })
      .in('id', sendable.map(q => q.id));

    if (updateErr) {
      return Response.json({ error: updateErr.message }, { status: 500 });
    }

    // Send emails in background (best effort)
    const { data: detailer } = await supabase
      .from('detailers')
      .select('id, name, email, phone, company, plan')
      .eq('id', user.id)
      .single();

    let emailsSent = 0;
    for (const q of sendable) {
      try {
        await sendQuoteSentEmail({ quote: q, detailer });
        emailsSent++;
      } catch (e) {
        console.error(`Bulk send email failed for ${q.id}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      action: 'send',
      updated: sendable.length,
      emailsSent,
    });
  }

  // --- EXPIRE ---
  if (action === 'expire') {
    const { error: updateErr } = await supabase
      .from('quotes')
      .update({ status: 'expired' })
      .in('id', validIds);

    if (updateErr) {
      return Response.json({ error: updateErr.message }, { status: 500 });
    }

    return Response.json({ success: true, action: 'expire', updated: validIds.length });
  }

  // --- DELETE ---
  if (action === 'delete') {
    const { error: deleteErr } = await supabase
      .from('quotes')
      .delete()
      .in('id', validIds);

    if (deleteErr) {
      return Response.json({ error: deleteErr.message }, { status: 500 });
    }

    return Response.json({ success: true, action: 'delete', deleted: validIds.length });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
