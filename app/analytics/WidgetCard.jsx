'use client';

export default function WidgetCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {title && (
        <div className="mb-3">
          <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-v-text-secondary">{title}</h3>
          {subtitle && <p className="text-[10px] text-v-text-secondary/60 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
