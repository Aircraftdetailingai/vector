import { getAuthUser } from '@/lib/auth';
import { getAuthorizationUrl } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return Response.json({ configured: false, error: 'Google Calendar OAuth is not configured yet' });
  }

  if (!process.env.GOOGLE_CALENDAR_REDIRECT_URI) {
    return Response.json({ configured: false, error: 'Google Calendar redirect URI is not configured' });
  }

  const url = getAuthorizationUrl(user.id);
  return Response.json({ configured: true, url });
}
