import { OwlMascot } from './OwlMascot';

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
                <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-sm transform scale-110" />
                <OwlMascot
                    variant="logo"
                    className={`${sizeClasses[size]} relative z-10`}
                    loading="eager"
                    alt="Durrah Owl logo"
                />
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
