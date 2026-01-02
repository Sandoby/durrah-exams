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

interface SalesStats {
  totalSignups: number;
  totalLeads: number;
  conversionRate: number;
}

interface SalesEvent {
  id: string;
  type: string;
  metadata: any;
  created_at: string;
}

export default function SalesPage() {
  const [accessCode, setAccessCode] = useState('');
  const [salesAgent, setSalesAgent] = useState<SalesAgent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadForm, setLeadForm] = useState<SalesLeadForm>({ name: '', email: '', notes: '', status: 'new' });
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [stats, setStats] = useState<SalesStats>({ totalSignups: 0, totalLeads: 0, conversionRate: 0 });
  const [recentEvents, setRecentEvents] = useState<SalesEvent[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isFetchingLeads, setIsFetchingLeads] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('sales_agent_session');
    if (cached) {
      const agent = JSON.parse(cached);
      setSalesAgent(agent);
      fetchAgentData(agent.id);
      fetchLeads(agent.id);
    }
  }, []);

  const fetchLeads = async (agentId: string) => {
    setIsFetchingLeads(true);
    try {
      const { data } = await supabase
        .from('sales_leads')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (data) setLeads(data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsFetchingLeads(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sales_leads')
        .update({ status })
        .eq('id', leadId);
      
      if (error) throw error;
      toast.success('Status updated');
      if (salesAgent) fetchLeads(salesAgent.id);
      await logEvent('lead_status_updated', { leadId, status });
    } catch (err: any) {
      toast.error(err?.message || 'Update failed');
    }
  };

  const fetchAgentData = async (agentId: string) => {
    try {
      // Fetch Signups
      const { count: signupCount } = await supabase
        .from('sales_events')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('type', 'signup');

      // Fetch Leads
      const { count: leadCount } = await supabase
        .from('sales_leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // Fetch Recent Events
      const { data: events } = await supabase
        .from('sales_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5);

      const sCount = signupCount || 0;
      const lCount = leadCount || 0;
      
      setStats({
        totalSignups: sCount,
        totalLeads: lCount,
        conversionRate: lCount > 0 ? Math.round((sCount / lCount) * 100) : 0
      });
      
      if (events) setRecentEvents(events);
    } catch (err) {
      console.error('Error fetching agent data:', err);
    }
  };

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
      fetchAgentData(data.id);
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Signups</p>
            <h3 className="text-2xl font-bold text-indigo-600">{stats.totalSignups}</h3>
            <p className="text-xs text-slate-500 mt-1">Attributed via your link</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Leads</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalLeads}</h3>
            <p className="text-xs text-slate-500 mt-1">Captured in your CRM</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Conversion Rate</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.conversionRate}%</h3>
            <p className="text-xs text-slate-500 mt-1">Leads to Signups</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Recent Activity</p>
            <div className="mt-2 space-y-1">
              {recentEvents.length > 0 ? (
                recentEvents.map(event => (
                  <p key={event.id} className="text-[10px] text-slate-600 truncate">
                    • {event.type === 'signup' ? '🎉 New Signup' : event.type === 'lead_created' ? '👤 New Lead' : `⚡ ${event.type}`}
                  </p>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 italic">No recent activity</p>
              )}
            </div>
          </div>
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

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">My Leads (CRM)</h2>
            </div>
            <button 
              onClick={() => salesAgent && fetchLeads(salesAgent.id)} 
              className="text-xs text-indigo-600 hover:underline"
            >
              Refresh List
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isFetchingLeads ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading leads...</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No leads captured yet.</td></tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{lead.name || '—'}</td>
                      <td className="px-6 py-4 text-slate-600">{lead.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          lead.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                          lead.status === 'lost' ? 'bg-red-100 text-red-700' :
                          lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <select 
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          className="text-[10px] border-slate-200 rounded p-1 focus:ring-indigo-500"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

        <section className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Marketing Resource Hub</h2>
              <p className="text-indigo-100 text-sm mb-6">Download high-converting assets and share them with your leads to close deals faster.</p>
              <div className="grid grid-cols-2 gap-3">
                <ResourceButton label="Product Brochure" type="PDF" />
                <ResourceButton label="Demo Video" type="MP4" />
                <ResourceButton label="Feature List" type="DOC" />
                <ResourceButton label="Social Kit" type="ZIP" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-400" />
                Pro Tip for Partners
              </h3>
              <p className="text-sm text-indigo-50 leading-relaxed">
                "The most successful partners don't just share links—they share **outcomes**. Instead of saying 'Try this quiz tool', say 'Here is how I helped a school reduce cheating by 90% using Durrah'."
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ResourceButton({ label, type }: { label: string; type: string; }) {
  return (
    <button className="flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all group">
      <div className="text-left">
        <p className="text-xs font-bold text-indigo-300 uppercase">{type}</p>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <Rocket className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
    </button>
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
