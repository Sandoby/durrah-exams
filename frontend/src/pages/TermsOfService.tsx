import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Shield, Scale, FileText, Lock,
    Briefcase, ShieldAlert, CreditCard, UserCheck, Gavel,
    HelpCircle, Mail
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { Helmet } from 'react-helmet-async';

export default function TermsOfService() {
    const navigate = useNavigate();

    const sections = [
        {
            icon: Shield,
            title: "1. Definitions & Legal Entity",
            content: "\"Durrah for Tutors\" refers to the legal entity and service provider operating this platform. Throughout these Terms, \"we\", \"us\", \"our\", and \"the Company\" refer to Durrah for Tutors. \"You\" and \"User\" refer to any individual or entity accessing the Service."
        },
        {
            icon: FileText,
            title: "2. Acceptance of Agreement",
            content: "By creating an account, accessing, or using Durrah for Tutors (\"the Service\"), you enter into a legally binding contract with us. If you are using the Service on behalf of an educational institution or entity, you represent that you have the authority to bind that entity to these Terms. If you do not agree to these terms, you must immediately cease all use of the Service."
        },
        {
            icon: Briefcase,
            title: "3. Service Scope & Role",
            content: "Durrah for Tutors provides a platform for educators (\"Tutors\") to design and administer digital examinations. We act as a service provider (Data Processor) while the Tutor or Institution acts as the Data Controller. We do not provide educational content directly; we facilitate its delivery and management."
        },
        {
            icon: ShieldAlert,
            title: "4. Academic Integrity & Anti-Cheating Logs",
            content: "The Service includes technical measures (e.g., full-screen enforcement, browser monitoring, activity logging) intended to deter academic dishonesty. You acknowledge that: (a) no system can prevent 100% of cheating; (b) Tutors are solely responsible for setting rules and interpreting logs; (c) Durrah for Tutors is not liable for academic outcomes, false positives, or failure to detect specific cheating behaviors."
        },
        {
            icon: Lock,
            title: "5. Account Security & Responsibilities",
            content: "You are responsible for maintaining the confidentiality of your login credentials. Tutors are responsible for the actions of any students they invite to the platform. We reserve the right to suspend accounts that show patterns of suspicious activity or facilitate unauthorized sharing of accounts."
        },
        {
            icon: UserCheck,
            title: "6. Intellectual Property Rights",
            content: "You retain all ownership rights to the questions and exams you create (\"User Content\"). By using the Service, you grant Durrah for Tutors a worldwide, non-exclusive license to host, store, and display your User Content solely for the purpose of providing the service to you and your students. Unauthorized scraping or distribution of our Question Bank is strictly prohibited."
        },
        {
            icon: CreditCard,
            title: "7. Merchant of Record & Payments",
            content: "Payments are processed through our partners (Paddle, PaySky, or Kashier). Paddle acts as the Merchant of Record (MoR) for international transactions, meaning they are responsible for tax collection (VAT/GST) and compliance. By purchasing a subscription, you agree to the payment terms of these respective providers."
        },
        {
            icon: Briefcase,
            title: "8. Limitation of Liability",
            content: "To the maximum extent permitted by law, Durrah for Tutors shall not be liable for any indirect, incidental, or consequential damages resulting from service interruptions, loss of data, or automated grading errors. Our total liability for any claim shall not exceed the amount paid by you for the service in the 12 months preceding the claim."
        },
        {
            icon: Gavel,
            title: "9. Governing Law & Jurisdiction",
            content: "These Terms shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Egypt."
        }
    ];

    // Helper for navigation
    const navigateTo = (path: string) => navigate(path);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Helmet>
                <title>Terms of Service - Durrah for Tutors</title>
                <meta name="description" content="Review the Terms of Service for Durrah for Tutors. Understand the agreement, academic integrity measures, and legal framework for using our exam platform." />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://durrahtutors.com/terms" />
                <meta property="og:title" content="Terms of Service - Durrah for Tutors" />
                <meta property="og:description" content="Understand your rights and responsibilities when using Durrah for Tutors." />
                <meta property="og:url" content="https://durrahtutors.com/terms" />
                <meta property="og:type" content="website" />
            </Helmet>
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
                        <Logo className="h-8 w-8 text-indigo-600" showText={false} />
                        <div className="ml-2 flex items-baseline">
                            <span className="text-2xl font-bold text-indigo-600">Durrah</span>
                            <span className="ml-1.5 text-2xl font-light text-gray-500 dark:text-gray-300">for Tutors</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-6">
                            <Scale className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Please read these terms carefully before using Durrah for Tutors. They define your rights, responsibilities, and our commitment to a fair and secure platform.
                        </p>
                    </div>

                    <div className="space-y-8 mb-16">
                        {sections.map((section, index) => (
                            <div key={index} className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                        <section.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {section.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Related Legal Documents */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-8 mb-12 border border-indigo-100 dark:border-indigo-800/50">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Related Legal Documents
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div
                                onClick={() => navigateTo('/privacy')}
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Privacy Policy</h4>
                                <p className="text-xs text-gray-500 mt-1">Data collection & rights</p>
                            </div>

                            <div
                                onClick={() => navigateTo('/refund-policy')}
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Refund Policy</h4>
                                <p className="text-xs text-gray-500 mt-1">14-day money-back guarantee</p>
                            </div>

                            <div
                                onClick={() => navigateTo('/pricing')}
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Pricing & Plans</h4>
                                <p className="text-xs text-gray-500 mt-1">Subscription details</p>
                            </div>
                        </div>
                    </div>

                    {/* Support Contact */}
                    <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                    <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Questions about our Terms?</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Our support team is here to help.</p>
                                </div>
                            </div>
                            <a
                                href="mailto:info@durrahtutors.com"
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors shadow-sm"
                            >
                                <Mail className="w-4 h-4" />
                                info@durrahtutors.com
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>Last updated: January 2026</p>
                    <p className="mt-2 text-xs opacity-60">Durrah for Tutors © 2026. All rights reserved.</p>
                </div>
            </main>
        </div>
    );
}
