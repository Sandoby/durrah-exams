import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Eye, Lock, Globe, Trash2 } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    const sections = [
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Durrah for Tutors is committed to protecting your privacy and ensuring the security of your data.
                        </p>
                    </div>

                    <div className="space-y-8">
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

                    {/* Support Contact */}
                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Privacy Questions?</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Contact our Data Protection Officer</p>
                            </div>
                            <a
                                href="mailto:abdelrahmansandoby@gmail.com"
                                className="px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors shadow-sm"
                            >
                                abdelrahmansandoby@gmail.com
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
