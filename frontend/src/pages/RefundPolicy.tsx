import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function RefundPolicy() {
    const navigate = useNavigate();

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
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Refund Policy</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: January 1, 2026</p>

                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overview</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                At Durrah for Tutors, we strive to provide the best exam creation and management platform for educators.
                                We understand that sometimes a service may not meet your expectations, and we have established this refund
                                policy to ensure transparency and fairness.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. 14-Day Money-Back Guarantee</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                We offer a <strong>14-day money-back guarantee</strong> for all paid subscriptions (Professional and Yearly plans).
                                If you are not satisfied with our service within the first 14 days of your subscription, you may request a full refund.
                            </p>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                To be eligible for a refund:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                                <li>The refund request must be made within 14 days of the initial purchase date</li>
                                <li>You must provide a valid reason for the refund request</li>
                                <li>The account must not have violated our Terms of Service</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. How to Request a Refund</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                To request a refund, please contact our support team at:
                            </p>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
                                <p className="text-gray-900 dark:text-white font-medium">Email: abdelrahmansandoby@gmail.com</p>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Please include the following information in your refund request:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                                <li>Your account email address</li>
                                <li>Transaction ID or payment confirmation</li>
                                <li>Reason for the refund request</li>
                                <li>Date of purchase</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Refund Processing Time</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Once your refund request is approved:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                                <li>Refunds will be processed within 5-7 business days</li>
                                <li>The refund will be credited to the original payment method</li>
                                <li>Depending on your bank or payment provider, it may take an additional 3-5 business days for the refund to appear in your account</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Non-Refundable Items</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                The following are not eligible for refunds:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                                <li>Subscriptions older than 14 days</li>
                                <li>Free plan subscriptions (as they are free of charge)</li>
                                <li>Partial month refunds for monthly subscriptions</li>
                                <li>Accounts that have been suspended or terminated due to Terms of Service violations</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Cancellations</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                You may cancel your subscription at any time from your account settings. Upon cancellation:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                                <li>You will retain access to paid features until the end of your current billing period</li>
                                <li>No refund will be issued for the remaining days in your billing cycle</li>
                                <li>Your subscription will not auto-renew</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Coupon and Promotional Discounts</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                If you used a coupon or promotional discount:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                                <li>Refunds will be issued for the amount actually paid after the discount</li>
                                <li>The coupon or promotional code will not be reinstated after a refund</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Changes to This Policy</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                We reserve the right to modify this refund policy at any time. Changes will be effective immediately upon
                                posting to our website. Your continued use of our service after any changes constitutes acceptance of the
                                new refund policy.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Contact Us</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                If you have any questions about our refund policy, please contact us:
                            </p>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <p className="text-gray-900 dark:text-white font-medium mb-2">Durrah for Tutors Support</p>
                                <p className="text-gray-600 dark:text-gray-300">Email: abdelrahmansandoby@gmail.com</p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
