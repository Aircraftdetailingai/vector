"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CUSTOMER_TYPES = [
  { value: 'fbo', label: 'FBO (Fixed Base Operator)' },
  { value: 'part135', label: 'Part 135 Charter Operator' },
  { value: 'fractional', label: 'Fractional Ownership (NetJets, Flexjet, etc.)' },
  { value: 'corporate', label: 'Corporate Flight Department' },
  { value: 'private_owner', label: 'Private Aircraft Owner' },
  { value: 'management', label: 'Aircraft Management Company' },
  { value: 'mro', label: 'MRO / Maintenance Facility' },
  { value: 'broker', label: 'Aircraft Broker / Sales' },
];

const SCRIPT_TYPE_LABELS = {
  cold_call: 'Cold Call',
  email: 'Email',
  linkedin: 'LinkedIn',
  follow_up: 'Follow-Up',
  objection_handler: 'Objection Handler',
  general: 'General',
};

const SCRIPT_TYPE_COLORS = {
  cold_call: 'bg-blue-100 text-blue-700',
  email: 'bg-purple-100 text-purple-700',
  linkedin: 'bg-sky-100 text-sky-700',
  follow_up: 'bg-amber-100 text-amber-700',
  objection_handler: 'bg-red-100 text-red-700',
  general: 'bg-gray-100 text-gray-700',
};

const PROGRESS_STEPS = [
  'Searching company info...',
  'Finding recent news...',
  'Analyzing fleet data...',
  'Researching contact...',
  'Generating personalized scripts...',
];

