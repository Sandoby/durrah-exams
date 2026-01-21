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

const owlSrcSets: Partial<Record<OwlVariant, string>> = {
    logo: '/brand/owls/logo-128w.webp 128w, /brand/owls/logo.webp 512w',
    guide: '/brand/owls/sticker-256w.webp 256w, /brand/owls/sticker.webp 512w'
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
    width?: number | string;
    height?: number | string;
    srcSet?: string;
    sizes?: string;
}

export function OwlMascot({
    variant = 'guide',
    className = '',
    alt,
    loading = 'lazy',
    decoding = 'async',
    width,
    height,
    srcSet,
    sizes
}: OwlMascotProps) {
    return (
        <img
            src={owlSources[variant]}
            srcSet={srcSet ?? owlSrcSets[variant]}
            sizes={sizes}
            alt={alt ?? owlAlt[variant]}
            className={`object-contain ${className}`}
            loading={loading}
            decoding={decoding}
            width={width}
            height={height}
        />
    );
}
