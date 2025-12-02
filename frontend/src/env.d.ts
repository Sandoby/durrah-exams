/// <reference types="vite/client" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        background?: string;
        speed?: number | string;
        autoplay?: boolean;
        loop?: boolean;
        className?: string;
      };
    }
  }
}

declare interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_BASE?: string;
  // add other VITE_* variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
