import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendQuoteSentEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// Get user from either cookie or Authorization header
async function getUser(request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_token')?.value;
  if (authCookie) {
    const user = await verifyToken(authCookie);
    if (user) return user;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }

  return null;
}

export async function POST(request, { params }) {
  const supabase = getSupabase();

  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  const { clientName, clientPhone, clientEmail } = await request.json();

  // Fetch the quote
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (qErr || !quote) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }

  if (quote.detailer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Update quote with client info and status
  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from('quotes')
    .update({
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      status: 'sent',
      sent_at: now,
      // Reset view tracking for resends
      viewed_at: null,
      view_count: 0,
      last_viewed_at: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (updErr) {
    return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
  }

  // Fetch detailer info for email
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id, name, email, phone, company, plan, notification_settings')
    .eq('id', user.id)
    .single();

  const quoteLink = `https://app.aircraftdetailing.ai/q/${quote.share_link}`;
  let emailSent = false;
  let smsSent = false;

  // Send email to customer
  if (clientEmail) {
    try {
      const result = await sendQuoteSentEmail({
        quote: { ...updated, share_link: quote.share_link },
        detailer,
      });
      emailSent = result.success;
      console.log('Quote sent email result:', result);
    } catch (e) {
      console.error('Failed to send quote email:', e);
    }
  }

  // Send SMS for business plan
  if (detailer?.plan === 'business' && clientPhone) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;

      if (accountSid && authToken && fromNumber) {
        const bodyParams = new URLSearchParams({
          From: fromNumber,
          To: clientPhone,
          Body: `Your aircraft detailing quote is ready! View and pay here: ${quoteLink}`
        }).toString();

        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
          },
          body: bodyParams
        });

        smsSent = true;

        // Schedule follow-ups
        const followups = [];
        const threeDay = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        followups.push({ quote_id: id, client_phone: clientPhone, followup_type: '3day', scheduled_for: threeDay });

        const settings = detailer.notification_settings || {};
        if (!settings.disable7day) {
          const sevenDay = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          followups.push({ quote_id: id, client_phone: clientPhone, followup_type: '7day', scheduled_for: sevenDay });
        }

        await supabase.from('scheduled_followups').insert(followups);
      }
    } catch (e) {
      console.error('SMS send error:', e);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    quoteLink,
    emailSent,
    smsSent,
  }), { status: 200 });
}
