import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
}

export function LoadingButton({
    isLoading = false,
    loadingText,
    children,
    disabled,
    className = '',
    ...props
}: LoadingButtonProps) {
    return (
        <button
            disabled={isLoading || disabled}
            className={`${className} ${isLoading ? 'cursor-not-allowed opacity-75' : ''}`}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {loadingText || 'Loading...'}
                </span>
            ) : (
                children
            )}
        </button>
    );
}
