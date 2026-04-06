"use client";
import { useState, useEffect, useRef } from 'react';

const TOTAL_STEPS = 5; // 1=tail, 2=services, 3=notes, 4=photos, 5=contact

export default function QuoteRequestFlow({ detailerId, detailerName, detailerLogo, detailerPlan = 'free', embedded = false }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Detailer's services
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  // Data
  const [tailNumber, setTailNumber] = useState('');
  const [faaResult, setFaaResult] = useState(null);
  const [faaError, setFaaError] = useState('');
  const [faaLooking, setFaaLooking] = useState(false);
  const [aircraftDisplay, setAircraftDisplay] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const faaTimer = useRef(null);

  // Fetch detailer's services on mount
  useEffect(() => {
    if (!detailerId) return;
    fetch(`/api/lead-intake/widget?detailer_id=${detailerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.services?.length > 0) setServices(d.services); })
      .catch(() => {});
    fetch(`/api/services/public?detailer_id=${detailerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.services?.length > 0) setServices(d.services); })
      .catch(() => {});
  }, [detailerId]);

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS + 1));
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  // FAA lookup
  const handleTailChange = (v) => {
    const upper = v.toUpperCase();
    setTailNumber(upper);
    setFaaResult(null);
    setFaaError('');
    clearTimeout(faaTimer.current);
    const nNum = upper.replace(/^N/, '');
    if (nNum.length >= 2) {
      faaTimer.current = setTimeout(() => lookupTail(upper), 800);
    }
  };

  const lookupTail = async (t) => {
    setFaaLooking(true);
    setFaaResult(null);
    setFaaError('');
    try {
      const res = await fetch(`/api/aircraft/registry/${encodeURIComponent(t)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          const badModel = !data.model || data.model === 'Serial Number' || data.model.length < 2;
          if (data.manufacturer && !badModel) {
            setFaaResult(data);
            setAircraftDisplay(`${data.manufacturer} ${data.model}`);
          }
        } else if (data.filtered) {
          setFaaError(data.message || 'This aircraft type is not supported.');
        } else {
          setFaaError(data.message || 'Aircraft not found. Please check your tail number and try again.');
        }
      }
    } catch {}
    setFaaLooking(false);
  };

  // Submit
  const handleSubmit = async (firstName, lastName, email, phone, company) => {
    setSubmitting(true);
    setError('');
    try {
      let photoUrls = [];
      if (photos.length > 0) {
        setUploading(true);
        const formData = new FormData();
        formData.append('detailer_id', detailerId);
        photos.forEach((p, i) => {
          formData.append(`photo_${i}`, p.file);
          formData.append(`caption_${i}`, p.caption || '');
        });
        formData.append('photo_count', String(photos.length));
        try {
          const uploadRes = await fetch('/api/lead-intake/upload-photos', { method: 'POST', body: formData });
          if (uploadRes.ok) photoUrls = (await uploadRes.json()).urls || [];
        } catch {}
        setUploading(false);
      }

      const serviceNames = selectedServices.map(id => {
        const svc = services.find(s => (s.id || s.name) === id);
        return svc?.name || id;
      });

      const res = await fetch('/api/lead-intake/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detailer_id: detailerId,
          name: `${firstName} ${lastName}`.trim(),
          email, phone,
          company: company || null,
          aircraft_model: aircraftDisplay || null,
          tail_number: tailNumber || null,
          services_requested: serviceNames.join(', ') || notes || null,
          notes: notes || null,
          photo_urls: photoUrls,
          source: embedded ? 'embed_widget' : 'quote_request_page',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to submit');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
      setStep(5);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const isEnterprise = detailerPlan === 'enterprise';

  const Header = () => (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between">
        {step > 1 && !submitted ? (
          <button onClick={goBack} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
        ) : <div className="w-10" />}
        <div className="text-center">
          {detailerLogo ? (
            <img src={detailerLogo} alt={detailerName} className="h-8 object-contain mx-auto" />
          ) : (
            <span className="text-white/80 text-sm font-medium">{detailerName || 'Get a Quote'}</span>
          )}
        </div>
        <div className="w-10" />
      </div>
      {!isEnterprise && <p className="text-center text-white/20 text-[9px] mt-1">Powered by Shiny Jets CRM</p>}
    </div>
  );

  const ProgressDots = () => (
    <div className="flex justify-center gap-1.5 py-4">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i + 1 <= step ? 'bg-[#007CB1]' : 'bg-white/20'}`} />
      ))}
    </div>
  );

  const Btn = ({ children, onClick, disabled, secondary }) => (
    <button onClick={onClick} disabled={disabled}
      className={`w-full py-4 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all min-h-[48px] disabled:opacity-40 ${
        secondary ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15' : 'bg-[#007CB1] text-white hover:bg-[#006a9e]'
      }`}>
      {children}
    </button>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 className="text-2xl font-light text-white mb-3">Request Submitted!</h2>
          <p className="text-white/60 text-sm mb-8">We&apos;ll have your quote ready shortly.</p>
          {detailerName && <p className="text-white/40 text-xs">{detailerName}</p>}
        </div>
      </div>
    );
  }

  if (step === TOTAL_STEPS + 1) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#007CB1] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white/60 text-sm">{uploading ? 'Uploading photos...' : 'Submitting your request...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex flex-col">
      <Header />
      <ProgressDots />
      <div className="flex-1 flex flex-col px-6 pb-8">
        {error && <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

        {/* ━━━ STEP 1: Tail Number ━━━ */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-light text-white mb-2">What&apos;s your tail number?</h2>
            <p className="text-white/40 text-xs mb-6">Optional — we&apos;ll look up your aircraft automatically</p>
            <input type="text" value={tailNumber} onChange={e => handleTailChange(e.target.value)}
              placeholder="N12345" autoCapitalize="characters" autoFocus
              style={{ fontSize: '16px' }}
              className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-4 placeholder-white/40 outline-none focus:border-[#007CB1] transition-colors" />

            {faaLooking && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-4 h-4 border-2 border-[#007CB1] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/40 text-xs">Looking up registration...</p>
              </div>
            )}
            {faaError && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-xs">{faaError}</p>
              </div>
            )}
            {faaResult && (
              <div className="mt-3 bg-[#007CB1]/10 border border-[#007CB1]/30 rounded-lg p-4">
                <p className="text-white text-sm font-medium">{faaResult.manufacturer} {faaResult.model}</p>
                {faaResult.year && <p className="text-white/50 text-xs mt-0.5">{faaResult.year}{faaResult.registrant_name ? ` — ${faaResult.registrant_name}` : ''}</p>}
                <button onClick={() => { setAircraftDisplay(`${faaResult.manufacturer} ${faaResult.model}`); goNext(); }}
                  className="mt-3 w-full py-3 rounded-lg bg-[#007CB1] text-white text-sm font-semibold hover:bg-[#006a9e] transition-colors">
                  Yes, this is my aircraft
                </button>
              </div>
            )}
            <div className="mt-auto pt-6 space-y-3">
              {!faaResult && <Btn onClick={goNext}>Next</Btn>}
              {!tailNumber && <Btn onClick={goNext} secondary>Skip</Btn>}
            </div>
          </div>
        )}

        {/* ━━━ STEP 2: Services ━━━ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-light text-white mb-2">What services do you need?</h2>
            <p className="text-white/40 text-xs mb-5">Select all that apply</p>
            <div className="flex-1 overflow-y-auto space-y-2 content-start">
              {services.length > 0 ? services.map(svc => {
                const id = svc.id || svc.name;
                const sel = selectedServices.includes(id);
                return (
                  <button key={id} onClick={() => setSelectedServices(prev => sel ? prev.filter(k => k !== id) : [...prev, id])}
                    className={`w-full p-4 rounded-lg border text-left text-sm transition-all ${
                      sel ? 'border-[#007CB1] bg-[#007CB1]/15 text-white' : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'
                    }`}>
                    <span className="font-medium">{svc.name}</span>
                    {svc.description && <span className="block text-xs text-white/30 mt-0.5">{svc.description}</span>}
                  </button>
                );
              }) : (
                <div className="py-4">
                  <p className="text-white/40 text-sm mb-4">Tell us what you need:</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Full exterior wash and interior detail, ceramic coating..."
                    rows={4}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-4 text-base placeholder-white/40 outline-none focus:border-[#007CB1] resize-none" />
                </div>
              )}
            </div>
            <div className="pt-5">
              <Btn onClick={goNext} disabled={selectedServices.length === 0 && !notes.trim()}>
                {selectedServices.length > 0 ? `Next (${selectedServices.length} selected)` : 'Next'}
              </Btn>
            </div>
          </div>
        )}

        {/* ━━━ STEP 3: Notes ━━━ */}
        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-light text-white mb-2">Any specific instructions?</h2>
            <p className="text-white/40 text-xs mb-6">Optional — special requests, access details, timing</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Aircraft at Gate 4, hangar access code 1234, prefer morning..."
              rows={5}
              className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-4 text-base placeholder-white/40 outline-none focus:border-[#007CB1] resize-none" />
            <div className="mt-auto pt-6">
              <Btn onClick={goNext}>{notes.trim() ? 'Next' : 'Skip'}</Btn>
            </div>
          </div>
        )}

        {/* ━━━ STEP 4: Photos ━━━ */}
        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-light text-white mb-2">Upload photos of your aircraft</h2>
            <p className="text-white/40 text-xs mb-6">Optional — helps us give a more accurate quote</p>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p.preview} alt="" className="w-full h-24 object-cover rounded-lg border border-white/10" />
                    <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">x</button>
                  </div>
                ))}
              </div>
            )}
            <label className="w-full p-8 rounded-lg border-2 border-dashed border-white/20 text-center cursor-pointer hover:border-[#007CB1]/50 transition-colors mb-4">
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setPhotos(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f), caption: '' }))].slice(0, 10));
                  e.target.value = '';
                }} />
              <p className="text-white/60 text-sm">{photos.length > 0 ? 'Add more photos' : 'Tap to upload photos'}</p>
              <p className="text-white/30 text-[10px] mt-1">Up to 10 photos</p>
            </label>
            <div className="mt-auto pt-4 space-y-3">
              {photos.length > 0 && <Btn onClick={goNext}>Continue with {photos.length} photo{photos.length !== 1 ? 's' : ''}</Btn>}
              <Btn onClick={goNext} secondary>{photos.length > 0 ? 'Skip photos' : 'Skip for now'}</Btn>
            </div>
          </div>
        )}

        {/* ━━━ STEP 5: Contact Info ━━━ */}
        {step === 5 && (
          <ContactStep onSubmit={(fn, ln, em, ph, co) => { setStep(TOTAL_STEPS + 1); handleSubmit(fn, ln, em, ph, co); }} />
        )}
      </div>
    </div>
  );
}

