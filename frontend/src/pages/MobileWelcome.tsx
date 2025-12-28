import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { GraduationCap, Users, Rocket, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function MobileWelcome() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check for saved preference
        const savedPath = localStorage.getItem('durrah_mobile_path');
        if (savedPath) {
            navigate(savedPath);
        }
    }, [navigate]);

    const handleNavigation = (path: string) => {
        localStorage.setItem('durrah_mobile_path', path);
        navigate(path);
    };

    // Clear saved path on mount so back button works
    useEffect(() => {
        localStorage.removeItem('durrah_mobile_path');
    }, []);


    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants: any = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-md z-10 flex flex-col gap-8"
            >
                {/* Header / Logo */}
                <motion.div variants={itemVariants} className="flex flex-col items-center text-center space-y-4 mb-4">
                    <Logo size="lg" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">Durrah Tutors</h1>
                        <p className="text-gray-500 dark:text-gray-400">Choose your learning path</p>
                    </div>
                </motion.div>

                {/* Options */}
                <div className="space-y-4">

                    {/* Tutor Option */}
                    <motion.button
                        variants={itemVariants}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavigation('/login')}
                        className="w-full bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 group hover:border-indigo-500/50 transition-colors"
                    >
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Tutor Access</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage exams & students</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </motion.button>

                    {/* Student Portal */}
                    <motion.button
                        variants={itemVariants}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavigation('/student-portal')}
                        className="w-full bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 group hover:border-emerald-500/50 transition-colors"
                    >
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Student Portal</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Take exams & track progress</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                    </motion.button>

                    {/* Kids Adventure */}
                    <motion.button
                        variants={itemVariants}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavigation('/kids')}
                        className="w-full bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 group hover:border-violet-500/50 transition-colors"
                    >
                        <div className="p-3 bg-violet-50 dark:bg-violet-900/30 rounded-xl text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                            <Rocket className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Kids Adventure</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Fun learning & games</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-violet-600 transition-colors" />
                    </motion.button>

                </div>

                <motion.p variants={itemVariants} className="text-center text-xs text-gray-400 mt-8">
                    v1.0.0 • Mobile App
                </motion.p>
            </motion.div>
        </div>
    );
}
