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

  console.log('[auth/callback] START — code present:', !!code);

  if (!code) {
    console.log('[auth/callback] FAIL — no code in URL params');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // Step 1: Exchange code for session using Supabase Auth
    console.log('[auth/callback] Step 1: Exchanging code for session...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[auth/callback] Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.log('[auth/callback] Anon key:', supabaseAnonKey ? 'SET' : 'MISSING');

    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: sessionData, error: sessionError } = await authClient.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('[auth/callback] FAIL — session exchange error:', sessionError.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (!sessionData?.user) {
      console.error('[auth/callback] FAIL — no user in session data');
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    // Step 2: Extract user info
    const oauthUser = sessionData.user;
    const email = oauthUser.email?.toLowerCase()?.trim();
    const fullName = oauthUser.user_metadata?.full_name || oauthUser.user_metadata?.name || email?.split('@')[0] || '';
    const provider = oauthUser.app_metadata?.provider || 'unknown';

    console.log('[auth/callback] Step 2: OAuth user -', { email, fullName, provider, authId: oauthUser.id });

    if (!email) {
      console.error('[auth/callback] FAIL — no email from OAuth provider');
      return NextResponse.redirect(`${origin}/login?error=no_email`);
    }

    // Step 3: Check if detailer record exists
    console.log('[auth/callback] Step 3: Looking up detailer by email:', email);
    const supabase = getSupabase();

    const { data: existing, error: lookupError } = await supabase
      .from('detailers')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('[auth/callback] Detailer lookup error:', lookupError.message);
    }

    let detailer;
    let isNewUser = false;

    if (existing) {
      console.log('[auth/callback] Step 3: FOUND existing detailer:', { id: existing.id, plan: existing.plan, onboarding_completed: existing.onboarding_completed, onboarding_complete: existing.onboarding_complete });
      detailer = existing;

      // Update OAuth fields if not set
      if (!existing.oauth_provider || !existing.oauth_id) {
        await supabase.from('detailers').update({
          oauth_provider: provider,
          oauth_id: oauthUser.id,
        }).eq('id', existing.id);
        console.log('[auth/callback] Updated OAuth fields on existing detailer');
      }
    } else {
      // Step 4: Create new detailer record
      console.log('[auth/callback] Step 4: No detailer found, creating new record...');
      isNewUser = true;

      const { data: newDetailer, error: createError } = await supabase
        .from('detailers')
        .insert({
          email,
          name: fullName,
          company: '',
          plan: 'free',
          status: 'active',
          onboarding_completed: false,
          onboarding_complete: false,
          oauth_provider: provider,
          oauth_id: oauthUser.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('[auth/callback] FAIL — create detailer error:', createError.message, createError.details, createError.hint);
        return NextResponse.redirect(`${origin}/login?error=account_creation_failed`);
      }

      console.log('[auth/callback] Step 4: Created new detailer:', { id: newDetailer.id, email: newDetailer.email });
      detailer = newDetailer;
    }

    // Step 5: Issue JWT
    console.log('[auth/callback] Step 5: Issuing JWT for detailer:', detailer.id);
    const token = await createToken({ id: detailer.id, email: detailer.email });

    if (!token) {
      console.error('[auth/callback] FAIL — createToken returned null/undefined');
      return NextResponse.redirect(`${origin}/login?error=server_error`);
    }
    console.log('[auth/callback] Step 5: JWT created, length:', token.length);

    // Step 6: Set auth cookie
    try {
      const cookieStore = await cookies();
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      console.log('[auth/callback] Step 6: Cookie set');
    } catch (cookieErr) {
      console.error('[auth/callback] Cookie set failed:', cookieErr.message);
    }

    // Step 7: Build user object for client
    const isAdmin = ADMIN_EMAILS.includes(detailer.email?.toLowerCase());
    const onboardingDone = detailer.onboarding_completed === true || detailer.onboarding_complete === true;

    const user = {
      id: detailer.id,
      email: detailer.email,
      name: detailer.name,
      phone: detailer.phone || null,
      company: detailer.company || '',
      plan: isAdmin ? 'enterprise' : (detailer.plan || 'free'),
      is_admin: isAdmin,
      status: detailer.status || 'active',
      theme_primary: detailer.theme_primary || '#007CB1',
      portal_theme: detailer.portal_theme || 'dark',
      theme_logo_url: detailer.theme_logo_url || null,
      terms_accepted_version: detailer.terms_accepted_version || null,
    };

    // Step 8: Determine redirect
    const redirectTo = isNewUser || !onboardingDone ? '/onboarding' : '/dashboard';
    console.log('[auth/callback] Step 8: Redirect →', redirectTo, { isNewUser, onboardingDone, isAdmin });

    const encodedToken = encodeURIComponent(token);
    const encodedUser = encodeURIComponent(JSON.stringify(user));

    const redirectUrl = `${origin}/auth/complete?token=${encodedToken}&user=${encodedUser}&redirect=${redirectTo}`;
    console.log('[auth/callback] DONE — redirecting to /auth/complete');

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('[auth/callback] UNEXPECTED ERROR:', err.message, err.stack);
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }
}