// Uncontrolled refs — prevents iOS Safari focus steal
function ContactStep({ onSubmit }) {
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const companyRef = useRef(null);
  const termsRef = useRef(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const checkValid = () => {
    const fn = firstNameRef.current?.value?.trim();
    const ln = lastNameRef.current?.value?.trim();
    const e = emailRef.current?.value?.trim();
    const p = phoneRef.current?.value?.trim();
    const t = termsRef.current?.checked;
    setCanSubmit(!!(fn && ln && e && p && t));
  };

  const handleSubmit = () => {
    const fn = firstNameRef.current?.value?.trim() || '';
    const ln = lastNameRef.current?.value?.trim() || '';
    const e = emailRef.current?.value?.trim() || '';
    const p = phoneRef.current?.value?.trim() || '';
    const c = companyRef.current?.value?.trim() || '';
    if (fn && ln && e && p && termsRef.current?.checked) onSubmit(fn, ln, e, p, c);
  };

  const cls = 'w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-4 placeholder-white/40 outline-none focus:border-[#007CB1] transition-colors';

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl font-light text-white mb-2">Your contact info</h2>
      <p className="text-white/40 text-xs mb-6">We&apos;ll send your quote to this email</p>
      <div className="space-y-4">
        <div className="flex gap-3">
          <input ref={firstNameRef} type="text" defaultValue="" autoComplete="given-name" placeholder="First Name *"
            onInput={checkValid} onBlur={checkValid} style={{ fontSize: '16px' }} className={cls} />
          <input ref={lastNameRef} type="text" defaultValue="" autoComplete="family-name" placeholder="Last Name *"
            onInput={checkValid} onBlur={checkValid} style={{ fontSize: '16px' }} className={cls} />
        </div>
        <input ref={emailRef} type="email" defaultValue="" autoComplete="email" placeholder="Email Address *"
          onInput={checkValid} onBlur={checkValid} style={{ fontSize: '16px' }} className={cls} />
        <input ref={phoneRef} type="tel" defaultValue="" autoComplete="tel" placeholder="Phone Number *"
          onInput={checkValid} onBlur={checkValid} style={{ fontSize: '16px' }} className={cls} />
        <input ref={companyRef} type="text" defaultValue="" autoComplete="organization" placeholder="Company Name (optional)"
          style={{ fontSize: '16px' }} className={cls} />
      </div>
      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input ref={termsRef} type="checkbox" defaultChecked={false} onChange={checkValid}
          className="mt-0.5 w-4 h-4 rounded accent-[#007CB1] flex-shrink-0" />
        <span className="text-white/50 text-xs">
          I have read and agree to the{' '}
          <a href="/legal/quote-terms" target="_blank" rel="noreferrer" className="text-[#007CB1] underline" onClick={e => e.stopPropagation()}>Terms of Service</a>
        </span>
      </label>
      <div className="mt-4">
        <button onClick={handleSubmit} disabled={!canSubmit}
          className="w-full py-4 rounded-lg text-sm font-semibold uppercase tracking-wider bg-[#007CB1] text-white hover:bg-[#006a9e] min-h-[48px] disabled:opacity-40 transition-all">
          Submit Request
        </button>
      </div>
    </div>
  );
}
