import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

const EXCHANGE_CACHE_KEY = 'exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useCurrency(basePriceEGP: number) {
    const { location, isLoading: isLocationLoading } = useLocation();
    const [convertedPrice, setConvertedPrice] = useState<string | null>(null);
    const [currencyCode, setCurrencyCode] = useState('EGP');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const convertCurrency = async () => {
            if (isLocationLoading) return;

            if (!location || location.currency === 'EGP') {
                setConvertedPrice(basePriceEGP.toString());
                setCurrencyCode('EGP');
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
                    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EGP');
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
                    // Special case: show fixed USD prices (5/50) instead of calculated ones
                    if (location.currency === 'USD') {
                        if (basePriceEGP === 250 || basePriceEGP === 200) {
                            setConvertedPrice('5.00');
                        } else if (basePriceEGP === 2500 || basePriceEGP === 2000) {
                            setConvertedPrice('50.00');
                        } else {
                            const converted = (basePriceEGP * rate).toFixed(2);
                            setConvertedPrice(converted);
                        }
                    } else {
                        const converted = (basePriceEGP * rate).toFixed(2);
                        setConvertedPrice(converted);
                    }
                    setCurrencyCode(location.currency);
                } else {
                    // Fallback if currency not found
                    setConvertedPrice(basePriceEGP.toString());
                    setCurrencyCode('EGP');
                }
            } catch (err) {
                console.error('Currency conversion failed:', err);
                setConvertedPrice(basePriceEGP.toString());
                setCurrencyCode('EGP');
            } finally {
                setIsLoading(false);
            }
        };

        convertCurrency();
    }, [basePriceEGP, location, isLocationLoading]);

    return {
        price: convertedPrice,
        currency: currencyCode,
        isLoading: isLoading || isLocationLoading
    };
}