export default function SalesAssistantPage() {
  const router = useRouter();
  const [customerType, setCustomerType] = useState('');
  const [servicesOffered, setServicesOffered] = useState('');
  const [researchMode, setResearchMode] = useState(false);

  // Prospect fields
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [location, setLocation] = useState('');

  // Results
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [researchSummary, setResearchSummary] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/sales-assistant', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.scripts || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const generate = async () => {
    if (!customerType) {
      setError('Please select a customer type');
      return;
    }
    if (researchMode && !companyName.trim()) {
      setError('Please enter a company name for prospect research');
      return;
    }

    setLoading(true);
    setError('');
    setResearchSummary(null);
    setScripts([]);
    setProgressStep(0);

    // Animate progress steps
    const interval = researchMode ? setInterval(() => {
      setProgressStep(prev => prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev);
    }, 2500) : null;

    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/sales-assistant/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_type: CUSTOMER_TYPES.find(t => t.value === customerType)?.label || customerType,
          services_offered: servicesOffered || null,
          company_name: researchMode ? companyName : null,
          contact_name: researchMode ? contactName : null,
          contact_title: researchMode ? contactTitle : null,
          website_url: researchMode ? websiteUrl : null,
          linkedin_url: researchMode ? linkedinUrl : null,
          location: researchMode ? location : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate scripts');
        return;
      }

      setResearchSummary(data.research_summary);
      setScripts(data.scripts || []);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      if (interval) clearInterval(interval);
      setLoading(false);
    }
  };

  const copyScript = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const loadFromHistory = (item) => {
    setResearchSummary(item.research_summary);
    setScripts(item.scripts || []);
    setShowHistory(false);
    if (item.company_name) {
      setResearchMode(true);
      setCompanyName(item.company_name);
      setContactName(item.contact_name || '');
      setContactTitle(item.contact_title || '');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      <header className="text-white flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <a href="/growth" className="text-2xl hover:text-amber-400">&#8592;</a>
          <div>
            <h1 className="text-2xl font-bold">AI Sales Assistant</h1>
            <p className="text-sm text-gray-400">Generate personalized pitches with prospect research</p>
          </div>
        </div>
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory && history.length === 0) fetchHistory(); }}
          className="px-4 py-2 text-sm border border-white/30 rounded-lg text-white hover:bg-white/10"
        >
          {showHistory ? 'Back to Generator' : 'History'}
        </button>
      </header>

      <div className="max-w-4xl mx-auto">
        {/* History View */}
        {showHistory ? (
          <div className="space-y-4">
            <h2 className="text-white text-lg font-semibold">Past Generations</h2>
            {historyLoading ? (
              <div className="text-gray-400 text-center py-8">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No saved scripts yet. Generate your first one!</div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="w-full text-left bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">
                        {item.company_name || item.customer_type}
                      </p>
                      {item.contact_name && (
                        <p className="text-gray-400 text-sm">{item.contact_name}{item.contact_title ? ` - ${item.contact_title}` : ''}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">{item.customer_type}</p>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Generator Form */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              {/* Prospect Research Toggle */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setResearchMode(!researchMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${researchMode ? 'bg-indigo-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${researchMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Research a Prospect</span>
                    <p className="text-xs text-gray-500">AI will research the company and personalize scripts</p>
                  </div>
                </label>
              </div>

              <div className="p-6 space-y-5">
                {/* Prospect Fields (shown when research mode on) */}
                {researchMode && (
                  <div className="bg-indigo-50 rounded-lg p-4 space-y-4 border border-indigo-200">
                    <h3 className="font-semibold text-indigo-900 text-sm">Prospect Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g., NetJets, Meridian Teterboro"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location / Airport</label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., KTEB or Teterboro, NJ"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g., John Smith"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Title</label>
                        <input
                          type="text"
                          value={contactTitle}
                          onChange={(e) => setContactTitle(e.target.value)}
                          placeholder="e.g., Director of Maintenance"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://www.company.com"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                        <input
                          type="url"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type *</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select customer type...</option>
                    {CUSTOMER_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Services */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Services <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={servicesOffered}
                    onChange={(e) => setServicesOffered(e.target.value)}
                    placeholder="e.g., Full exterior detail, ceramic coating, paint correction, interior deep clean, brightwork polishing"
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 resize-y min-h-[40px]"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
                )}

                <button
                  onClick={generate}
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (researchMode ? 'Researching & Generating...' : 'Generating...') : (researchMode ? 'Generate with Research' : 'Generate Scripts')}
                </button>
              </div>
            </div>

            {/* Loading Progress */}
            {loading && researchMode && (
              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <div className="space-y-3">
                  {PROGRESS_STEPS.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {i < progressStep ? (
                        <span className="text-green-400 text-lg">&#10003;</span>
                      ) : i === progressStep ? (
                        <span className="text-amber-400 animate-pulse text-lg">&#9679;</span>
                      ) : (
                        <span className="text-gray-600 text-lg">&#9675;</span>
                      )}
                      <span className={`text-sm ${i <= progressStep ? 'text-white' : 'text-gray-500'}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research Summary */}
            {researchSummary && (
              <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 rounded-xl p-6 mb-6 border border-indigo-500/30">
                <h3 className="text-indigo-200 font-semibold text-sm uppercase tracking-wide mb-3">Prospect Research Summary</h3>
                <div className="text-white leading-relaxed whitespace-pre-line">{researchSummary}</div>
              </div>
            )}

            {/* Generated Scripts */}
            {scripts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-white text-lg font-semibold">Generated Scripts</h2>
                {scripts.map((script, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${SCRIPT_TYPE_COLORS[script.type] || SCRIPT_TYPE_COLORS.general}`}>
                          {SCRIPT_TYPE_LABELS[script.type] || script.type}
                        </span>
                        <h3 className="font-semibold text-gray-900">{script.title}</h3>
                      </div>
                      <button
                        onClick={() => copyScript(script.content, idx)}
                        className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {copied === idx ? '&#10003; Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="whitespace-pre-line text-gray-800 text-sm leading-relaxed">{script.content}</div>
                      {script.tips && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-xs font-medium text-amber-800 mb-1">Tips</p>
                          <p className="text-sm text-amber-700">{script.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
