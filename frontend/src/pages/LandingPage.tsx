import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-violet-200 dark:from-indigo-950 dark:to-violet-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Logo className="h-8 w-8" showText={false} />
                            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                Durrah
                            </span>
                            <span className="text-lg text-gray-600 dark:text-gray-400">for Tutors</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">Login</Link>
                            <Link to="/register" className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-2 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200">
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
                        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight transition-all duration-500 ease-in-out hover:scale-105">
                            Create Exams That
                            <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                Inspire Excellence
                            </span>
                        </h1>
                        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
                            The professional platform for creating, managing, and grading exams.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Link to="/register" className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-indigo-700 transition">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
