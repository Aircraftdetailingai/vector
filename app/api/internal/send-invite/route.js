import { sendBetaInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// One-time endpoint to send a specific beta invite email
// DELETE THIS FILE AFTER USE
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'send-invite-2024-temp') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendBetaInviteEmail({
    email: 'brettberry@gmail.com',
    plan: 'pro',
    durationDays: 180,
    note: null,
    token: '5ce94cd1-fd9f-4696-b2ef-b413d9946eb4',
  });

  return Response.json({ success: result.success, id: result.id, error: result.error });
}
