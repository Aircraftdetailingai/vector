"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { formatPrice, currencySymbol } from '@/lib/formatPrice';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) { router.push('/login'); return; }
    fetchJob(token);
  }, [jobId]);

  const fetchJob = async (token) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`/api/quotes/${jobId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setJob(data);

      const mediaRes = await fetch(`/api/job-media?quote_id=${jobId}`, { headers });
      if (mediaRes.ok) {
        const media = await mediaRes.json();
        setBeforePhotos(media.beforeMedia || []);
        setAfterPhotos(media.afterMedia || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/jobs/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ job_id: jobId, status }),
      });
      if (res.ok) {
        await fetchJob(token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const statusColors = {
    paid: 'bg-green-500/20 text-green-400',
    accepted: 'bg-blue-500/20 text-blue-400',
    approved: 'bg-blue-500/20 text-blue-400',
    scheduled: 'bg-purple-500/20 text-purple-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
  };

  if (loading) return <AppShell title="Job"><div className="p-8 text-v-text-secondary">Loading...</div></AppShell>;
  if (!job) return <AppShell title="Job"><div className="p-8 text-red-400">Job not found</div></AppShell>;

  const isScheduled = ['paid', 'accepted', 'approved', 'scheduled'].includes(job.status);
  const isInProgress = job.status === 'in_progress';
  const isCompleted = job.status === 'completed';

  return (
    <AppShell title={`Job — ${job.tail_number || job.aircraft_model || 'Detail'}`}>
    <div className="px-6 md:px-10 py-8 pb-40 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/jobs')} className="text-sm text-v-text-secondary hover:text-v-text-primary mb-2 block">&larr; Back to Jobs</button>
          <h1 className="font-heading text-2xl text-v-text-primary">
            {job.aircraft_model || 'Aircraft Detail'}
            {job.tail_number && <span className="text-v-text-secondary ml-2 text-lg">{job.tail_number}</span>}
          </h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-500/20 text-gray-400'}`}>
          {(job.status || '').replace('_', ' ')}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-v-surface border border-v-border rounded-lg p-4">
          <p className="text-xs text-v-text-secondary">Customer</p>
          <p className="text-v-text-primary font-medium mt-1">{job.client_name || job.customer_company || '—'}</p>
        </div>
        <div className="bg-v-surface border border-v-border rounded-lg p-4">
          <p className="text-xs text-v-text-secondary">Value</p>
          <p className="text-v-text-primary font-medium mt-1">{currencySymbol()}{formatPrice(job.total_price)}</p>
        </div>
        <div className="bg-v-surface border border-v-border rounded-lg p-4">
          <p className="text-xs text-v-text-secondary">Scheduled</p>
          <p className="text-v-text-primary font-medium mt-1">
            {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="bg-v-surface border border-v-border rounded-lg p-4">
          <p className="text-xs text-v-text-secondary">Location</p>
          <p className="text-v-text-primary font-medium mt-1">{job.job_location || '—'}</p>
        </div>
      </div>

      {/* Services */}
      {job.services && job.services.length > 0 && (
        <div className="bg-v-surface border border-v-border rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-v-text-secondary mb-3">Services</h3>
          <div className="space-y-2">
            {job.services.map((svc, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-v-text-primary">{svc.name || svc.service_name}</span>
                <span className="text-v-text-secondary">{currencySymbol()}{formatPrice(svc.price || svc.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 mb-8">
        {isScheduled && (
          <div className="bg-v-surface border border-v-border rounded-lg p-6 text-center">
            <p className="text-v-text-secondary text-sm mb-4">Ready to start this job? Take pre-job photos first.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push(`/jobs/${jobId}/photos`)}
                className="px-6 py-3 bg-v-gold/20 text-v-gold border border-v-gold/30 rounded-lg font-medium hover:bg-v-gold/30 transition-colors"
              >
                Take Pre-Job Photos
              </button>
              <button
                onClick={() => updateStatus('in_progress')}
                disabled={updating}
                className="px-6 py-3 bg-v-gold text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updating ? 'Starting...' : 'Start Job'}
              </button>
            </div>
          </div>
        )}

        {isInProgress && (
          <div className="bg-v-surface border border-yellow-500/30 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <p className="text-yellow-400 font-medium">Job In Progress</p>
            </div>
            <p className="text-v-text-secondary text-sm mb-4">
              Started {job.started_at ? new Date(job.started_at).toLocaleString() : 'just now'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push(`/jobs/${jobId}/photos`)}
                className="px-6 py-3 bg-v-gold/20 text-v-gold border border-v-gold/30 rounded-lg font-medium hover:bg-v-gold/30 transition-colors"
              >
                Add Photos
              </button>
              <button
                onClick={() => router.push(`/jobs/${jobId}/log-products`)}
                className="px-6 py-3 bg-white/10 text-v-text-primary border border-v-border rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                Log Products
              </button>
              <button
                onClick={() => {
                  router.push(`/jobs/${jobId}/photos?mode=after`);
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Complete Job
              </button>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="bg-v-surface border border-green-500/30 rounded-lg p-6 text-center">
            <p className="text-green-400 font-medium mb-2">Job Completed</p>
            <p className="text-v-text-secondary text-sm">
              {job.completed_at ? `Completed on ${new Date(job.completed_at).toLocaleString()}` : 'Marked as complete'}
            </p>
          </div>
        )}
      </div>

      {/* Before/After Photos */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-v-text-secondary uppercase tracking-wider">Photos</h3>
            <button
              onClick={() => router.push(`/jobs/${jobId}/photos`)}
              className="text-xs text-v-gold hover:underline"
            >
              View All / Add More
            </button>
          </div>

          {beforePhotos.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-v-text-secondary mb-2">Before ({beforePhotos.length})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {beforePhotos.slice(0, 8).map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-v-charcoal">
                    <img src={photo.url} alt="Before" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {afterPhotos.length > 0 && (
            <div>
              <p className="text-xs text-v-text-secondary mb-2">After ({afterPhotos.length})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {afterPhotos.slice(0, 8).map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-v-charcoal">
                    <img src={photo.url} alt="After" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button onClick={() => router.push(`/jobs/${jobId}/photos`)} className="bg-v-surface border border-v-border rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
          <p className="text-lg mb-1">&#128247;</p>
          <p className="text-sm text-v-text-primary">Photos</p>
          <p className="text-xs text-v-text-secondary">{beforePhotos.length + afterPhotos.length} uploaded</p>
        </button>
        <button onClick={() => router.push(`/jobs/${jobId}/log-products`)} className="bg-v-surface border border-v-border rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
          <p className="text-lg mb-1">&#128230;</p>
          <p className="text-sm text-v-text-primary">Products</p>
          <p className="text-xs text-v-text-secondary">Log usage</p>
        </button>
        {job.tail_number && (
          <button onClick={() => router.push(`/aircraft/${encodeURIComponent(job.tail_number)}`)} className="bg-v-surface border border-v-border rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
            <p className="text-lg mb-1">&#9992;</p>
            <p className="text-sm text-v-text-primary">{job.tail_number}</p>
            <p className="text-xs text-v-text-secondary">Aircraft history</p>
          </button>
        )}
      </div>
    </div>
    </AppShell>
  );
}
