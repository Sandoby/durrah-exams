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
                            <Logo size="md" showText={false} />
                            <span className="text-xl font-bold text-white">Durrah</span>
                        </div>
                        <p className="text-gray-400 mb-6">{t('footer.desc')}</p>
                        <div className="flex items-center gap-4">
                            <a
                                href="https://web.facebook.com/profile.php?id=61584207453651"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                title="Follow us on Facebook"
                                aria-label="Follow Durrah for Tutors on Facebook"
                            >
                                <FacebookLogo weight="fill" className="h-[18px] w-[18px]" />
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">{t('footer.product')}</h3>
                        <ul className="space-y-4">
                            <li><Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.pricing')}</Link></li>
                            <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.testimonials')}</a></li>
                            <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.blog')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4">{t('footer.company')}</h3>
                        <ul className="space-y-4">
                            <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">{t('footer.about')}</Link></li>
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
                    <p>{t('footer.copyright')}</p>
                </div>
            </div>
        </footer>
    );
}
