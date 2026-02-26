import { getAuthUser } from '@/lib/auth';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['brett@aircraftdetailing.ai', 'admin@aircraftdetailing.ai', 'brett@shinyjets.com'];

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const { to } = await request.json();
  if (!to) {
    return Response.json({ error: 'Phone number required in "to" field' }, { status: 400 });
  }

  // Diagnostic info
  const diag = {
    hasSid: !!process.env.TWILIO_ACCOUNT_SID,
    sidPrefix: process.env.TWILIO_ACCOUNT_SID?.slice(0, 6) || 'MISSING',
    hasToken: !!process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER || 'MISSING',
  };

  console.log('SMS test diagnostic:', JSON.stringify(diag));

  const result = await sendSms({
    to,
    body: 'Vector SMS test - if you receive this, Twilio is working correctly.',
  });

  return Response.json({ ...result, diagnostic: diag });
}
