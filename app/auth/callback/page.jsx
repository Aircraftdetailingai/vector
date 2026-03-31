'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in...');
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      console.log('[auth/callback] START — URL:', window.location.href);

      const supabase = getSupabaseBrowser();
      if (!supabase) {
        console.error('[auth/callback] FAIL — no Supabase client');
        window.location.href = '/login?error=auth_failed&message=' + encodeURIComponent('Supabase client not available');
        return;
      }

      // Step 1: Exchange the OAuth code for a session
      // With PKCE flow, the code is in the URL query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const hashParams = new URLSearchParams(window.location.hash?.replace('#', ''));
      const accessToken = hashParams.get('access_token');

      console.log('[auth/callback] code:', code ? 'present' : 'missing', 'hash token:', accessToken ? 'present' : 'missing');

      let user = null;

      if (code) {
        // PKCE flow — exchange code for session
        console.log('[auth/callback] Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[auth/callback] Code exchange error:', error.message);
          // Code may already be consumed — try getSession as fallback
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            console.log('[auth/callback] Fallback getSession succeeded');
            user = sessionData.session.user;
          } else {
            window.location.href = '/login?error=auth_failed&message=' + encodeURIComponent('Code exchange failed: ' + error.message);
            return;
          }
        } else {
          user = data?.session?.user;
        }
      } else if (accessToken) {
        // Implicit flow fallback
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user;
      } else {
        // No code and no token — try existing session
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user;
      }

      if (!user) {
        console.error('[auth/callback] No user after all exchange attempts');
        window.location.href = '/login?error=auth_failed&message=' + encodeURIComponent('No user session after OAuth');
        return;
      }

      console.log('[auth/callback] Got user:', user.email);
      await finishLogin(user);
    } catch (err) {
      console.error('[auth/callback] Unexpected error:', err);
      window.location.href = '/login?error=server_error&message=' + encodeURIComponent(err.message);
    }
  }

  async function finishLogin(oauthUser) {
    const email = oauthUser.email?.toLowerCase()?.trim();
    const fullName = oauthUser.user_metadata?.full_name || oauthUser.user_metadata?.name || email?.split('@')[0] || '';
    const provider = oauthUser.app_metadata?.provider || 'google';

    console.log('[auth/callback] finishLogin:', { email, fullName, provider, oauthUserId: oauthUser.id });
    setStatus('Setting up your account...');

    if (!email) {
      window.location.href = '/login?error=no_email';
      return;
    }

    // Call our API to handle detailer lookup/creation and JWT issuance
    try {
      const res = await fetch('/api/auth/oauth-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: fullName,
          provider,
          oauth_id: oauthUser.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[auth/callback] oauth-complete failed:', res.status, data);
        const errMsg = encodeURIComponent(data.error || `API returned ${res.status}`);
        window.location.href = `/login?error=oauth_error&message=${errMsg}`;
        return;
      }

      if (!data.token) {
        console.error('[auth/callback] No token in response:', data);
        window.location.href = '/login?error=oauth_error&message=' + encodeURIComponent('No auth token received');
        return;
      }

      console.log('[auth/callback] Got token, storing auth...');

      // Store token in localStorage
      localStorage.setItem('vector_token', data.token);
      localStorage.setItem('vector_user', JSON.stringify(data.user));

      // Also set as cookie for middleware/SSR
      document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

      // Small delay to ensure storage is persisted before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify storage was set
      const storedToken = localStorage.getItem('vector_token');
      console.log('[auth/callback] Storage verified:', storedToken ? 'token present' : 'MISSING');

      // Hard redirect (not router.replace) to ensure fresh page load reads localStorage
      const dest = data.redirect || '/dashboard';
      console.log('[auth/callback] SUCCESS — hard redirecting to:', dest);
      window.location.href = dest;
    } catch (fetchErr) {
      console.error('[auth/callback] fetch error:', fetchErr);
      window.location.href = '/login?error=server_error&message=' + encodeURIComponent('Network error: ' + fetchErr.message);
    }
  }

  return (
    <div className="min-h-screen bg-v-charcoal flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-v-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-v-text-secondary text-sm">{status}</p>
        {errorDetail && (
          <p className="text-red-400 text-xs mt-2 max-w-md">{errorDetail}</p>
        )}
      </div>
    </div>
  );
}
