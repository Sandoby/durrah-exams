import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Global Referral Tracker Component
 * 
 * This component listens for the 'ref' query parameter on every route change
 * and persists it to localStorage. This ensures that referral codes are captured
 * regardless of which page the user lands on first.
 * 
 * Usage: Mount within <Router> but outside <Routes> in App.tsx
 * Example: /?ref=AGENT123 → stores 'AGENT123' in localStorage['pending_referral_code']
 */
export function ReferralTracker() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    
    if (refCode) {
      // Store in uppercase to ensure consistency
      const upperRefCode = refCode.toUpperCase();
      localStorage.setItem('pending_referral_code', upperRefCode);
    }
  }, [searchParams]);

  // This component doesn't render anything
  return null;
}
