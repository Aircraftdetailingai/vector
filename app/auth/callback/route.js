import { createClient } from '@supabase/supabase-js';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

const ADMIN_EMAILS = ['brett@vectorav.ai', 'admin@vectorav.ai', 'brett@shinyjets.com'];

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // Exchange code for session using Supabase Auth (with anon key for PKCE)
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: sessionData, error: sessionError } = await authClient.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData?.user) {
      console.error('[auth/callback] session error:', sessionError?.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const oauthUser = sessionData.user;
    const email = oauthUser.email?.toLowerCase();
    const fullName = oauthUser.user_metadata?.full_name || oauthUser.user_metadata?.name || email?.split('@')[0] || '';

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=no_email`);
    }

    const supabase = getSupabase();

    // Check if detailer record exists
    const { data: existing } = await supabase
      .from('detailers')
      .select('*')
      .eq('email', email)
      .single();

    let detailer;

    if (existing) {
      detailer = existing;
    } else {
      // Create new detailer record for social signup
      const { data: newDetailer, error: createError } = await supabase
        .from('detailers')
        .insert({
          email,
          name: fullName,
          company: '',
          plan: 'free',
          status: 'active',
          onboarding_complete: false,
          oauth_provider: oauthUser.app_metadata?.provider || 'google',
          oauth_id: oauthUser.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('[auth/callback] create detailer error:', createError.message);
        return NextResponse.redirect(`${origin}/login?error=account_creation_failed`);
      }
      detailer = newDetailer;
    }

    // Issue our custom JWT
    const token = await createToken({ id: detailer.id, email: detailer.email });

    // Set auth cookie
    try {
      const cookieStore = await cookies();
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    } catch {}

    const isAdmin = ADMIN_EMAILS.includes(detailer.email?.toLowerCase());
    const user = {
      id: detailer.id,
      email: detailer.email,
      name: detailer.name,
      phone: detailer.phone,
      company: detailer.company,
      plan: isAdmin ? 'enterprise' : (detailer.plan || 'free'),
      is_admin: isAdmin,
      status: detailer.status,
      theme_primary: detailer.theme_primary || '#C9A84C',
      portal_theme: detailer.portal_theme || 'dark',
      theme_logo_url: detailer.theme_logo_url || null,
      terms_accepted_version: detailer.terms_accepted_version || null,
    };

    // Redirect to a client page that stores the token and redirects
    const redirectTo = detailer.onboarding_complete === false ? '/onboarding' : '/dashboard';
    const encodedToken = encodeURIComponent(token);
    const encodedUser = encodeURIComponent(JSON.stringify(user));

    return NextResponse.redirect(
      `${origin}/auth/complete?token=${encodedToken}&user=${encodedUser}&redirect=${redirectTo}`
    );
  } catch (err) {
    console.error('[auth/callback] error:', err.message);
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }
}
