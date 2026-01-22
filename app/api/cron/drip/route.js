import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  // Verify CRON_SECRET from Authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  // Fetch pending drip messages
  const { data: messages, error } = await supabase
    .from('drip_messages')
    .select('*')
    .lte('scheduled_for', now)
    .is('sent_at', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;

  for (const message of messages || []) {
    try {
      const { data: detailer, error: detailerError } = await supabase
        .from('detailers')
        .select('*')
        .eq('id', message.detailer_id)
        .single();
      if (detailerError || !detailer) {
        continue;
      }
      const messageId = message.message_id;
      // Skip welcome message
      if (messageId === 'welcome') {
        await supabase.from('drip_messages').update({ sent_at: now }).eq('id', message.id);
        processed++;
        continue;
      }
      // Determine subject and channels
      let subject = '';
      let sendEmail = false;
      let sendSms = false;
      if (messageId === 'day1_quickstart') {
        subject = 'Your first quote in 60 seconds [Video]';
        sendEmail = true;
      } else if (messageId === 'day3_pricing') {
        subject = 'How to set rates that attract high-end clients [Video]';
        sendEmail = true;
      } else if (messageId === 'day5_presentation') {
        subject = 'The script I use when presenting quotes [Video]';
        sendEmail = true;
      } else if (messageId === 'day7_checkin') {
        subject = "How's Vector working for you?";
        sendEmail = true;
        sendSms = true;
      } else {
        await supabase.from('drip_messages').update({ sent_at: now }).eq('id', message.id);
        processed++;
        continue;
      }
      // Send email if required
      if (sendEmail && detailer.email) {
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (resendApiKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'Vector <noreply@vector.com>',
                to: detailer.email,
                subject: subject,
                html: `<p>${subject}</p>`
              })
            });
          }
        } catch (err) {
          // ignore email errors
        }
      }
      // Send SMS if required
      if (sendSms && detailer.phone) {
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const fromNumber = process.env.TWILIO_FROM_NUMBER;
          if (accountSid && authToken && fromNumber) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            const smsBody = "How's Vector working for you?";
            await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                From: fromNumber,
                To: detailer.phone,
                Body: smsBody
              }).toString()
            });
          }
        } catch (err) {
          // ignore SMS errors
        }
      }
      await supabase.from('drip_messages').update({ sent_at: now }).eq('id', message.id);
      processed++;
    } catch (err) {
      await supabase.from('drip_messages').update({ failed_at: now, error: err.message }).eq('id', message.id);
    }
  }
  return new Response(JSON.stringify({ processed }), { status: 200 });
}
