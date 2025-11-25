import { Link } from 'react-router-dom';
import { Check, Zap, BarChart3, Shield, Globe, Users, ArrowRight, Star, MessageCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Logo className="h-8 w-8" />
                            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Durrah
                            </span>
                            <span className="text-lg text-gray-600 dark:text-gray-400">for Tutors</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">Features</a>
                            <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">Pricing</a>
                            <a href="#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">Testimonials</a>
                            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">Login</Link>
                            <Link to="/register" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200">
                                Get Started Free
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                            Create Exams That
                            <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Inspire Excellence
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                            The modern exam platform trusted by tutors worldwide. Create, distribute, and grade exams with powerful analytics and anti-cheating features.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link to="/register" className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center">
                                Start Free Trial
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a href="#features" className="px-8 py-4 rounded-full text-lg font-semibold text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200">
                                Watch Demo
                            </a>
                        </div>
                        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                No credit card required
                            </div>
                            <div className="flex items-center">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                Free for up to 3 exams
                            </div>
                            <div className="flex items-center">
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                Cancel anytime
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
                        <div>
                            <div className="text-4xl md:text-5xl font-bold mb-2">10K+</div>
                            <div className="text-indigo-100">Active Tutors</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold mb-2">500K+</div>
                            <div className="text-indigo-100">Exams Created</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold mb-2">2M+</div>
                            <div className="text-indigo-100">Students Tested</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold mb-2">150+</div>
                            <div className="text-indigo-100">Countries</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            Everything You Need to Excel
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Powerful features designed specifically for modern educators
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Zap,
                                title: 'Lightning Fast Creation',
                                description: 'Create professional exams in minutes with our intuitive interface. Multiple question types supported.',
                                gradient: 'from-yellow-400 to-orange-500'
                            },
                            {
                                icon: Shield,
                                title: 'Advanced Anti-Cheating',
                                description: 'Fullscreen mode, tab switching detection, copy-paste prevention, and violation tracking.',
                                gradient: 'from-green-400 to-emerald-500'
                            },
                            {
                                icon: BarChart3,
                                title: 'Powerful Analytics',
                                description: 'Deep insights into student performance with detailed analytics and exportable reports.',
                                gradient: 'from-blue-400 to-indigo-500'
                            },
                            {
                                icon: Globe,
                                title: 'Global Accessibility',
                                description: 'Share exams worldwide with unique links. Students can access from any device, anywhere.',
                                gradient: 'from-purple-400 to-pink-500'
                            },
                            {
                                icon: Users,
                                title: 'Unlimited Students',
                                description: 'No limits on the number of students who can take your exams. Scale effortlessly.',
                                gradient: 'from-red-400 to-rose-500'
                            },
                            {
                                icon: MessageCircle,
                                title: '24/7 Support',
                                description: 'Get help whenever you need it with our dedicated support team and comprehensive documentation.',
                                gradient: 'from-cyan-400 to-blue-500'
                            }
                        ].map((feature, index) => (
                            <div key={index} className="group p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="h-7 w-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">
                            Start free, upgrade when you're ready
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Starter</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-gray-900 dark:text-white">Free</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-300">Up to 3 exams</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-300">100 students per exam</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-300">Basic analytics</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-300">Email support</span>
                                </li>
                            </ul>
                            <Link to="/register" className="block w-full text-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                                Get Started
                            </Link>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 relative overflow-hidden transform hover:scale-105 transition-transform">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 rounded-bl-xl font-bold text-sm">
                                POPULAR
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-white">200 EGP</span>
                                <span className="text-indigo-100">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-white mr-3 flex-shrink-0" />
                                    <span className="text-indigo-50">Unlimited exams</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-white mr-3 flex-shrink-0" />
                                    <span className="text-indigo-50">Unlimited students</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-white mr-3 flex-shrink-0" />
                                    <span className="text-indigo-50">Advanced analytics & insights</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-white mr-3 flex-shrink-0" />
                                    <span className="text-indigo-50">Priority support</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="h-6 w-6 text-white mr-3 flex-shrink-0" />
                                    <span className="text-indigo-50">All anti-cheating features</span>
                                </li>
                            </ul>
                            <Link to="/checkout" className="block w-full text-center bg-white text-indigo-600 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition shadow-lg">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            Loved by Tutors Worldwide
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">
                            See what educators are saying about Durrah
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: 'Sarah Johnson',
                                role: 'Math Tutor, USA',
                                content: 'Durrah has transformed how I create and grade exams. The analytics help me understand exactly where my students need help.',
                                rating: 5
                            },
                            {
                                name: 'Ahmed Hassan',
                                role: 'Physics Teacher, Egypt',
                                content: 'The anti-cheating features give me peace of mind. I can trust that my students are doing their own work.',
                                rating: 5
                            },
                            {
                                name: 'Maria Garcia',
                                role: 'Language Instructor, Spain',
                                content: 'Creating exams used to take hours. Now I can do it in minutes and focus more on teaching. Absolutely worth it!',
                                rating: 5
                            }
                        ].map((testimonial, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                                <div className="flex mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                                    ))}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">{testimonial.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to Transform Your Teaching?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-8">
                        Join thousands of tutors who trust Durrah for their exam needs
                    </p>
                    <Link to="/register" className="inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-200">
                        Start Your Free Trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <Logo className="h-8 w-8" />
                                <span className="text-xl font-bold text-white">Durrah</span>
                            </div>
                            <p className="text-gray-400">
                                The modern exam platform for tutors worldwide.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">Product</h3>
                            <ul className="space-y-2">
                                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                                <li><Link to="/register" className="hover:text-white transition">Sign Up</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">Support</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">Legal</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                        <p>&copy; 2024 Durrah for Tutors. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
