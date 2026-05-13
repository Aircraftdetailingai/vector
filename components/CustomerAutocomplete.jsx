"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Customer-name input with a mobile-friendly autocomplete dropdown.
 *
 * The dropdown is rendered into a React portal at document.body so it escapes
 * the New Invoice modal's `max-h-[90vh] overflow-y-auto` scroll container,
 * which would otherwise clip the absolutely-positioned dropdown out of view.
 * Position is computed from the input's getBoundingClientRect and re-pinned
 * on resize/scroll while the dropdown is open, so it sticks to the input
 * even when the user scrolls the modal contents.
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
 *   listClassName    merged into the dropdown wrapper className (extra styles)
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
  const [anchorRect, setAnchorRect] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
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
        const token = typeof window !== 'undefined' ? localStorage.getItem('vector_token') : null;
        const url = `/api/customers?q=${encodeURIComponent(q)}&limit=8`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) {
          console.error('[CustomerAutocomplete] fetch failed', url, res.status);
          setMatches([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data?.customers) ? data.customers.slice(0, 8) : [];
        console.log('[CustomerAutocomplete] fetch', url, res.status, 'matches=', list.length);
        setMatches(list);
      } catch (err) {
        console.error('[CustomerAutocomplete] fetch threw', err?.message || err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  // Compute and pin the dropdown position to the input's viewport rect.
  // Recomputes on scroll/resize so the dropdown stays glued to the input
  // even as the modal contents scroll underneath it.
  const recomputeRect = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchorRect({ top: r.bottom, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    recomputeRect();
    const handler = () => recomputeRect();
    window.addEventListener('resize', handler);
    // capture=true so we catch scrolls on inner overflow containers
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, recomputeRect]);

  // Tap-outside-to-close. pointerdown fires consistently on iOS Safari.
  // Allow taps inside the input OR inside the dropdown to keep it open.
  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e) => {
      const inInput = inputRef.current && inputRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inInput && !inDropdown) setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  const handleFocus = () => {
    setOpen(true);
    // Pull the input above the iOS keyboard if the modal viewport scrolled
    // it out of view. setTimeout lets the keyboard's appearance settle.
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
  const showDropdown = open && q.length >= 2 && (matches.length > 0 || !loading) && anchorRect;
  const canPortal = typeof window !== 'undefined' && typeof document !== 'undefined';

  const dropdown = showDropdown ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: anchorRect.top + 4,
        left: anchorRect.left,
        width: anchorRect.width,
        zIndex: 9999,
      }}
      className={`max-h-56 overflow-y-auto bg-v-surface border border-v-border rounded-md shadow-lg ${listClassName}`}
      // Prevent the input from losing focus when a row is tapped on mobile —
      // onPointerDown fires before the input's blur; suppress default so
      // focus stays during the tap, the onClick still resolves.
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
  ) : null;

  return (
    <div className="relative">
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
      {dropdown && canPortal && createPortal(dropdown, document.body)}
    </div>
  );
}
