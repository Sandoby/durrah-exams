import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';

const EXCHANGE_CACHE_KEY = 'exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let ratesPromise: Promise<Record<string, number>> | null = null;

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
                let rates: Record<string, number> | undefined;
                // Check local storage cache
                const cached = localStorage.getItem(EXCHANGE_CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        rates = data;
                    }
                }

                if (!rates) {
                    // Use shared promise to avoid duplicate inflight requests
                    if (!ratesPromise) {
                        ratesPromise = fetch('https://api.exchangerate-api.com/v4/latest/USD')
                            .then(res => {
                                if (!res.ok) throw new Error('Failed to fetch rates');
                                return res.json();
                            })
                            .then(data => {
                                const newRates = data.rates;
                                localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify({
                                    data: newRates,
                                    timestamp: Date.now()
                                }));
                                return newRates;
                            })
                            .catch(err => {
                                ratesPromise = null;
                                throw err;
                            });
                    }
                    rates = await ratesPromise;
                }

                const rate = rates![location.currency];
                if (rate) {
                    const converted = (basePriceUSD * rate).toFixed(2);
                    setConvertedPrice(converted);
                    setCurrencyCode(location.currency);
                } else {
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
