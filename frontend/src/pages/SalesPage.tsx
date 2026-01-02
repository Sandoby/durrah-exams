import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { CheckCircle, Copy, LogOut, Rocket, Shield, Target, TrendingUp, Megaphone } from 'lucide-react';

interface SalesAgent {
  id: string;
  name: string;
  email: string;
  access_code: string;
  is_active: boolean;
  created_at: string;
}

interface SalesLeadForm {
  name: string;
  email: string;
  notes: string;
  status: 'new' | 'contacted' | 'won' | 'lost';
}

export default function SalesPage() {
  const [accessCode, setAccessCode] = useState('');
  const [salesAgent, setSalesAgent] = useState<SalesAgent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadForm, setLeadForm] = useState<SalesLeadForm>({ name: '', email: '', notes: '', status: 'new' });
  const [isSavingLead, setIsSavingLead] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('sales_agent_session');
    if (cached) {
      setSalesAgent(JSON.parse(cached));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return toast.error('Enter your access code');
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_agents')
        .select('*')
        .eq('access_code', accessCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) throw new Error('Invalid or inactive code');
      setSalesAgent(data);
      localStorage.setItem('sales_agent_session', JSON.stringify(data));
      toast.success(`Welcome ${data.name || 'Sales Partner'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setSalesAgent(null);
    localStorage.removeItem('sales_agent_session');
  };

  const logEvent = async (type: string, metadata: Record<string, any> = {}) => {
    if (!salesAgent) return;
    try {
      await supabase.from('sales_events').insert({
        agent_id: salesAgent.id,
        type,
        metadata
      });
    } catch (err) {
      console.error('logEvent error', err);
    }
  };

  const shareLink = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://durrahacademy.com';
    if (!salesAgent?.access_code) return origin;
    return `${origin}?ref=${salesAgent.access_code}`;
  }, [salesAgent]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
      await logEvent('copy', { label, text });
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesAgent) return;
    if (!leadForm.email.trim()) return toast.error('Email required');
    setIsSavingLead(true);
    try {
      const { error } = await supabase.from('sales_leads').insert({
        agent_id: salesAgent.id,
        name: leadForm.name || null,
        email: leadForm.email,
        notes: leadForm.notes || null,
        status: leadForm.status
      });
      if (error) throw error;
      toast.success('Lead saved');
      setLeadForm({ name: '', email: '', notes: '', status: 'new' });
      await logEvent('lead_created', { email: leadForm.email });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save lead');
    } finally {
      setIsSavingLead(false);
    }
  };

  const buildUTMLink = (medium: string, campaign: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://durrahacademy.com';
    const base = `${origin}?ref=${salesAgent?.access_code || ''}`;
    const params = new URLSearchParams({ utm_medium: medium, utm_campaign: campaign, utm_source: 'sales' });
    return `${base}&${params.toString()}`;
  };

  if (!salesAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-8 space-y-6 border border-indigo-100">
          <div className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Sales Access</p>
              <h1 className="text-2xl font-bold text-gray-900">Unlock the Sales Playbook</h1>
            </div>
          </div>
          <p className="text-sm text-gray-600">Enter your sales access code to view scripts, offers, and tools to boost revenue.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="text-sm font-medium text-gray-700">Access Code</label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="SALES-2024"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest font-semibold text-gray-900"
              maxLength={16}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {isLoading ? 'Checking...' : 'Enter Workspace'}
            </button>
          </form>
          <div className="bg-indigo-50 rounded-xl p-4 text-xs text-indigo-800">
            Tip: Ask the Admin for a new code if yours expired.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-xs uppercase text-slate-500 font-semibold">Sales Workspace</p>
          <h1 className="text-xl font-bold text-slate-900">Hi {salesAgent.name || 'Sales Partner'} — let’s grow revenue</h1>
          <p className="text-xs text-slate-500">Share link: <button onClick={() => copy(shareLink, 'Share link')} className="text-indigo-600 underline">{shareLink}</button></p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{
            title: 'Upsell to Paid',
            value: 'Upgrade script',
            desc: 'Use this to convert free users after trial ends.',
          }, {
            title: 'Referrals',
            value: 'Share your link',
            desc: 'Each signup via your link is attributed to you.',
          }, {
            title: 'Coupons',
            value: 'Create tailored offers',
            desc: 'Ask admin for campaign-specific coupons.',
          }, {
            title: 'Retention',
            value: 'Win-back email',
            desc: 'Use the follow-up template below.',
          }].map((card) => (
            <div key={card.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">{card.title}</p>
              <h3 className="text-lg font-bold text-slate-900">{card.value}</h3>
              <p className="text-xs text-slate-500 mt-2">{card.desc}</p>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MegaphoneIcon />
              <h2 className="text-lg font-bold text-slate-900">Instant Offer Scripts</h2>
            </div>
            <div className="space-y-4 text-sm text-slate-700">
              <PitchCard
                title="Free → Paid upsell"
                body="I noticed you’ve been using the free plan. I can secure you a 20% welcome discount today, and you’ll unlock unlimited exams, analytics, and pro support. Want me to activate it?"
                onCopy={(text) => copy(text, 'Upsell script')}
              />
              <PitchCard
                title="Referral nudge"
                body="Share your custom link and earn a free week for every friend who signs up. Here’s your link: {link}"
                substitute={shareLink}
                onCopy={(text) => copy(text, 'Referral script')}
              />
              <PitchCard
                title="Win-back email"
                body="We saved your progress. Reactivate now with your reserved discount and keep all your exams live. I can apply it immediately—should I proceed?"
                onCopy={(text) => copy(text, 'Win-back email')}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Campaign Boosters</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />Create a limited-time coupon for each campaign and track conversions.</li>
              <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />Lead with outcomes: “Publish exams in minutes, track scores instantly, no IT help.”</li>
              <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />Offer onboarding calls for paid signups; schedule within 24 hours.</li>
              <li className="flex gap-2 items-start"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />Pair every outbound batch with your referral link to attribute wins.</li>
            </ul>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Capture Lead</h2>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  placeholder="Name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  placeholder="Email *"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <textarea
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                placeholder="Notes / objection / next step"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <select
                  value={leadForm.status}
                  onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as SalesLeadForm['status'] })}
                  className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSavingLead}
                className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSavingLead ? 'Saving...' : 'Save Lead'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">Link Builder (with UTM)</h2>
            </div>
            <div className="space-y-3 text-sm">
              {[{ label: 'WhatsApp Blitz', medium: 'whatsapp', campaign: 'blitz' }, { label: 'Email Nurture', medium: 'email', campaign: 'nurture' }, { label: 'Ads Remarketing', medium: 'ads', campaign: 'remarketing' }].map((preset) => {
                const url = buildUTMLink(preset.medium, preset.campaign);
                return (
                  <div key={preset.label} className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3 bg-slate-50">
                    <div>
                      <p className="text-xs uppercase text-slate-500 font-semibold">{preset.label}</p>
                      <p className="text-xs text-slate-600 truncate max-w-[300px]">{url}</p>
                    </div>
                    <button onClick={() => copy(url, `${preset.label} link`)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Objection Handling</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <Bullet title="Too expensive" body="We have a starter paid tier that keeps your exams live and includes analytics. I can lock a discount today." />
              <Bullet title="No time" body="Setup takes minutes—import questions, share link, see scores instantly." />
              <Bullet title="Will it work for us?" body="Hundreds of teachers already run weekly exams with this workflow. Let’s run a free pilot; I’ll help set it up." />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">Playbook Links</h2>
            </div>
            <div className="space-y-2 text-sm">
              <LinkRow label="Referral link" value={shareLink} onCopy={() => copy(shareLink, 'Referral link')} />
              <LinkRow label="Admin mockups" value={`${shareLink}&asset=mockups`} onCopy={() => copy(`${shareLink}&asset=mockups`, 'Mockups link')} />
              <LinkRow label="Upgrade CTA" value="Unlimited exams + analytics + support" onCopy={() => copy('Unlimited exams + analytics + support', 'Upgrade CTA')} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function PitchCard({ title, body, substitute, onCopy }: { title: string; body: string; substitute?: string; onCopy: (text: string) => void; }) {
  const text = substitute ? body.replace('{link}', substitute) : body;
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{text}</p>
        </div>
        <button onClick={() => onCopy(text)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Bullet({ title, body }: { title: string; body: string; }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-xs">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function LinkRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void; }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3 py-2 bg-white">
      <div>
        <p className="text-xs uppercase text-slate-500 font-semibold">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate max-w-[360px]">{value}</p>
      </div>
      <button onClick={onCopy} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}

function MegaphoneIcon() {
  return <Megaphone className="w-5 h-5 text-indigo-600" />;
}
