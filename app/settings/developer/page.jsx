"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DEVELOPER_LINKS = [
  { href: '/settings/embed', title: 'Embed & QR', desc: 'Embeddable quote widget and QR codes for your shop.' },
  { href: '/settings/intake-flow', title: 'AI Lead Intake', desc: 'Configure the AI-assisted lead qualification flow.' },
  { href: '/settings/import', title: 'Import / Export', desc: 'Bulk import customers, services, and historical jobs.' },
];

export default function DeveloperPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vector_user');
      const u = stored ? JSON.parse(stored) : null;
      if (u?.is_admin) setAllowed(true);
      else setAllowed(false);
    } catch {
      setAllowed(false);
    }
  }, []);

  if (allowed === null) {
    return <div className="p-4 text-v-text-secondary">Loading...</div>;
  }
  if (!allowed) {
    // Task: non-admins get 404
    if (typeof window !== 'undefined') {
      router.replace('/404');
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-medium uppercase tracking-widest text-v-gold pb-2 border-b border-v-gold/20">Developer</h2>
      <p className="text-xs text-v-text-secondary">Admin-only tools and configuration.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEVELOPER_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="block border border-v-border p-4 hover:bg-white/5 transition-colors"
          >
            <h3 className="text-sm font-semibold text-v-text-primary mb-1">{link.title}</h3>
            <p className="text-xs text-v-text-secondary">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
