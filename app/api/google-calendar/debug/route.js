import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || null;
  const envRedirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || null;
  const clientId = process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 20)}...` : null;
  const hasSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const origin = request.headers.get('origin') || null;

  const derivedRedirectUri = envRedirectUri || (appUrl ? `${appUrl}/api/google-calendar/callback` : `${origin}/api/google-calendar/callback`);

  return Response.json({
    NEXT_PUBLIC_APP_URL: appUrl,
    GOOGLE_CALENDAR_REDIRECT_URI: envRedirectUri,
    GOOGLE_CLIENT_ID_prefix: clientId,
    GOOGLE_CLIENT_SECRET_set: hasSecret,
    request_origin: origin,
    derived_redirect_uri: derivedRedirectUri,
    expected_redirect_uri: 'https://crm.shinyjets.com/api/google-calendar/callback',
    match: derivedRedirectUri === 'https://crm.shinyjets.com/api/google-calendar/callback',
  });
}
