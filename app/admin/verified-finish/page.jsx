"use client";
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';

export default function AdminVerifiedFinishPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [toast, setToast] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('vector_token') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/verified-finish', { headers });
      const data = await res.json();
      if (data.applications) setApplications(data.applications);
    } catch (e) {
      console.error('Failed to fetch applications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchApplications();
  }, [token]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAction = async (detailerId, action) => {
    setActioning(detailerId);
    try {
      const res = await fetch('/api/admin/verified-finish', {
        method: 'POST',
        headers,
        body: JSON.stringify({ detailer_id: detailerId, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Application ${action === 'approve' ? 'approved' : 'denied'}`);
        fetchApplications();
      } else {
        showToast(data.error || 'Action failed');
      }
    } catch {
      showToast('Action failed');
    } finally {
      setActioning(null);
    }
  };

  const parseNotes = (notes) => {
    try {
      return typeof notes === 'string' ? JSON.parse(notes) : notes;
    } catch {
      return null;
    }
  };

  const pending = applications.filter(a => a.verified_finish_status === 'pending');
  const approved = applications.filter(a => a.verified_finish_status === 'approved');
  const expired = applications.filter(a => a.verified_finish_status === 'expired');

  const checklistLabels = {
    equipment: 'Professional-grade equipment',
    chemicals: 'Aviation-approved chemicals only',
    training: 'Formal training completed',
    insurance: 'Adequate insurance coverage',
    experience: '2+ years aviation detailing',
    standards: 'Agrees to quality standards',
  };

  return (
    <AppShell>
      <div className="max-w-4xl space-y-8">
        {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50 text-sm">{toast}</div>}

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-v-text-primary">Verified Finish Applications</h1>
          <span className="text-xs text-v-text-secondary">{pending.length} pending</span>
        </div>

        {loading && <p className="text-v-text-secondary text-sm">Loading...</p>}

        {/* Pending Applications */}
        {pending.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-v-gold pb-2 border-b border-v-gold/20">Pending Review</h2>
            {pending.map(app => {
              const notes = parseNotes(app.verified_finish_notes);
              const isExpanded = expanded === app.id;
              return (
                <div key={app.id} className="bg-v-surface border border-v-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : app.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-v-border/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-v-text-primary">{app.company || app.email}</p>
                      <p className="text-xs text-v-text-secondary">{app.email} &middot; Applied {new Date(app.verified_finish_applied_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-400 font-medium">Pending</span>
                  </button>

                  {isExpanded && notes && (
                    <div className="px-4 pb-4 border-t border-v-border/50 pt-3 space-y-4">
                      {/* Checklist */}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-v-text-secondary mb-2">Checklist</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {Object.entries(checklistLabels).map(([key, label]) => (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className={notes.checklist?.[key] ? 'text-green-400' : 'text-red-400'}>
                                {notes.checklist?.[key] ? '✓' : '✗'}
                              </span>
                              <span className="text-v-text-primary">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Business Description */}
                      {notes.business_description && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-v-text-secondary mb-1">Business Description</p>
                          <p className="text-sm text-v-text-primary bg-v-charcoal/50 rounded p-3">{notes.business_description}</p>
                        </div>
                      )}

                      {/* Portfolio */}
                      {notes.portfolio_urls?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-v-text-secondary mb-1">Portfolio</p>
                          <div className="space-y-1">
                            {notes.portfolio_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-v-gold hover:underline truncate">{url}</a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleAction(app.id, 'approve')}
                          disabled={actioning === app.id}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors"
                        >
                          {actioning === app.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'deny')}
                          disabled={actioning === app.id}
                          className="px-6 py-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && pending.length === 0 && (
          <div className="bg-v-surface border border-v-border rounded-lg p-8 text-center">
            <p className="text-v-text-secondary text-sm">No pending applications</p>
          </div>
        )}

        {/* Approved Detailers */}
        {approved.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-green-400 pb-2 border-b border-green-400/20">Approved ({approved.length})</h2>
            <div className="bg-v-surface border border-v-border rounded-lg divide-y divide-v-border/50">
              {approved.map(app => (
                <div key={app.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-v-text-primary">{app.company || app.email}</p>
                    <p className="text-xs text-v-text-secondary">{app.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded bg-green-500/15 text-green-400 font-medium">Approved</span>
                    {app.verified_finish_expires_at && (
                      <p className="text-[10px] text-v-text-secondary mt-1">Expires {new Date(app.verified_finish_expires_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired */}
        {expired.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-red-400 pb-2 border-b border-red-400/20">Expired ({expired.length})</h2>
            <div className="bg-v-surface border border-v-border rounded-lg divide-y divide-v-border/50">
              {expired.map(app => (
                <div key={app.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-v-text-primary">{app.company || app.email}</p>
                    <p className="text-xs text-v-text-secondary">{app.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-red-500/15 text-red-400 font-medium">Expired</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
