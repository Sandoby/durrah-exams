import { useState, useEffect } from 'react';

interface LocationData {
    countryCode: string;
    currency: string;
    countryName: string;
}

const CACHE_KEY = 'user_location';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useLocation() {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                // Check cache first
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setLocation(data);
                        setIsLoading(false);
                        return;
                    }
                }

                // Fetch from API
                const response = await fetch('https://ipapi.co/json/');
                if (!response.ok) throw new Error('Failed to fetch location');

                const data = await response.json();
                const locationData: LocationData = {
                    countryCode: data.country_code,
                    currency: data.currency,
                    countryName: data.country_name
                };

                // Cache result
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: locationData,
                    timestamp: Date.now()
                }));

                setLocation(locationData);
            } catch (err) {
                console.error('Location detection failed:', err);
                setError('Failed to detect location');
                // Fallback to default (Egypt/EGP) or handle gracefully
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocation();
    }, []);

    return { location, isLoading, error };
}
