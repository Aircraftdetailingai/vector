import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || '+16194384972';

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  console.log('=== SMS TEST ===');
  console.log('SID:', sid);
  console.log('FROM:', from);
  console.log('TO:', to);

  // Check credentials exist
  if (!sid) return NextResponse.json({ error: 'TWILIO_ACCOUNT_SID missing' }, { status: 500 });
  if (!token) return NextResponse.json({ error: 'TWILIO_AUTH_TOKEN missing' }, { status: 500 });
  if (!from) return NextResponse.json({ error: 'TWILIO_PHONE_NUMBER missing' }, { status: 500 });

  // Format phone number
  let phone = to.replace(/\D/g, '');
  if (phone.length === 10) phone = '1' + phone;
  if (!phone.startsWith('+')) phone = '+' + phone;

  // Format from number
  let fromFormatted = from.replace(/\D/g, '');
  if (fromFormatted.length === 10) fromFormatted = '1' + fromFormatted;
  if (!fromFormatted.startsWith('+')) fromFormatted = '+' + fromFormatted;

  try {
    // Direct Twilio REST API call - no SDK, no helpers
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const basicAuth = Buffer.from(`${sid}:${token}`).toString('base64');

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromFormatted,
        To: phone,
        Body: 'Vector CRM Test - If you see this, SMS is working!',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('=== SMS ERROR ===', data.message, data.code);
      return NextResponse.json({
        error: data.message,
        code: data.code,
        status: response.status,
        to: phone,
        from: fromFormatted,
        sidPrefix: sid?.slice(0, 6),
      }, { status: 500 });
    }

    console.log('=== SMS SENT ===', data.sid);
    return NextResponse.json({
      success: true,
      sid: data.sid,
      to: phone,
      from: fromFormatted,
      twilioStatus: data.status,
    });
  } catch (error) {
    console.error('=== SMS EXCEPTION ===', error.message);
    return NextResponse.json({
      error: error.message,
      to: phone,
      from: fromFormatted,
    }, { status: 500 });
  }
}
