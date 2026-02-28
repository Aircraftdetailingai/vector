import { getAuthUser } from '@/lib/auth';
import { sendSms, formatPhoneE164 } from '@/lib/sms';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['brett@aircraftdetailing.ai', 'admin@aircraftdetailing.ai', 'brett@shinyjets.com'];

// GET - diagnostic check OR send test SMS with ?send=true&to=+16194384972
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  const diag = {
    hasSid: !!sid,
    sidPrefix: sid?.slice(0, 6) || 'MISSING',
    sidLength: sid?.length || 0,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    fromNumber: from || 'MISSING',
    fromFormatted: formatPhoneE164(from),
  };

  // Verify credentials by calling Twilio's account API (no SMS sent)
  if (sid && token) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { 'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` },
      });
      const data = await res.json();
      diag.twilioStatus = res.status;
      diag.accountStatus = data.status || data.message || 'unknown';
      if (data.friendly_name) diag.accountName = data.friendly_name;
      if (!res.ok) diag.twilioError = data.message;
    } catch (e) {
      diag.twilioStatus = 'fetch_error';
      diag.twilioError = e.message;
    }
  }

  // If ?send=true&to=PHONE, actually send a test SMS (no auth for quick testing)
  const sendFlag = searchParams.get('send');
  const toParam = searchParams.get('to');
  if (sendFlag === 'true' && toParam) {
    const formatted = formatPhoneE164(toParam);
    console.log(`=== SMS TEST SEND === to=${toParam} formatted=${formatted}`);
    const result = await sendSms({
      to: toParam,
      body: 'Vector SMS Test - If you receive this, Twilio is working!',
    });
    return Response.json({ diagnostic: diag, sendResult: result, toFormatted: formatted });
  }

  return Response.json({ diagnostic: diag });
}

// POST - send test SMS (admin auth required)
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const { to } = await request.json();
  if (!to) {
    return Response.json({ error: 'Phone number required in "to" field' }, { status: 400 });
  }

  const diag = {
    hasSid: !!process.env.TWILIO_ACCOUNT_SID,
    sidPrefix: process.env.TWILIO_ACCOUNT_SID?.slice(0, 6) || 'MISSING',
    hasToken: !!process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER || 'MISSING',
    toRaw: to,
    toFormatted: formatPhoneE164(to),
  };

  console.log('SMS test diagnostic:', JSON.stringify(diag));

  const result = await sendSms({
    to,
    body: 'Vector SMS test - if you receive this, Twilio is working correctly.',
  });

  return Response.json({ ...result, diagnostic: diag });
}
