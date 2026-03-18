import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { exchangeCodeForTokens } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const settingsUrl = '/settings/integrations';

  if (error) {
    return Response.redirect(new URL(`${settingsUrl}?gcal=error&message=${encodeURIComponent(error)}`, url.origin));
  }

  if (!code) {
    return Response.redirect(new URL(`${settingsUrl}?gcal=error&message=${encodeURIComponent('No authorization code received')}`, url.origin));
  }

  // Verify user authentication
  let userId;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) throw new Error('Not authenticated');
    const payload = await verifyToken(token);
    userId = payload.id;
  } catch {
    // Try Bearer token from state
    return Response.redirect(new URL(`${settingsUrl}?gcal=error&message=${encodeURIComponent('Authentication required')}`, url.origin));
  }

  // Verify state matches user ID (CSRF protection)
  if (state !== userId) {
    return Response.redirect(new URL(`${settingsUrl}?gcal=error&message=${encodeURIComponent('Invalid state parameter')}`, url.origin));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    // Store connection in database
    const supabase = getSupabase();
    const { error: dbError } = await supabase
      .from('google_calendar_connections')
      .upsert({
        detailer_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      }, { onConflict: 'detailer_id' });

    if (dbError) {
      console.error('Failed to store Google Calendar connection:', dbError);
      return Response.redirect(new URL(`${settingsUrl}?gcal=error&message=${encodeURIComponent('Failed to save connection')}`, url.origin));
    }

    return Response.redirect(new URL(`${settingsUrl}?gcal=success`, url.origin));
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    return Response.redirect(new URL(`${settingsUrl}?gcal=error&message=${encodeURIComponent(err.message)}`, url.origin));
  }
}
