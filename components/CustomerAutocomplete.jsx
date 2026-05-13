"use client";
import { useEffect, useRef, useState } from 'react';

/**
 * Customer-name input with a mobile-friendly autocomplete dropdown.
 *
 * Why this exists: the New Invoice form previously used `<datalist>`, whose
 * support on iOS Safari is unreliable (no popup, no taps registered against
 * the suggestion list). New Quote used a separate search-then-pick UI. Both
 * paths are unified here with an in-DOM dropdown that survives mobile.
 *
 * Props:
 *   value            current typed name (controlled)
 *   onChange(v)      typing handler — receives the new string
 *   onSelect(c)      called when user taps an existing customer row.
 *                    Receives the full customer object.
 *   onCreateNew(name) called when the "Add as new customer" row is tapped.
 *                    Optional — falls back to onChange + clearing selection.
 *   placeholder      input placeholder
 *   className        merged into the input className
 *   listClassName    merged into the dropdown wrapper className (z-index etc.)
 */
export default function CustomerAutocomplete({
  value,
  onChange,
  onSelect,
  onCreateNew,
  placeholder = 'Customer name',
  className = '',
  listClassName = '',
}) {
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced fetch against the existing /api/customers?q= endpoint.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = (value || '').trim();
    if (q.length < 2) {
      setMatches([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('vector_token');
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=8`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setMatches(Array.isArray(data?.customers) ? data.customers.slice(0, 8) : []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  // Tap-outside-to-close. Use pointerdown so iOS Safari fires consistently.
  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  const handleFocus = () => {
    setOpen(true);
    // Pull the input above the iOS keyboard if the modal viewport scrolled it
    // out of view. setTimeout lets the keyboard's appearance settle first.
    setTimeout(() => {
      try { inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
    }, 250);
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    setOpen(true);
  };

  const pickCustomer = (c) => {
    onSelect?.(c);
    setOpen(false);
  };

  const pickCreateNew = () => {
    const typed = (value || '').trim();
    if (!typed) return;
    if (onCreateNew) onCreateNew(typed);
    else onChange?.(typed);
    setOpen(false);
  };

  const q = (value || '').trim();
  const showDropdown = open && q.length >= 2 && (matches.length > 0 || !loading);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value || ''}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {showDropdown && (
        <div
          className={`absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-v-surface border border-v-border rounded-md shadow-lg z-50 ${listClassName}`}
          // Prevent the input from losing focus when a row is tapped on
          // mobile — onMouseDown / onPointerDown fire before the input's
          // blur, so we suppress the default to keep focus during the tap.
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
        >
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCustomer(c)}
              className="w-full text-left px-3 py-2 hover:bg-white/5 active:bg-white/10 border-b border-v-border/30 last:border-b-0"
            >
              <div className="text-sm font-semibold text-v-text-primary truncate">{c.name || '\u2014'}</div>
              {(c.email || c.phone) && (
                <div className="text-[11px] text-v-text-secondary truncate">
                  {c.email || ''}{c.email && c.phone ? ' \u00b7 ' : ''}{c.phone || ''}
                </div>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={pickCreateNew}
            className="w-full text-left px-3 py-2 text-xs text-v-gold hover:bg-v-gold/10 active:bg-v-gold/20 border-t border-v-gold/20"
          >
            + Add as new customer: <span className="font-semibold">{q}</span>
          </button>
        </div>
      )}
    </div>
  );
}
