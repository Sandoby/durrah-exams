
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const PushNotificationHandler = () => {
    const { user } = useAuth();

    useEffect(() => {
        // Only run on native platforms (Android/iOS)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        if (!user) {
            return;
        }

        const setupPushNotifications = async () => {
            // 1. Check Permissions
            let check = await PushNotifications.checkPermissions();

            if (check.receive === 'prompt') {
                check = await PushNotifications.requestPermissions();
            }

            if (check.receive !== 'granted') {
                console.warn('Push notification permission denied');
                return;
            }

            // 2. Create Channel (Android only)
            if (Capacitor.getPlatform() === 'android') {
                await PushNotifications.createChannel({
                    id: 'default',
                    name: 'Default Notifications',
                    description: 'Generic notifications from the app',
                    importance: 5, // High importance
                    visibility: 1, // Public
                    vibration: true,
                });
            }

            // 3. Register with safety wrapper
            try {
                console.log('PushNotificationHandler: Attempting registration...');
                // Small delay to ensure bridge is fully ready after login transition
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Final check to prevent native crash if Firebase is somehow still unconfigured
                if (Capacitor.getPlatform() === 'android') {
                    // This is a heuristic, but often if registration fails internally it throws
                    await PushNotifications.register();
                    console.log('PushNotificationHandler: Registration call successful');
                } else {
                    await PushNotifications.register();
                }
            } catch (regError: any) {
                console.error('PushNotificationHandler: Registration FAILED (FCM Config issues)', regError);
                // Do not throw - we want the app to keep running even if push fails
                return;
            }

            // 4. Listeners
            PushNotifications.addListener('registration', async (token) => {
                console.log('Push Registration Token success:', token.value);

                // Save token to Supabase
                const { error } = await supabase
                    .from('profiles')
                    .update({ fcm_token: token.value })
                    .eq('id', user.id);

                if (error) {
                    console.error('Error saving FCM token:', error);
                } else {
                    console.log('FCM token saved to profile');
                }
            });

            PushNotifications.addListener('registrationError', (error) => {
                console.error('Push Registration Error:', error);
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push Received:', notification);
                toast(notification.title || 'New Notification', {
                    icon: '🔔',
                    duration: 4000
                });
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push Action Performed:', notification.actionId, notification.inputValue);
                // You can add navigation logic here if needed
            });
        };

        setupPushNotifications();

        return () => {
            // Cleanup listeners if necessary (Capacitor handles this mostly, but good practice to be aware)
            PushNotifications.removeAllListeners();
        };
    }, [user]); // Re-run if user changes (e.g. login)

    return null; // This component handles logic only, no UI
};
