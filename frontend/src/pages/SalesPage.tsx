import { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import {
  Search, Filter, Plus, AlertCircle, MessageCircle,
  ExternalLink, BarChart3, Activity, ChevronRight,
  MessageSquare, Mail, PlayCircle, Sparkles,
  Award, Globe, Smartphone, Users, TrendingUp,
  Briefcase, ImageIcon, FileText, Download, Share2,
  LogOut, Shield, Target, Megaphone, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';

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

type TabType = 'overview' | 'tools' | 'leads' | 'assets';

export default function SalesPage() {
  const { t } = useTranslation();
  const [accessCode, setAccessCode] = useState('');
  const [salesAgent, setSalesAgent] = useState<SalesAgent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [leadForm, setLeadForm] = useState<SalesLeadForm>({ name: '', email: '', notes: '', status: 'new' });
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [stats, setStats] = useState({ signups: 0, converted: 0, leads: 0, revenue: 0 });
  const [_recentEvents, setRecentEvents] = useState<any[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [_isFetchingStats, setIsFetchingStats] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cached = localStorage.getItem('sales_agent_session');
    if (cached) {
      const agent = JSON.parse(cached);
      setSalesAgent(agent);
      fetchStats(agent.id);
    }
  }, []);

  const fetchStats = async (agentId: string) => {
    if (!agentId) return;
    setIsFetchingStats(true);
    try {
      // 1. Fetch total signups from events
      const { count: signupCount } = await supabase
        .from('sales_events')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('type', 'signup');

      // 2. Fetch converted leads
      const { count: convCount } = await supabase
        .from('sales_leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'won');

      // 3. Fetch total potential leads
      const { count: leadCount } = await supabase
        .from('sales_leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // 4. Fetch recent events
      const { data: events } = await supabase
        .from('sales_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Fetch actual leads for the table
      const { data: leads } = await supabase
        .from('sales_leads')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        signups: signupCount || 0,
        converted: convCount || 0,
        leads: leadCount || 0,
        revenue: (convCount || 0) * 100 // Example: each 'won' lead is roughly $100
      });
      setRecentEvents(events || []);
      setLeadsList(leads || []);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsFetchingStats(false);
    }
  };

  // Background Animation Logic (Simplified version of LandingPage's)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    const particleCount = 40;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number; color: string;
      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = 'rgba(99, 102, 241, ' + (Math.random() * 0.2 + 0.1) + ')';
      }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas!.width) this.x = 0; if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0; if (this.y < 0) this.y = canvas!.height;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color; ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize(); init(); animate();
    return () => window.removeEventListener('resize', resize);
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
      toast.success(`Welcome back, ${data.name || 'Sales Partner'}`);
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://durrahsystem.tech';
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
      toast.success('Lead successfully captured');
      setLeadForm({ name: '', email: '', notes: '', status: 'new' });
      await logEvent('lead_created', { email: leadForm.email });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save lead');
    } finally {
      setIsSavingLead(false);
    }
  };

  const buildUTMLink = (medium: string, campaign: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://durrahsystem.tech';
    const base = `${origin}?ref=${salesAgent?.access_code || ''}`;
    const params = new URLSearchParams({ utm_medium: medium, utm_campaign: campaign, utm_source: 'sales' });
    return `${base}&${params.toString()}`;
  };

  if (!salesAgent) {
    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center px-4 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

        {/* Decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-1000 z-0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full"
        >
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-10 space-y-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-6">
                <Logo size="lg" className="h-16 w-16" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Sales <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Hub</span>
              </h1>
              <p className="text-slate-400 text-sm">Enter your partner access code to unlock professional marketing assets and tracking tools.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Access Code</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="DURRAH-PARTNER"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono tracking-widest text-lg"
                    maxLength={16}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? 'Decrypting Workspace...' : (
                    <>
                      Enter Workspace
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </form>

            <p className="text-center text-xs text-slate-500">
              New here? <a href="mailto:support@durrah.system" className="text-indigo-400 hover:underline">Apply for Partner Program</a>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Authenticated Sales Workspace ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* App Sidebar/Floating Nav */}
      <nav className="fixed top-0 left-0 right-0 h-20 z-50 px-4 pt-4">
        <div className="max-w-7xl mx-auto h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl shadow-xl shadow-indigo-500/5 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Logo showText={false} className="h-10 w-10" />
            <div className="flex flex-col">
              <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Partner Hub</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Session: {salesAgent.name}</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['overview', 'tools', 'leads', 'assets'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {t(`sales.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Users} label={t('sales.stats.totalSignups', 'Total Signups')} value={stats.signups.toString()} trend="All time" color="indigo" />
                <StatCard icon={TrendingUp} label={t('sales.stats.convertedLeads', 'Converted Leads')} value={stats.converted.toString()} trend="Status: Won" color="emerald" />
                <StatCard icon={BarChart3} label={t('sales.stats.totalLeads', 'Total Leads')} value={stats.leads.toString()} trend="In Pipeline" color="amber" />
                <StatCard icon={Briefcase} label={t('sales.stats.revenue', 'Potential Revenue')} value={`$${stats.revenue.toLocaleString()}`} trend="Estimate" color="purple" />
              </div>

              {/* Main Quick Actions */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('sales.overview.title', 'Growth Engine')}</h2>
                        <p className="text-slate-500 text-sm">{t('sales.overview.subtitle', 'Your custom referral engine is active and ready.')}</p>
                      </div>
                      <Sparkles className="w-8 h-8 text-indigo-500 opacity-20" />
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Primary Referral Link</p>
                        <div className="flex items-center gap-4">
                          <code className="flex-1 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 text-sm font-mono text-indigo-600 dark:text-indigo-400 truncate">
                            {shareLink}
                          </code>
                          <button
                            onClick={() => copy(shareLink, 'Referral link')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 text-center">
                        <LinkAsset icon={Globe} label="Landing Page" value="durrah.res/main" onCopy={() => copy(shareLink, 'Main link')} />
                        <LinkAsset icon={PlayCircle} label="Demo Video" value="durrah.res/demo" onCopy={() => copy(`${shareLink}&v=demo`, 'Demo link')} />
                        <LinkAsset icon={Smartphone} label="Web App" value="durrah.res/app" onCopy={() => copy(`${shareLink}&m=app`, 'App link')} />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Hot Scripts</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <ScriptCard
                        title="WhatsApp Opener"
                        body="Hi! I saw you're interested in educational tools. Durrah for Tutors is a game-changer for digital exams. Check it out here: {link}"
                        onCopy={(text) => copy(text.replace('{link}', shareLink), 'WhatsApp script')}
                      />
                      <ScriptCard
                        title="Email Follow-up"
                        body="I saved your free trial spot for Durrah. You can unlock the AI question bank and anti-cheating features instantly here: {link}"
                        onCopy={(text) => copy(text.replace('{link}', shareLink), 'Email script')}
                      />
                    </div>
                  </section>
                </div>

                <div className="space-y-8">
                  {/* Recent Activity Mini-Feed */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Live Activity</h2>
                    <div className="space-y-6">
                      {_recentEvents.length > 0 ? _recentEvents.map((event, idx) => (
                        <ActivityItem
                          key={event.id || idx}
                          icon={event.type === 'signup' ? Plus : event.type === 'lead_created' ? Target : event.type === 'conversion' ? Award : Activity}
                          color={event.type === 'signup' ? 'emerald' : event.type === 'lead_created' ? 'indigo' : event.type === 'conversion' ? 'amber' : 'slate'}
                          text={event.type === 'signup' ? 'New user registered via your link' : event.type === 'lead_created' ? 'New opportunity captured' : event.metadata?.label || event.type}
                          time={new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                      )) : (
                        <p className="text-slate-500 text-xs py-4 text-center">No recent activity detected.</p>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveTab('leads')}
                      className="w-full mt-8 py-3 rounded-xl border border-slate-100 dark:border-white/5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-bold text-sm"
                    >
                      View Full History
                    </button>
                  </section>

                  <section className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                    <div className="relative z-10">
                      <h2 className="text-xl font-black mb-2">Need Support?</h2>
                      <p className="text-indigo-100 text-sm mb-6">Our dedicated Partner manager is online to help you close deals.</p>
                      <a
                        href="https://wa.me/yourwhatsapp"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                      >
                        <MessageSquare className="w-5 h-5" />
                        Chat on WhatsApp
                      </a>
                    </div>
                    <Megaphone className="absolute bottom-[-10%] right-[-10%] w-32 h-32 text-white/10 -rotate-12 group-hover:scale-110 transition-transform duration-500" />
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                    <Target className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-black dark:text-white">Smart Link Builder</h2>
                </div>

                <p className="text-slate-500 text-sm mb-8">Create tracked links for specific platforms to see which channel performs best.</p>

                <div className="space-y-4">
                  {[
                    { label: 'WhatsApp Campaign', medium: 'whatsapp', campaign: 'winter_sale' },
                    { label: 'Email Outreach', medium: 'email', campaign: 'teacher_nurture' },
                    { label: 'Facebook / Meta Ads', medium: 'social', campaign: 'remarketing' },
                    { label: 'Direct Classroom Pitch', medium: 'direct', campaign: 'personal' }
                  ].map((preset) => (
                    <div key={preset.label} className="group bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{preset.label}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[300px]">{buildUTMLink(preset.medium, preset.campaign)}</p>
                      </div>
                      <button
                        onClick={() => copy(buildUTMLink(preset.medium, preset.campaign), preset.label)}
                        className="p-3 text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="space-y-8">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm">
                  <h2 className="text-xl font-black dark:text-white mb-6">Objection Handling</h2>
                  <div className="space-y-4">
                    <ObjectionItem title="Is it too complex?" body="Durrah is built for speed. Import your exam from Excel or Word, and the AI handles the rest in seconds." />
                    <ObjectionItem title="Can students cheat?" body="Our anti-cheating engine tracks every suspicious move, tab switch, and focus loss automatically." />
                    <ObjectionItem title="Is it expensive?" body="We have a tier for every budget, and the time saved on grading pays for the tool in the first week." />
                  </div>
                </section>

                <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="font-bold">Golden Rule</h3>
                  </div>
                  <p className="text-sm text-amber-900/70 dark:text-amber-400/70 leading-relaxed">
                    Never promise features that aren't live. Always lead with the 14-day money-back guarantee to reduce friction for hesitant teachers.
                  </p>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'leads' && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm lg:col-span-1">
                <h2 className="text-2xl font-black dark:text-white mb-8">New Opportunity</h2>
                <form onSubmit={handleLeadSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <InputField label="Contact Name" value={leadForm.name} onChange={(v) => setLeadForm({ ...leadForm, name: v })} placeholder="Ms. Sarah Jenkins" />
                    <InputField label="Email Address" value={leadForm.email} onChange={(v) => setLeadForm({ ...leadForm, email: v })} placeholder="sarah@school.edu" required />

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Initial Status</label>
                      <select
                        value={leadForm.status}
                        onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as any })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="new">New / Cold</option>
                        <option value="contacted">Contacted / Warm</option>
                        <option value="won">Converted / Won</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Notes</label>
                      <textarea
                        value={leadForm.notes}
                        onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                        placeholder="Met at math conference, interested in yearly plan..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 px-4 py-3 rounded-2xl text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    disabled={isSavingLead}
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isSavingLead ? 'Syncing...' : 'Log Opportunity'}
                  </button>
                </form>
              </section>

              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black dark:text-white">Recent Leads</h2>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"><Filter className="w-5 h-5" /></button>
                    <button className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"><Search className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-white/5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Contact</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Last Interaction</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {stats.leads > 0 ? (
                        // We need to fetch the actual leads list here or use a separate state
                        // For now, I'll add a separate state for leads as it's cleaner
                        leadsList.map((lead) => (
                          <LeadRow key={lead.id} name={lead.name || 'Anonymous'} email={lead.email} status={lead.status} time={new Date(lead.created_at).toLocaleDateString()} />
                        ))
                      ) : (
                        <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">No leads captured yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-indigo-600" />
                    <p className="text-sm font-bold text-slate-700 dark:text-indigo-300">You're 3 conversions away from 'Senior Partner' status!</p>
                  </div>
                  <button className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">View Rewards</button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'assets' && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AssetFileCard type="image" label="LinkedIn Header (English)" size="1.2 MB" color="indigo" />
                <AssetFileCard type="image" label="Instagram Square (Arabic)" size="890 KB" color="purple" />
                <AssetFileCard type="video" label="1-Minute Product Tour" size="14 MB" color="rose" />
                <AssetFileCard type="document" label="Feature Sheet PDF" size="450 KB" color="emerald" />
                <AssetFileCard type="image" label="Web Dashboard Mockup" size="2.4 MB" color="blue" />
                <AssetFileCard type="image" label="Anti-Cheating Infographic" size="1.1 MB" color="indigo" />
                <AssetFileCard type="document" label="Bulk Import Template" size="12 KB" color="slate" />
                <AssetFileCard type="video" label="Step-by-Step Setup Guide" size="88 MB" color="rose" />
              </div>

              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-10 shadow-sm overflow-hidden relative">
                <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black dark:text-white">Brand Package v2.4</h2>
                    <p className="text-slate-500 leading-relaxed">
                      Need everything? Download our complete partner kit including logos, high-res screenshots, color palettes, and certified fonts. Always stay up to date with the latest Durrah branding.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 hover:scale-105 active:scale-95">
                        <Download className="w-5 h-5" />
                        Download All Assets
                      </button>
                      <button className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Brand Guide
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-center -rotate-6 transform hover:rotate-0 transition-transform cursor-pointer">
                      <Logo size="lg" className="opacity-40" />
                    </div>
                    <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-center rotate-6 transform translate-y-8 hover:translate-y-0 hover:rotate-0 transition-all cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-indigo-500 opacity-20" />
                    </div>
                  </div>
                </div>
                <BarChart3 className="absolute top-[-10%] right-[-10%] w-64 h-64 text-slate-50 dark:text-slate-900 pointer-events-none" />
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-100 dark:border-white/5 pt-10 pb-20 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Durrah for Tutors &bull; Partner Network &bull; 2026 Edition</p>
        <div className="flex justify-center gap-6">
          <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors"><MessageCircle className="w-5 h-5" /></a>
          <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors"><Mail className="w-5 h-5" /></a>
          <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors"><Share2 className="w-5 h-5" /></a>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-Components ---

function StatCard({ icon: Icon, label, value, trend, color }: { icon: any, label: string, value: string, trend: string, color: string }) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all text-left">
      <div className={`p-3 rounded-2xl w-fit ${colors[color] || colors.indigo}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</h3>
      </div>
      <p className="text-[10px] font-bold text-slate-500">{trend}</p>
    </div>
  );
}

function LinkAsset({ icon: Icon, label, value, onCopy }: { icon: any, label: string, value: string, onCopy: () => void }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3 group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-all cursor-pointer" onClick={onCopy}>
      <Icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 mx-auto transition-colors" />
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-bold text-slate-900 dark:text-slate-300 truncate">{value}</p>
      </div>
    </div>
  );
}

function ScriptCard({ title, body, onCopy }: { title: string, body: string, onCopy: (text: string) => void }) {
  return (
    <div className="group bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 relative overflow-hidden text-left">
      <div className="flex justify-between items-center relative z-10">
        <h4 className="text-sm font-black text-slate-900 dark:text-white">{title}</h4>
        <button onClick={() => onCopy(body)} className="p-2 bg-white dark:bg-slate-700 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed relative z-10 italic">"{body}"</p>
      <Megaphone className="absolute bottom-[-10%] right-[-5%] w-16 h-16 text-indigo-500 opacity-5 -rotate-12 group-hover:scale-110 transition-transform" />
    </div>
  );
}

function ActivityItem({ icon: Icon, color, text, time }: { icon: any, color: string, text: string, time: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600'
  };

  return (
    <div className="flex items-center gap-4 text-left">
      <div className={`p-2 rounded-lg ${colors[color] || colors.slate}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-none mb-1">{text}</p>
        <p className="text-[10px] font-bold text-slate-400 leading-none">{time}</p>
      </div>
    </div>
  );
}

function ObjectionItem({ title, body }: { title: string, body: string }) {
  return (
    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-2xl text-left">
      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, required }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, required?: boolean }) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
      />
    </div>
  );
}

function LeadRow({ name, email, status, time }: { name: string, email: string, status: 'new' | 'contacted' | 'won' | 'lost', time: string }) {
  const statusColors: Record<string, string> = {
    won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    contacted: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  };

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
      <td className="px-6 py-4">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">{name}</p>
        <p className="text-[10px] font-bold text-slate-500 leading-none">{email}</p>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[status] || statusColors.new}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4">
        <p className="text-xs font-bold text-slate-500">{time}</p>
      </td>
      <td className="px-6 py-4 text-right">
        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><ExternalLink className="w-4 h-4" /></button>
      </td>
    </tr>
  );
}

function AssetFileCard({ type, label, size, color }: { type: 'image' | 'video' | 'document', label: string, size: string, color: string }) {
  const icons: Record<string, any> = { image: ImageIcon, video: PlayCircle, document: FileText };
  const colors: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    slate: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
  };

  const Icon = icons[type] || FileText;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm group hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer text-left">
      <div className={`p-4 rounded-2xl w-fit mb-6 ${colors[color] || colors.slate}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{label}</h4>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{size}</p>
      <div className="mt-6 flex justify-end">
        <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100">
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
