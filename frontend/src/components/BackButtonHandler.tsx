import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

export function BackButtonHandler() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let backListener: any;

        const setupListener = async () => {
            backListener = await CapacitorApp.addListener('backButton', ({ canGoBack }: any) => {
                // Define root paths where back button should exit the app
                const rootPaths = ['/', '/login', '/student-portal', '/kids'];

                if (rootPaths.includes(location.pathname)) {
                    // If on a root page, exit the app
                    CapacitorApp.exitApp();
                } else if (canGoBack) {
                    // If we can go back in history, do so
                    navigate(-1);
                } else {
                    // Fallback exit if no history stack (though rootPaths check should catch this)
                    CapacitorApp.exitApp();
                }
            });
        };

        setupListener();

        return () => {
            if (backListener) {
                backListener.remove();
            }
        };
    }, [navigate, location]);

    return null;
}
