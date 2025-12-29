import { GraduationCap } from 'lucide-react';

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    const textClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-3xl',
        xl: 'text-4xl'
    };

    return (
        <div className={`flex items-center logo ${className}`}>
            <div className="relative flex items-center justify-center">
                <div className={`absolute inset-0 bg-indigo-600 rounded-full opacity-20 blur-sm transform scale-110`}></div>
                <GraduationCap className={`${sizeClasses[size]} text-indigo-600 relative z-10`} />
            </div>
            {showText && (
                <div className={`ml-3 font-bold text-gray-900 dark:text-white ${textClasses[size]} tracking-tight flex items-baseline`}>
                    <span className="text-indigo-600">Durrah</span>
                    <span className="text-gray-500 dark:text-gray-400 font-light ml-1.5">for Tutors</span>
                </div>
            )}
        </div>
    );
}
