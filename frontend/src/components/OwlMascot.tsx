type OwlVariant = 'logo' | 'guide' | 'success' | 'analytics' | 'idea' | 'calm' | 'tablet';

const owlSources: Record<OwlVariant, string> = {
    logo: '/brand/owls/logo.webp',
    guide: '/brand/owls/sticker.webp',
    success: '/brand/owls/sticker456uio.webp',
    analytics: '/brand/owls/222.webp',
    idea: '/brand/owls/sticker234567.webp',
    calm: '/brand/owls/stickerdfhj.webp',
    tablet: '/brand/owls/sticker223.webp'
};

const owlAlt: Record<OwlVariant, string> = {
    logo: 'Durrah Owl logo',
    guide: 'Durrah Owl guide',
    success: 'Durrah Owl celebration',
    analytics: 'Durrah Owl with analytics',
    idea: 'Durrah Owl idea',
    calm: 'Durrah Owl support',
    tablet: 'Durrah Owl with tablet'
};

interface OwlMascotProps {
    variant?: OwlVariant;
    className?: string;
    alt?: string;
    loading?: 'lazy' | 'eager';
    decoding?: 'auto' | 'async' | 'sync';
}

export function OwlMascot({
    variant = 'guide',
    className = '',
    alt,
    loading = 'lazy',
    decoding = 'async'
}: OwlMascotProps) {
    return (
        <img
            src={owlSources[variant]}
            alt={alt ?? owlAlt[variant]}
            className={`object-contain ${className}`}
            loading={loading}
            decoding={decoding}
        />
    );
}
