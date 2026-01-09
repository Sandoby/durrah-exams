import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/exam-animations.css'
import './i18n';
import App from './App.tsx'

import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeroUIProvider } from "@heroui/react";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Convex imports
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Initialize Convex client with Supabase JWT auth bridge
const convexUrl = import.meta.env.VITE_CONVEX_URL;

// Conditionally create Convex client only if URL is configured
const convex = convexUrl
  ? new ConvexReactClient(convexUrl, {
    // Bridge Supabase auth to Convex
    // This passes the Supabase JWT for identity verification
  })
  : null;

// Feature flags for gradual rollout
export const CONVEX_FEATURES = {
  proctoring: import.meta.env.VITE_USE_CONVEX_PROCTORING === 'true',
  chat: import.meta.env.VITE_USE_CONVEX_CHAT === 'true',
  leaderboard: import.meta.env.VITE_USE_CONVEX_LEADERBOARD === 'true',
};

// App with optional Convex wrapper
const AppWithProviders = () => (
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <HeroUIProvider>
            {convex ? (
              <ConvexProvider client={convex}>
                <App />
              </ConvexProvider>
            ) : (
              <App />
            )}
          </HeroUIProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(<AppWithProviders />);
