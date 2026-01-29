

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
    // Container sizes (visible area)
    const containerClasses = {
        sm: 'h-10 w-10',
        md: 'h-12 w-12',
        lg: 'h-16 w-16',
        xl: 'h-24 w-24'
    };

    const textClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-3xl',
        xl: 'text-4xl'
    };

    return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
            <div className={`${containerClasses[size]} overflow-hidden flex items-center justify-center shrink-0`}>
                <img
                    src="/brand/logo.png?v=2"
                    className="w-[300%] h-[300%] max-w-none object-contain"
                    loading="eager"
                    alt="Durrah logo"
                />
            </div>
            {showText && (
                <div className={`font-bold text-slate-900 dark:text-white ${textClasses[size]} tracking-tight flex items-baseline leading-none`}>
                    <span className="text-indigo-600">Durrah</span>
                    <span className="text-slate-400 dark:text-slate-500 font-light ml-1.5 whitespace-nowrap">for Tutors</span>
                </div>
            )}
        </div>
    );
}
