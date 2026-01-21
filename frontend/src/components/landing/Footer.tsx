import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FacebookLogo } from '@phosphor-icons/react';
import { Logo } from '../Logo';

export function Footer() {
    const { t } = useTranslation();

    return (
        <footer dir="ltr" className="bg-slate-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8 relative z-10 text-left" >
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Logo className="h-8 w-8" showText={false} />
                            <span className="text-xl font-bold text-white">Durrah</span>
                        </div>
                        <p className="text-gray-400 mb-6">Modern exam platform for educators</p>
                        <div className="flex items-center gap-4">
                            <a
                                href="https://web.facebook.com/profile.php?id=61584207453651"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-indigo-600 hover:text-white transition-all transform hover:-translate-y-1"
                                title="Follow us on Facebook"
                            >
                                <FacebookLogo weight="fill" className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Product</h3>
                        <ul className="space-y-4">
                            <li><Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.pricing')}</Link></li>
                            <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.testimonials')}</a></li>
                            <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.blog')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">Company</h3>
                        <ul className="space-y-4">
                            <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                            <li><a href="mailto:info@durrahtutors.com" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.contact')}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">{t('footer.legalTitle')}</h4>
                        <ul className="space-y-4">
                            <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.privacy')}</Link></li>
                            <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.terms')}</Link></li>
                            <li><Link to="/refund-policy" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.refund')}</Link></li>
                            <li><Link to="/refund-policy" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.cancellation', 'Cancellation Policy')}</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                    <p>&copy; 2026 Durrah for Tutors. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
