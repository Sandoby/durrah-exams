import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

const EXCHANGE_CACHE_KEY = 'exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useCurrency(basePriceUSD: number) {
    const { location, isLoading: isLocationLoading } = useLocation();
    const [convertedPrice, setConvertedPrice] = useState<string | null>(null);
    const [currencyCode, setCurrencyCode] = useState('USD');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const convertCurrency = async () => {
            if (isLocationLoading) return;

            if (!location || location.currency === 'USD') {
                setConvertedPrice(basePriceUSD.toFixed(2));
                setCurrencyCode('USD');
                setIsLoading(false);
                return;
            }

            try {
                let rates;
                // Check cache
                const cached = localStorage.getItem(EXCHANGE_CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        rates = data;
                    }
                }

                if (!rates) {
                    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                    if (!response.ok) throw new Error('Failed to fetch rates');
                    const data = await response.json();
                    rates = data.rates;

                    localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify({
                        data: rates,
                        timestamp: Date.now()
                    }));
                }

                const rate = rates[location.currency];
                if (rate) {
                    const converted = (basePriceUSD * rate).toFixed(2);
                    setConvertedPrice(converted);
                    setCurrencyCode(location.currency);
                } else {
                    // Fallback to USD if currency not found
                    setConvertedPrice(basePriceUSD.toFixed(2));
                    setCurrencyCode('USD');
                }
            } catch (err) {
                console.error('Currency conversion failed:', err);
                setConvertedPrice(basePriceUSD.toFixed(2));
                setCurrencyCode('USD');
            } finally {
                setIsLoading(false);
            }
        };

        convertCurrency();
    }, [basePriceUSD, location, isLocationLoading]);

    return {
        price: convertedPrice,
        currency: currencyCode,
        isLoading: isLoading || isLocationLoading
    };
}
