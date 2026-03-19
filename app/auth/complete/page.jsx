"use client";
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function CompleteAuth() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get('token');
    const user = params.get('user');
    const redirect = params.get('redirect') || '/dashboard';

    if (token && user) {
      try {
        localStorage.setItem('vector_token', token);
        localStorage.setItem('vector_user', user);
      } catch {}
      router.replace(redirect);
    } else {
      router.replace('/login?error=missing_token');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-v-charcoal flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-v-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-v-text-secondary text-sm">Signing you in...</p>
      </div>
    </div>
  );
}

export default function CompleteAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-v-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-v-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CompleteAuth />
    </Suspense>
  );
}
