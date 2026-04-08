"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Form state
  const [customerMode, setCustomerMode] = useState('existing'); // existing | new
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [tailNumber, setTailNumber] = useState('');
  const [airport, setAirport] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [assignedCrew, setAssignedCrew] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('unpaid');
  const [notes, setNotes] = useState('');
  const [totalOverride, setTotalOverride] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('vector_token') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    Promise.all([
      fetch('/api/customers', { headers }).then(r => r.ok ? r.json() : { customers: [] }),
      fetch('/api/aircraft/manufacturers').then(r => r.ok ? r.json() : { manufacturers: [] }),
      fetch('/api/services', { headers }).then(r => r.ok ? r.json() : { services: [] }),
      fetch('/api/team', { headers }).then(r => r.ok ? r.json() : { members: [] }),
    ]).then(([custData, mfrData, svcData, teamData]) => {
      setCustomers(custData.customers || []);
      setManufacturers(mfrData.manufacturers || []);
      setServices(svcData.services || svcData || []);
      setTeamMembers((teamData.members || []).filter(m => m.status === 'active'));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!manufacturer) { setModels([]); return; }
    fetch(`/api/aircraft/models?make=${encodeURIComponent(manufacturer)}`)
      .then(r => r.ok ? r.json() : { models: [] })
      .then(d => setModels(d.models || []));
  }, [manufacturer]);

  const calculatedTotal = selectedServices.reduce((sum, id) => {
    const svc = services.find(s => s.id === id);
    return sum + (parseFloat(svc?.price) || parseFloat(svc?.hourly_rate) || 0);
  }, 0);
  const total = totalOverride ? parseFloat(totalOverride) : calculatedTotal;

  const handleSave = async () => {
    const customerName = selectedCustomer?.name || newCustomer.name;
    const customerEmail = selectedCustomer?.email || newCustomer.email;
    if (!customerName) { setError('Customer name required'); return; }
    if (!manufacturer || !model) { setError('Aircraft required'); return; }

    setSaving(true); setError('');
    try {
      // Create/get customer
      let customerId = selectedCustomer?.id;
      if (!customerId && newCustomer.email) {
        const custRes = await fetch('/api/customers', {
          method: 'POST', headers,
          body: JSON.stringify({ name: newCustomer.name, email: newCustomer.email, phone: newCustomer.phone }),
        });
        if (custRes.ok) { const d = await custRes.json(); customerId = d.customer?.id; }
      }

      // Create job
      const res = await fetch('/api/jobs/create', {
        method: 'POST', headers,
        body: JSON.stringify({
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          aircraft_make: manufacturer,
          aircraft_model: model,
          tail_number: tailNumber,
          airport,
          services: selectedServices.map(id => {
            const svc = services.find(s => s.id === id);
            return { id, name: svc?.name, hours: parseFloat(svc?.default_hours) || 0, price: parseFloat(svc?.price || svc?.hourly_rate) || 0 };
          }),
          scheduled_date: scheduledDate || null,
          scheduled_time: scheduledTime || null,
          assigned_crew: assignedCrew,
          payment_method: paymentMethod,
          total_price: total,
          notes,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      router.push('/jobs');
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const cls = 'w-full bg-v-surface border border-v-border text-v-text-primary rounded-sm px-3 py-2 text-sm outline-none focus:border-v-gold/50';

  if (loading) return <AppShell title="Create Job"><div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-v-gold border-t-transparent rounded-full animate-spin" /></div></AppShell>;

  return (
    <AppShell title="Create Job">
      <div className="px-6 md:px-10 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <a href="/jobs" className="text-v-text-secondary hover:text-white text-lg">&larr;</a>
          <h1 className="font-heading text-2xl font-light text-v-text-primary tracking-wider">CREATE JOB</h1>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded mb-4 text-sm">{error}</div>}

        <div className="space-y-6">
          {/* Customer */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Customer</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setCustomerMode('existing')} className={`px-3 py-1 text-xs rounded ${customerMode === 'existing' ? 'bg-v-gold text-v-charcoal' : 'border border-v-border text-v-text-secondary'}`}>Existing</button>
              <button onClick={() => setCustomerMode('new')} className={`px-3 py-1 text-xs rounded ${customerMode === 'new' ? 'bg-v-gold text-v-charcoal' : 'border border-v-border text-v-text-secondary'}`}>New</button>
            </div>
            {customerMode === 'existing' ? (
              <select value={selectedCustomer?.id || ''} onChange={e => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)} className={cls}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <input value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Name *" className={cls} />
                <input value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="Email" className={cls} />
                <input value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className={cls} />
              </div>
            )}
          </div>

          {/* Aircraft */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Aircraft</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <select value={manufacturer} onChange={e => { setManufacturer(e.target.value); setModel(''); }} className={cls}>
                <option value="">Manufacturer...</option>
                {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={model} onChange={e => setModel(e.target.value)} className={cls} disabled={!manufacturer}>
                <option value="">Model...</option>
                {models.map(m => <option key={m.id} value={m.model}>{m.model}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={tailNumber} onChange={e => setTailNumber(e.target.value.toUpperCase())} placeholder="Tail Number (N12345)" className={cls} />
              <input value={airport} onChange={e => setAirport(e.target.value.toUpperCase())} placeholder="Airport (KTEB)" className={cls} />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Services</label>
            <div className="space-y-1">
              {services.map(svc => {
                const sel = selectedServices.includes(svc.id);
                return (
                  <label key={svc.id} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${sel ? 'border-v-gold/50 bg-v-gold/5' : 'border-v-border bg-v-surface'}`}>
                    <input type="checkbox" checked={sel}
                      onChange={() => setSelectedServices(prev => sel ? prev.filter(id => id !== svc.id) : [...prev, svc.id])}
                      className="w-4 h-4 rounded accent-v-gold" />
                    <span className="flex-1 text-sm text-v-text-primary">{svc.name}</span>
                    {(svc.price || svc.hourly_rate) && <span className="text-xs text-v-text-secondary">${parseFloat(svc.price || svc.hourly_rate).toFixed(0)}</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Schedule + Crew */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Date</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={cls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Time</label>
              <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className={cls} />
            </div>
          </div>

          {/* Assign Crew */}
          {teamMembers.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Assign Crew</label>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(tm => {
                  const sel = assignedCrew.includes(tm.id);
                  return (
                    <button key={tm.id} onClick={() => setAssignedCrew(prev => sel ? prev.filter(id => id !== tm.id) : [...prev, tm.id])}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${sel ? 'bg-v-gold text-v-charcoal font-medium' : 'border border-v-border text-v-text-secondary hover:border-v-gold/30'}`}>
                      {tm.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment + Total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Payment</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={cls}>
                <option value="unpaid">Unpaid</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card_external">Card (External)</option>
                <option value="zelle">Zelle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Total</label>
              <input type="number" step="0.01" value={totalOverride || calculatedTotal.toFixed(2)} onChange={e => setTotalOverride(e.target.value)}
                className={cls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-v-text-secondary mb-2">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional notes..." className={cls + ' resize-none'} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-v-border">
            <a href="/jobs" className="px-5 py-2.5 text-sm text-v-text-secondary hover:text-white border border-v-border rounded transition-colors">Cancel</a>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 text-xs uppercase tracking-widest bg-v-gold text-v-charcoal font-semibold hover:bg-v-gold-dim disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
