"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { formatPrice, currencySymbol } from '@/lib/formatPrice';

export default function AircraftDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tailNumber = decodeURIComponent(params.tailNumber);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) { router.push('/login'); return; }

    fetch(`/api/aircraft/${encodeURIComponent(tailNumber)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tailNumber]);

  if (loading) return <AppShell title="Aircraft"><div className="p-8 text-v-text-secondary">Loading...</div></AppShell>;
  if (!data) return <AppShell title="Aircraft"><div className="p-8 text-red-400">Aircraft not found</div></AppShell>;

  const beforePhotos = data.photos.filter(p => p.media_type === 'before_photo');
  const afterPhotos = data.photos.filter(p => p.media_type === 'after_photo');

  // Group photos by job
  const photosByJob = {};
  data.photos.forEach(p => {
    if (!photosByJob[p.quote_id]) photosByJob[p.quote_id] = { before: [], after: [] };
    if (p.media_type === 'before_photo') photosByJob[p.quote_id].before.push(p);
    else photosByJob[p.quote_id].after.push(p);
  });

  return (
    <AppShell title={`Aircraft — ${tailNumber}`}>
    <div className="px-6 md:px-10 py-8 pb-40 max-w-5xl">
      {/* Header */}
      <button onClick={() => router.back()} className="text-sm text-v-text-secondary hover:text-v-text-primary mb-4 block">&larr; Back</button>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-lg bg-v-gold/20 flex items-center justify-center text-2xl">&#9992;</div>
        <div>
          <h1 className="font-heading text-2xl text-v-text-primary">{tailNumber}</h1>
          <p className="text-v-text-secondary">{data.aircraft_model || 'Aircraft'} &middot; {data.customer || ''}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-v-surface border border-v-border rounded-lg p-4 text-center">
          <p className="text-xs text-v-text-secondary">Total Jobs</p>
          <p className="text-2xl font-bold text-v-text-primary mt-1">{data.job_count}</p>
        </div>
        <div className="bg-v-surface border border-v-border rounded-lg p-4 text-center">
          <p className="text-xs text-v-text-secondary">Total Revenue</p>
          <p className="text-2xl font-bold text-v-gold mt-1">{currencySymbol()}{formatPrice(data.total_revenue)}</p>
        </div>
        <div className="bg-v-surface border border-v-border rounded-lg p-4 text-center">
          <p className="text-xs text-v-text-secondary">Photos</p>
          <p className="text-2xl font-bold text-v-text-primary mt-1">{data.photos.length}</p>
        </div>
        <div className="bg-v-surface border border-v-border rounded-lg p-4 text-center">
          <p className="text-xs text-v-text-secondary">Last Service</p>
          <p className="text-lg font-medium text-v-text-primary mt-1">
            {data.last_service ? new Date(data.last_service).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      {/* Before/After Gallery */}
      {data.photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-v-text-secondary uppercase tracking-wider mb-4">Before & After Gallery</h2>
          {Object.entries(photosByJob).map(([jobId, photos]) => {
            const job = data.jobs.find(j => j.id === jobId);
            if (!photos.before.length && !photos.after.length) return null;
            return (
              <div key={jobId} className="mb-6">
                <p className="text-xs text-v-text-secondary mb-2">
                  {job?.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : ''} &middot; {job?.services?.map(s => s.service_name).join(', ') || 'Detail'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {photos.before.slice(0, 4).map((b, i) => {
                    const a = photos.after[i];
                    return (
                      <div key={b.id} className="grid grid-cols-2 gap-1 col-span-2 sm:col-span-1">
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-v-charcoal">
                          <img src={b.url} alt="Before" className="w-full h-full object-cover" />
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] bg-black/60 text-white rounded">BEFORE</span>
                        </div>
                        {a ? (
                          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-v-charcoal">
                            <img src={a.url} alt="After" className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] bg-green-600/80 text-white rounded">AFTER</span>
                          </div>
                        ) : <div className="aspect-[4/3] rounded-lg bg-v-charcoal flex items-center justify-center text-v-text-secondary text-xs">No after photo</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Service History Timeline */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-v-text-secondary uppercase tracking-wider mb-4">Service History</h2>
        <div className="space-y-3">
          {data.jobs.map(job => {
            const statusColor = job.status === 'completed' ? 'bg-green-500' : job.status === 'in_progress' ? 'bg-yellow-500' : 'bg-blue-500';
            return (
              <div
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="flex items-center gap-4 bg-v-surface border border-v-border rounded-lg p-4 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${statusColor} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-v-text-primary font-medium">
                    {job.services?.map(s => s.service_name).join(', ') || 'Detail Service'}
                  </p>
                  <p className="text-xs text-v-text-secondary">
                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : new Date(job.created_at).toLocaleDateString()}
                    {job.completed_at && ` — Completed ${new Date(job.completed_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-v-gold font-medium">{currencySymbol()}{formatPrice(job.total_price)}</p>
                  <p className="text-xs text-v-text-secondary capitalize">{(job.status || '').replace('_', ' ')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </AppShell>
  );
}
