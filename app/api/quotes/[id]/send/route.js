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

  // Update quote with client info and status - retry stripping unknown columns
  const now = new Date().toISOString();
  let updateFields = {
    customer_name: clientName,
    customer_email: clientEmail,
    customer_phone: clientPhone,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    status: 'sent',
    sent_at: now,
    viewed_at: null,
    view_count: 0,
    last_viewed_at: null,
  };

  let updated = null;
  let updErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .from('quotes')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();
    updated = result.data;
    updErr = result.error;

    if (!updErr) break;

    const colMatch = updErr.message?.match(/column "([^"]+)" of relation "quotes" does not exist/);
    if (colMatch) {
      console.log(`Quote send: stripping unknown column "${colMatch[1]}", retrying...`);
      delete updateFields[colMatch[1]];
      continue;
    }
    break;
  }

  if (updErr) {
    console.error('Quote send update error:', updErr);
    return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
  }

  // Fetch detailer info for email
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id, name, email, phone, company, plan, notification_settings')
    .eq('id', user.id)
    .single();

  // Use request origin for the quote link (works in both dev and prod)
  const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://app.vectorav.ai';
  const quoteLink = `${origin}/q/${quote.share_link}`;
  let emailSent = false;
  let emailError = null;
  let smsSent = false;

  // Send email to customer
  if (clientEmail) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('placeholder')) {
      console.error('RESEND_API_KEY not configured - cannot send email');
      emailError = 'Email service not configured (RESEND_API_KEY missing)';
    } else {
      try {
        const result = await sendQuoteSentEmail({
          quote: { ...updated, share_link: quote.share_link, client_email: clientEmail },
          detailer,
        });
        emailSent = result.success;
        if (!result.success) emailError = result.error;
        console.log('Quote sent email result:', JSON.stringify(result));
      } catch (e) {
        console.error('Failed to send quote email:', e);
        emailError = e.message;
      }
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
    emailError: emailError || undefined,
    smsSent,
  }), { status: 200 });
}
