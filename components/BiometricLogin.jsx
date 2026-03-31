"use client";
import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

export default function BiometricLogin({ email, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get authentication options
      const optRes = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        throw new Error(d.error || 'Failed to get options');
      }
      const options = await optRes.json();

      // Trigger biometric prompt
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify with server
      const verRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credential }),
      });
      const result = await verRes.json();
      if (!verRes.ok) throw new Error(result.error || 'Verification failed');

      onSuccess(result);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric prompt cancelled');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBiometricLogin}
        disabled={loading || !email}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-colors bg-v-surface border border-v-border hover:border-v-gold text-v-text-primary disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-v-gold border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 10v4m0 0v.01M7.5 8.5C8.5 6.5 10 5.5 12 5.5s3.5 1 4.5 3M6 11c0-3.3 2.7-6 6-6s6 2.7 6 6M4.5 13.5C4.5 9.4 7.9 6 12 6s7.5 3.4 7.5 7.5" strokeLinecap="round"/>
          </svg>
        )}
        <span>{loading ? 'Verifying...' : 'Sign in with Face ID / Fingerprint'}</span>
      </button>
      {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
    </div>
  );
}
