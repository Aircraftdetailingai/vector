"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTION_TYPES, DEFAULT_QUESTIONS } from '@/lib/default-intake-flow';

export default function IntakeFlowBuilder() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [plan, setPlan] = useState('free');
  const [toast, setToast] = useState('');
  const [dragIdx, setDragIdx] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('vector_token') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('vector_user') || '{}');
    setPlan(user.plan || 'free');

    fetch('/api/intake-flow', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { questions: DEFAULT_QUESTIONS })
      .then(d => setQuestions(d.questions || DEFAULT_QUESTIONS))
      .catch(() => setQuestions(DEFAULT_QUESTIONS))
      .finally(() => setLoading(false));
  }, []);

  const canEdit = plan !== 'free';
  const canAdd = ['business', 'enterprise'].includes(plan);
  const canConditional = plan === 'enterprise';

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/intake-flow', { method: 'POST', headers, body: JSON.stringify({ questions }) });
    if (res.ok) showToast('Flow saved');
    else { const d = await res.json(); showToast(d.error || 'Failed to save'); }
    setSaving(false);
  };

  const handleReset = async () => {
    await fetch('/api/intake-flow', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setQuestions(DEFAULT_QUESTIONS);
    showToast('Reset to default');
  };

  const addQuestion = (type) => {
    const id = `q_${Date.now()}`;
    const newQ = { id, type, text: 'New question', required: false };
    if (['single_select', 'multi_select'].includes(type)) newQ.options = ['Option 1', 'Option 2'];
    if (type === 'text' || type === 'long_text') newQ.placeholder = '';
    setQuestions(prev => [...prev, newQ]);
    setShowAddType(false);
    setEditing(id);
  };

  const updateQuestion = (id, updates) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (editing === id) setEditing(null);
  };

  const moveQuestion = (from, to) => {
    const updated = [...questions];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setQuestions(updated);
  };

  if (loading) return <div className="min-h-screen bg-v-charcoal flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-v-charcoal p-4">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50 text-sm">{toast}</div>}

      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href="/settings" className="text-v-text-secondary text-xs hover:text-white">&larr; Settings</a>
            <h1 className="text-xl font-light text-white mt-1">Intake Flow Builder</h1>
            <p className="text-v-text-secondary text-xs mt-1">Customize the questions customers answer when requesting a quote</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(true)} className="px-3 py-2 text-[10px] uppercase tracking-wider text-v-gold border border-v-gold/30 rounded hover:bg-v-gold/5">Preview</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-[10px] uppercase tracking-wider bg-v-gold text-v-charcoal rounded hover:bg-v-gold-dim disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Question Bubbles */}
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const typeInfo = QUESTION_TYPES.find(t => t.key === q.type);
            const isEditing = editing === q.id;

            return (
              <div key={q.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => { if (dragIdx !== null && dragIdx !== idx) moveQuestion(dragIdx, idx); setDragIdx(null); }}
                className={`bg-v-surface border rounded-xl p-4 transition-all ${isEditing ? 'border-v-gold' : 'border-v-border hover:border-v-border-subtle'} ${dragIdx === idx ? 'opacity-50' : ''}`}>

                <div className="flex items-start gap-3">
                  {/* Drag Handle */}
                  <div className="cursor-grab text-v-text-secondary/40 hover:text-v-text-secondary mt-1 select-none" title="Drag to reorder">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{q.text}</span>
                      {q.required && <span className="text-red-400 text-[9px]">Required</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-v-text-secondary/60 text-[10px] uppercase tracking-wider">{typeInfo?.label || q.type}</span>
                      {q.options && <span className="text-v-text-secondary/40 text-[10px]">{q.options.length} options</span>}
                      {q.showIf && <span className="text-v-gold/60 text-[10px]">Conditional</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                      <button onClick={() => setEditing(isEditing ? null : q.id)} className="p-1.5 text-v-text-secondary hover:text-v-gold transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
                      </button>
                    )}
                    {canAdd && !DEFAULT_QUESTIONS.find(dq => dq.id === q.id) && (
                      <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-v-text-secondary hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Panel */}
                {isEditing && canEdit && (
                  <div className="mt-4 pt-4 border-t border-v-border space-y-3">
                    <div>
                      <label className="block text-[10px] text-v-text-secondary uppercase tracking-wider mb-1">Question Text</label>
                      <input type="text" value={q.text} onChange={e => updateQuestion(q.id, { text: e.target.value })}
                        className="w-full bg-v-charcoal border border-v-border text-white rounded px-3 py-2 text-sm outline-none focus:border-v-gold" />
                    </div>

                    {q.placeholder !== undefined && (
                      <div>
                        <label className="block text-[10px] text-v-text-secondary uppercase tracking-wider mb-1">Placeholder</label>
                        <input type="text" value={q.placeholder || ''} onChange={e => updateQuestion(q.id, { placeholder: e.target.value })}
                          className="w-full bg-v-charcoal border border-v-border text-white rounded px-3 py-2 text-sm outline-none focus:border-v-gold" />
                      </div>
                    )}

                    {q.options && (
                      <div>
                        <label className="block text-[10px] text-v-text-secondary uppercase tracking-wider mb-1">Options</label>
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex gap-2 mb-1">
                            <input type="text" value={opt} onChange={e => {
                              const newOpts = [...q.options]; newOpts[i] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                              className="flex-1 bg-v-charcoal border border-v-border text-white rounded px-2 py-1 text-xs outline-none focus:border-v-gold" />
                            <button onClick={() => updateQuestion(q.id, { options: q.options.filter((_, j) => j !== i) })}
                              className="text-red-400/60 hover:text-red-400 text-xs px-1">x</button>
                          </div>
                        ))}
                        <button onClick={() => updateQuestion(q.id, { options: [...q.options, `Option ${q.options.length + 1}`] })}
                          className="text-v-gold text-[10px] mt-1 hover:text-v-gold-dim">+ Add option</button>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={q.required || false} onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                          className="w-3.5 h-3.5 rounded accent-v-gold" />
                        <span className="text-v-text-secondary text-xs">Required</span>
                      </label>
                    </div>

                    {canConditional && (
                      <div>
                        <label className="block text-[10px] text-v-text-secondary uppercase tracking-wider mb-1">Show only if</label>
                        <select value={q.showIf?.questionId || ''} onChange={e => {
                          if (!e.target.value) { updateQuestion(q.id, { showIf: undefined }); return; }
                          updateQuestion(q.id, { showIf: { questionId: e.target.value, hasAny: [] } });
                        }}
                          className="w-full bg-v-charcoal border border-v-border text-white rounded px-2 py-1 text-xs">
                          <option value="">Always show</option>
                          {questions.filter(oq => oq.id !== q.id && oq.options).map(oq => (
                            <option key={oq.id} value={oq.id}>{oq.text}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Question */}
        {canAdd && (
          <div className="mt-4">
            {showAddType ? (
              <div className="bg-v-surface border border-v-border rounded-xl p-4">
                <p className="text-v-text-secondary text-xs mb-3">Select question type:</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUESTION_TYPES.map(t => (
                    <button key={t.key} onClick={() => addQuestion(t.key)}
                      className="p-3 bg-v-charcoal border border-v-border rounded-lg text-left hover:border-v-gold/50 transition-colors">
                      <p className="text-white text-xs font-medium">{t.label}</p>
                      <p className="text-v-text-secondary/60 text-[10px]">{t.desc}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAddType(false)} className="mt-2 text-v-text-secondary text-xs hover:text-white">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddType(true)}
                className="w-full py-3 border-2 border-dashed border-v-border rounded-xl text-v-text-secondary text-xs hover:border-v-gold/30 hover:text-v-gold transition-colors">
                + Add Question
              </button>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-v-border-subtle">
          <button onClick={handleReset} className="text-v-text-secondary text-[10px] uppercase tracking-wider hover:text-red-400">Reset to Default</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-v-gold text-v-charcoal text-[10px] uppercase tracking-wider font-semibold rounded hover:bg-v-gold-dim disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Flow'}
          </button>
        </div>

        {/* Plan Upgrade Prompts */}
        {plan === 'free' && (
          <div className="mt-4 bg-v-gold/5 border border-v-gold/20 rounded-lg p-4 text-center">
            <p className="text-v-text-secondary text-xs">Upgrade to Pro to edit question text and options</p>
            <a href="/settings" className="text-v-gold text-xs hover:underline">View Plans</a>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-v-charcoal border border-v-border rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-v-border">
              <span className="text-white text-sm font-medium">Preview</span>
              <button onClick={() => setShowPreview(false)} className="text-v-text-secondary hover:text-white text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {questions.map(q => (
                <div key={q.id}>
                  <p className="text-white text-sm mb-2">{q.text}{q.required ? ' *' : ''}</p>
                  {q.type === 'single_select' && q.options?.map((opt, i) => (
                    <div key={i} className="w-full p-3 mb-1 rounded-lg border border-white/15 bg-white/5 text-white/60 text-xs">{opt}</div>
                  ))}
                  {q.type === 'multi_select' && q.options?.map((opt, i) => (
                    <div key={i} className="w-full p-3 mb-1 rounded-lg border border-white/15 bg-white/5 text-white/60 text-xs">{opt}</div>
                  ))}
                  {q.type === 'yes_no' && (
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 rounded-lg border border-white/15 bg-white/5 text-white/60 text-xs text-center">Yes</div>
                      <div className="flex-1 p-3 rounded-lg border border-white/15 bg-white/5 text-white/60 text-xs text-center">No</div>
                    </div>
                  )}
                  {(q.type === 'text' || q.type === 'long_text') && (
                    <div className="w-full p-3 rounded-lg border border-white/15 bg-white/5 text-white/30 text-xs">{q.placeholder || 'Type here...'}</div>
                  )}
                  {q.type === 'number' && (
                    <div className="w-full p-3 rounded-lg border border-white/15 bg-white/5 text-white/30 text-xs">0</div>
                  )}
                  {q.type === 'date' && (
                    <div className="w-full p-3 rounded-lg border border-white/15 bg-white/5 text-white/30 text-xs">Select date</div>
                  )}
                  {q.type === 'photo_upload' && (
                    <div className="w-full p-6 rounded-lg border-2 border-dashed border-white/15 text-white/30 text-xs text-center">Tap to upload photos</div>
                  )}
                  {q.showIf && <p className="text-v-gold/40 text-[9px] mt-1">Conditional</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
