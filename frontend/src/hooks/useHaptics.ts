import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const useHaptics = () => {
    const isAvailable = Capacitor.isNativePlatform();

    const vibrate = async () => {
        if (!isAvailable) return;
        try {
            await Haptics.vibrate();
        } catch (e) {
            console.warn('Haptics not available', e);
        }
    };

    const impactLight = async () => {
        if (!isAvailable) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) {
            console.warn('Haptics impact failed', e);
        }
    };

    const impactMedium = async () => {
        if (!isAvailable) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
            console.warn('Haptics impact failed', e);
        }
    };

    const impactHeavy = async () => {
        if (!isAvailable) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            console.warn('Haptics impact failed', e);
        }
    };

    const notificationSuccess = async () => {
        if (!isAvailable) return;
        try {
            await Haptics.notification({ type: NotificationType.Success });
        } catch (e) {
            console.warn('Haptics notification failed', e);
        }
    };

    const notificationError = async () => {
        if (!isAvailable) return;
        try {
            await Haptics.notification({ type: NotificationType.Error });
        } catch (e) {
            console.warn('Haptics notification failed', e);
        }
    };

    return {
        vibrate,
        impactLight,
        impactMedium,
        impactHeavy,
        notificationSuccess,
        notificationError,
        isAvailable
    };
};
