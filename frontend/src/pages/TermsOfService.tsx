import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Shield, Scale, FileText, Lock,
    Mail, HelpCircle, Eye, RefreshCcw, Database, CreditCard,
    UserCheck, Globe, Trash2, CheckCircle2, Info, Gavel,
    Briefcase, ShieldAlert
} from 'lucide-react';
import { Logo } from '../components/Logo';

type TabType = 'tos' | 'privacy' | 'refund';

export default function TermsOfService() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('tos');

    const tosSections = [
        {
            icon: Shield,
            title: "1. Acceptance of Agreement",
            content: "By creating an account, accessing, or using Durrah Tutors (\"the Service\"), you enter into a legally binding contract with us. If you are using the Service on behalf of an educational institution or entity, you represent that you have the authority to bind that entity to these Terms. If you do not agree to these terms, you must immediately cease all use of the Service."
        },
        {
            icon: FileText,
            title: "2. Service Scope & Role",
            content: "Durrah Tutors provides a platform for educators (\"Tutors\") to design and administer digital examinations. We act as a service provider (Data Processor) while the Tutor or Institution acts as the Data Controller. We do not provide educational content directly; we facilitate its delivery and management."
        },
        {
            icon: ShieldAlert,
            title: "3. Academic Integrity & Anti-Cheating Logs",
            content: "The Service includes technical measures (e.g., full-screen enforcement, browser monitoring, activity logging) intended to deter academic dishonesty. You acknowledge that: (a) no system can prevent 100% of cheating; (b) Tutors are solely responsible for setting rules and interpreting logs; (c) Durrah Tutors is not liable for academic outcomes, false positives, or failure to detect specific cheating behaviors."
        },
        {
            icon: Lock,
            title: "4. Account Security & Responsibilities",
            content: "You are responsible for maintaining the confidentiality of your login credentials. Tutors are responsible for the actions of any students they invite to the platform. We reserve the right to suspend accounts that show patterns of suspicious activity or facilitate unauthorized sharing of accounts."
        },
        {
            icon: UserCheck,
            title: "5. Intellectual Property Rights",
            content: "You retain all ownership rights to the questions and exams you create (\"User Content\"). By using the Service, you grant Durrah Tutors a worldwide, non-exclusive license to host, store, and display your User Content solely for the purpose of providing the service to you and your students. Unauthorized scraping or distribution of our Question Bank is strictly prohibited."
        },
        {
            icon: CreditCard,
            title: "6. Merchant of Record & Payments",
            content: "Payments are processed through our partners (Paddle, PaySky, or Kashier). Paddle acts as the Merchant of Record (MoR) for international transactions, meaning they are responsible for tax collection (VAT/GST) and compliance. By purchasing a subscription, you agree to the payment terms of these respective providers."
        },
        {
            icon: Briefcase,
            title: "7. Limitation of Liability",
            content: "To the maximum extent permitted by law, Durrah Tutors shall not be liable for any indirect, incidental, or consequential damages resulting from service interruptions, loss of data, or automated grading errors. Our total liability for any claim shall not exceed the amount paid by you for the service in the 12 months preceding the claim."
        },
        {
            icon: Gavel,
            title: "8. Governing Law & Jurisdiction",
            content: "These Terms shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Egypt."
        }
    ];

    const privacySections = [
        {
            icon: Database,
            title: "1. Data Collection & Processing",
            content: "We collect Personal Information (PII) including names, email addresses, and billing details. For students, we collect name and exam responses. We also collect 'Process Data' such as IP addresses, device identifiers, and browser activity logs during exams to enable anti-cheating features."
        },
        {
            icon: Eye,
            title: "2. Purpose of Processing",
            content: "We process data to: (a) authenticate users; (b) facilitate exam administration; (c) provide Tutors with performance analytics; (d) improve platform security and prevent fraud. We do not engage in behavioral advertising or sell personal data."
        },
        {
            icon: Lock,
            title: "3. GDPR & COPPA Compliance",
            content: "We adhere to the principles of GDPR (for EU/UK users) and COPPA (for US users). Tutors/Schools using our platform with minors are responsible for obtaining appropriate parental consent or relying on institutional consent where permitted by law."
        },
        {
            icon: Globe,
            title: "4. Data Sub-processors",
            content: "We use trusted third-party services to provide the Service, including Supabase (Data Hosting), Paddle (Payment Processing), and Resend (Email Delivery). Each sub-processor is vetted for security compliance."
        },
        {
            icon: Trash2,
            title: "5. Data Subjects' Rights",
            content: "Users have the right to access, rectify, or request the deletion of their personal data. Tutors can manage and delete student data at any time. To exercise these rights, contact us at abdelrahmansandoby@gmail.com."
        }
    ];

    const refundSections = [
        {
            icon: RefreshCcw,
            title: "1. 7-Day Satisfaction Guarantee",
            content: "We offer a 7-day money-back guarantee for initial subscription purchases. If the Service does not meet your expectations, you may request a full refund within 7 calendar days of your first payment."
        },
        {
            icon: Shield,
            title: "2. Eligibility Criteria",
            content: "Refunds are eligible for: (a) Technical failure of core features; (b) Significant discrepancy between advertised features and reality. Refunds are NOT eligible for: (a) Usage violations; (b) Change of mind after the 7-day window; (c) Renewal payments."
        },
        {
            icon: CreditCard,
            title: "3. Refund Request Process",
            content: "To initiate a refund, email abdelrahmansandoby@gmail.com with your Order ID and reason for the request. We aim to review and process eligible requests within 5-10 business days."
        },
        {
            icon: Trash2,
            title: "4. Subscription Cancellation",
            content: "You can cancel your subscription at any time via your Settings page. Cancellation prevents future billing but does not trigger a partial refund for the remaining time in the current cycle."
        }
    ];

    const renderSections = (sections: any[]) => (
        <div className="space-y-6">
            {sections.map((section, idx) => (
                <div key={idx} className="group relative overflow-hidden flex gap-5 p-8 rounded-3xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-xl hover:border-indigo-500/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="flex-shrink-0">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl group-hover:scale-110 transition-transform">
                            <section.icon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{section.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">{section.content}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
            {/* Header */}
            <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
                        <Logo className="h-8 w-8 text-indigo-600 transition-transform group-hover:rotate-12" showText={false} />
                        <div className="ml-2 flex flex-col -mt-1">
                            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">Durrah</span>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest -mt-1">Legal Hub</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center px-5 py-2.5 rounded-2xl text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 transition-all font-bold text-sm"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                        Return Home
                    </button>
                </div>
            </header>

            {/* Premium Hero */}
            <div className="relative bg-slate-950 py-24 px-4 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-xs font-black uppercase tracking-widest mb-8">
                        <Lock className="h-3 w-3" />
                        Trusted & Transparent
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">
                        Legal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Integrity</span>
                    </h1>
                    <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                        Our commitments to your privacy, rights, and the security of your educational content, refined for international standards.
                    </p>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-32">
                {/* Modern Switcher Tabs */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-2xl flex gap-2 mb-12 sticky top-20 z-40 border border-white/20 dark:border-gray-700/30">
                    {(['tos', 'privacy', 'refund'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-4 px-6 rounded-[2rem] font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === tab
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 translate-y-[-2px]'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            {tab === 'tos' && <FileText className="h-5 w-5" />}
                            {tab === 'privacy' && <Eye className="h-5 w-5" />}
                            {tab === 'refund' && <RefreshCcw className="h-5 w-5" />}
                            {tab === 'tos' ? 'Terms of Service' : tab === 'privacy' ? 'Privacy Policy' : 'Refund Policy'}
                        </button>
                    ))}
                </div>

                {/* Sub-header info */}
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-indigo-500" />
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Latest Documentation</p>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white mt-1">
                            {activeTab === 'tos' && "Contractual Terms"}
                            {activeTab === 'privacy' && "Data Protection"}
                            {activeTab === 'refund' && "Consumer Rights"}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right flex flex-col">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Version Control</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">v1.2.0 • Dec 2025</span>
                        </div>
                        <div className="h-10 w-[1px] bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Legally Enforced
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/1 rounded-[3rem] blur-3xl -z-10"></div>
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {activeTab === 'tos' && renderSections(tosSections)}
                        {activeTab === 'privacy' && renderSections(privacySections)}
                        {activeTab === 'refund' && renderSections(refundSections)}
                    </div>
                </div>

                {/* Enterprise Support Section */}
                <div className="mt-24 group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[3rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[3rem] p-8 md:p-12 shadow-2xl flex flex-col lg:flex-row items-center gap-10">
                        <div className="lg:w-2/3">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg ring-4 ring-indigo-500/20">
                                    <HelpCircle className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Need legal clarification?</h3>
                            </div>
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8">
                                For inquiries regarding Data Processing Agreements (DPA), bulk educational licensing, or specific legal questions, our compliance officer is available.
                            </p>
                            <div className="inline-flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                                    <Mail className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Official Legal Channel</span>
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">abdelrahmansandoby@gmail.com</span>
                                </div>
                            </div>
                        </div>
                        <div className="lg:w-1/3 w-full flex flex-col gap-4">
                            <a
                                href="mailto:abdelrahmansandoby@gmail.com"
                                className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Mail className="h-6 w-6" />
                                Send Message
                            </a>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <Globe className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Global Ops</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <Scale className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Compliant</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Notice */}
                <div className="mt-16 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500 font-bold max-w-2xl mx-auto italic leading-relaxed">
                        Notice: Durrah Tutors reserves the right to modify these agreements. Your continued use of the platform constitutes unconditional acceptance of the latest version.
                    </p>
                </div>
            </main>
        </div>
    );
}
