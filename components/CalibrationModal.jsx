"use client";
import { useState, useEffect, useRef } from 'react';

const STANDARD_REFERENCES = [
  { value: 'wash', label: 'Wash (Maintenance Wash)' },
  { value: 'polish', label: 'Polish' },
  { value: 'compound', label: 'Compound' },
  { value: 'wax', label: 'Wax' },
  { value: 'ceramic', label: 'Ceramic Coating' },
  { value: 'detail_interior', label: 'Interior Detail' },
  { value: 'leather', label: 'Leather Conditioning' },
];

const INPUT_CLASS =
  'w-full bg-v-surface border border-v-border text-v-text-primary rounded-sm px-3 py-2 text-sm outline-none focus:border-v-gold/50';

export default function CalibrationModal({
  isOpen,
  onClose,
  service,
  detailerServices,
  calibrations,
  anchorA,
  anchorB,
}) {
  const [referenceType, setReferenceType] = useState('polish');
  const [manualAdjustmentPct, setManualAdjustmentPct] = useState(0);
  const [preview, setPreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  // Slider is the sole adjustment input; ratio is always "ready" because the
  // slider always carries a value. Anchor props are still received so the
  // Live Preview fetch can render rows for the detailer's chosen aircraft.
  const adjustmentPct = Math.max(-50, Math.min(200, manualAdjustmentPct));
  const computedReady = true;

  // Load saved calibration (or reset to defaults) when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSuccessMessage('');
    setError('');
    const existing = (calibrations || []).find(c => c.service_id === service?.id);
    if (existing) {
      setReferenceType(existing.reference_service_type || 'polish');
      setManualAdjustmentPct(existing.adjustment_pct ?? 0);
    } else {
      setReferenceType('polish');
      setManualAdjustmentPct(0);
    }
  }, [isOpen, service?.id, calibrations]);

  // Debounced preview fetch — uses the computed adjustment_pct.
  // When anchors are picked, pass their uuids so the preview rows show the
  // detailer's actual anchor aircraft instead of generic category samples.
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const token = localStorage.getItem('vector_token');
        const params = new URLSearchParams({
          reference_type: referenceType,
          adjustment_pct: String(adjustmentPct),
        });
        if (anchorA?.id) params.set('anchor_a', anchorA.id);
        if (anchorB?.id) params.set('anchor_b', anchorB.id);
        const res = await fetch(
          `/api/services/calibration-preview?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setPreview(data.preview || data.samples || data.aircraft || []);
        }
      } catch (err) {
        console.error('Preview fetch failed:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isOpen, referenceType, adjustmentPct, anchorA?.id, anchorB?.id]);

  const handleSave = async () => {
    if (!service) return;
    if (!computedReady) {
      setError('Enter your actual hours for at least one anchor aircraft.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/services/calibrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id: service.id,
          service_name: service.name,
          reference_service_type: referenceType,
          adjustment_pct: adjustmentPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save calibration');
        setSaving(false);
        return;
      }
      const count = data.applied_count ?? data.aircraft_count ?? data.count ?? 0;
      setSuccessMessage(`Applied to ${count} aircraft`);
      setTimeout(() => {
        setSaving(false);
        onClose?.();
      }, 1500);
    } catch (err) {
      console.error('Save calibration failed:', err);
      setError('Failed to save calibration');
      setSaving(false);
    }
  };

  if (!isOpen || !service) return null;

  const multiplier = (1 + adjustmentPct / 100).toFixed(2).replace(/\.?0+$/, '');
  const calibratedIds = new Set((calibrations || []).map(c => c.service_id));

  // Build grouped reference options: detailer's own services first, then standard
  const ownServices = (detailerServices || [])
    .filter(s => s.id !== service.id)
    .map(s => ({
      value: `svc:${s.id}`,
      label: s.name,
      calibrated: calibratedIds.has(s.id),
    }));

  const adjustmentLabel = !computedReady
    ? '—'
    : adjustmentPct === 0
      ? 'SAME'
      : adjustmentPct > 0
        ? `+${adjustmentPct}% MORE TIME`
        : `${adjustmentPct}% LESS TIME`;

  const adjustmentColor = !computedReady
    ? 'text-v-text-secondary'
    : adjustmentPct === 0
      ? 'text-white'
      : adjustmentPct > 0
        ? 'text-blue-400'
        : 'text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-v-surface border border-v-border w-full sm:max-w-lg sm:rounded-lg sm:my-8 flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-v-border shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-v-text-primary">
            Calibrate: <span className="text-v-gold">{service.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-v-text-secondary hover:text-v-text-primary text-2xl leading-none px-2"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-sm text-v-text-secondary">
            Pick a reference service and adjust how much more or less time this service takes.
          </p>

          {(calibrations || []).some(c => c.service_id === service?.id) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-v-gold/10 border border-v-gold/30 rounded-sm text-xs text-v-gold">
              <span>&#10003;</span>
              <span>Previously calibrated — re-enter hours below to update</span>
            </div>
          )}

          {/* Reference dropdown — own services + standard types */}
          <div>
            <label className="block text-xs font-medium text-v-text-secondary mb-1.5 uppercase tracking-wide">
              This service is most similar to:
            </label>
            <select
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              className={INPUT_CLASS}
            >
              {ownServices.length > 0 && (
                <optgroup label="YOUR SERVICES">
                  {ownServices.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.calibrated ? '✓ ' : ''}{opt.label}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="STANDARD REFERENCES">
                {STANDARD_REFERENCES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Manual adjustment slider — sole adjustment input */}
          <div>
            <label className="block text-xs font-medium text-v-text-secondary mb-2 uppercase tracking-wide">
              Time Adjustment
            </label>
            <input
              type="range"
              min="-50"
              max="200"
              step="5"
              value={manualAdjustmentPct}
              onChange={(e) => setManualAdjustmentPct(parseInt(e.target.value, 10) || 0)}
              className="w-full accent-v-gold"
            />
            {/* Labels are absolutely positioned to align with slider thumb
                positions: 0% (sentinel) sits at (0 - (-50)) / 250 = 20% from
                left, not at the row's geometric center. */}
            <div className="relative h-4 text-[10px] text-v-text-secondary mt-1">
              <span className="absolute left-0 -translate-x-0">-50%</span>
              <span className="absolute left-[20%] -translate-x-1/2">0%</span>
              <span className="absolute left-full -translate-x-full">+200%</span>
            </div>
          </div>

          {/* Computed adjustment */}
          <div>
            <label className="block text-xs font-medium text-v-text-secondary mb-2 uppercase tracking-wide">
              Calibration ratio
            </label>
            <div className="text-center">
              <div className={`text-3xl sm:text-4xl font-bold ${adjustmentColor}`}>
                {adjustmentLabel}
              </div>
              <div className="text-xs text-v-text-secondary mt-1">
                {`${multiplier}x reference time`}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-medium text-v-text-secondary mb-2 uppercase tracking-wide">
              Live Preview
            </label>
            <div className="border border-v-border rounded-sm divide-y divide-v-border bg-v-charcoal/40">
              {previewLoading && preview.length === 0 ? (
                <div className="p-4 text-center text-xs text-v-text-secondary">Loading preview...</div>
              ) : preview.length === 0 ? (
                <div className="p-4 text-center text-xs text-v-text-secondary">No preview available</div>
              ) : (
                preview.slice(0, 4).map((row, i) => {
                  const model = row.model || row.aircraft_model || row.name || `Aircraft ${i + 1}`;
                  const ref = row.reference_hours ?? row.reference ?? row.base_hours ?? 0;
                  const cal = Number(ref) * (1 + adjustmentPct / 100);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2.5 text-sm"
                    >
                      <span className="text-v-text-primary font-medium truncate mr-2">{model}</span>
                      <span className="text-xs whitespace-nowrap">
                        <span className="text-v-text-secondary">{Number(ref).toFixed(1)}h</span>
                        <span className="text-v-text-secondary"> &rarr; </span>
                        <span className={`font-semibold ${adjustmentPct < 0 ? 'text-red-400' : adjustmentPct > 0 ? 'text-blue-400' : 'text-white'}`}>
                          {cal.toFixed(1)}h
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-sm px-3 py-2">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="text-sm text-v-gold bg-v-gold/10 border border-v-gold/30 rounded-sm px-3 py-2">
              {successMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-v-border shrink-0 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm border border-v-border text-v-text-secondary rounded-sm hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !computedReady}
            className="px-4 py-2 text-sm bg-v-gold text-v-charcoal font-medium rounded-sm hover:bg-v-gold/90 disabled:opacity-50"
          >
            {saving
              ? successMessage
                ? successMessage
                : 'Saving...'
              : 'Save Calibration'}
          </button>
        </div>
      </div>
    </div>
  );
}
