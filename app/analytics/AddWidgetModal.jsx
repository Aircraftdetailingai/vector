'use client';
import { WIDGET_REGISTRY } from './widgetRegistry';

const CATEGORIES = ['Revenue', 'Conversion', 'Operations', 'Customers'];

export default function AddWidgetModal({ activeWidgets, onAdd, onClose }) {
  const available = Object.values(WIDGET_REGISTRY).filter(w => !activeWidgets.includes(w.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-v-surface border border-v-border rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-v-border-subtle">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-v-text-primary">Add Widget</h2>
          <button onClick={onClose} className="text-v-text-secondary hover:text-v-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {available.length === 0 ? (
            <p className="text-v-text-secondary text-sm text-center py-8">All widgets are active</p>
          ) : (
            CATEGORIES.map(cat => {
              const widgets = available.filter(w => w.category === cat);
              if (widgets.length === 0) return null;
              return (
                <div key={cat} className="mb-6 last:mb-0">
                  <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase text-v-text-secondary mb-3">{cat}</h3>
                  <div className="space-y-2">
                    {widgets.map(w => (
                      <button
                        key={w.id}
                        onClick={() => onAdd(w.id)}
                        className="w-full flex items-center justify-between p-3 border border-v-border-subtle rounded-lg hover:border-v-gold transition-colors text-left group"
                      >
                        <div>
                          <p className="text-sm text-v-text-primary group-hover:text-v-gold transition-colors">{w.name}</p>
                          <p className="text-[10px] text-v-text-secondary mt-0.5">{w.description}</p>
                        </div>
                        <span className="text-v-gold text-lg ml-3">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
