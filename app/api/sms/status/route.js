import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const sid = url.searchParams.get('sid');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Missing Twilio credentials' }, { status: 500 });
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    if (sid) {
      // Check specific message
      const message = await client.messages(sid).fetch();
      return NextResponse.json({
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        to: message.to,
        from: message.from,
        dateSent: message.dateSent
      });
    } else {
      // Get recent messages
      const messages = await client.messages.list({ limit: 5 });
      return NextResponse.json({
        messages: messages.map(m => ({
          sid: m.sid,
          status: m.status,
          errorCode: m.errorCode,
          errorMessage: m.errorMessage,
          to: m.to,
          direction: m.direction,
          dateSent: m.dateSent
        }))
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
