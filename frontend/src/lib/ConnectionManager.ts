import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export interface ConnectionStatus {
    connected: boolean;
    connectionType: string;
    supabaseReachable: boolean;
    error?: string;
}

class ConnectionManager {
    private static instance: ConnectionManager;
    private supabaseUrl: string;

    private constructor() {
        this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    }

    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    /**
     * Comprehensive connectivity check
     */
    public async checkConnection(): Promise<ConnectionStatus> {
        const netStatus = await Network.getStatus();
        const status: ConnectionStatus = {
            connected: netStatus.connected,
            connectionType: netStatus.connectionType,
            supabaseReachable: false
        };

        if (!status.connected) {
            status.error = "No internet connection detected.";
            return status;
        }

        try {
            // Test reachability to Supabase
            // We use a simple fetch to the Supabase URL root (which usually returns a JSON with version)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            await fetch(this.supabaseUrl, {
                method: 'GET',
                signal: controller.signal,
                mode: 'no-cors' // Use no-cors to avoid preflight issues during a simple reachability check
            });

            clearTimeout(timeoutId);
            status.supabaseReachable = true;
        } catch (err: any) {
            status.supabaseReachable = false;
            status.error = `Supabase unreachable: ${err.message}`;

            // Check for potential DNS issues
            if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
                status.error = `Network Error: Unable to reach Supabase. Check if the URL is correct and your device has DNS access. (URL: ${this.supabaseUrl})`;
            }
        }

        return status;
    }

    /**
     * Start listening for connection changes
     */
    public onStatusChange(callback: (status: ConnectionStatus) => void) {
        Network.addListener('networkStatusChange', async () => {
            const fullStatus = await this.checkConnection();
            callback(fullStatus);
        });
    }

    /**
     * Platform-specific fetch diagnostics
     */
    public async getDeviceInfo() {
        return {
            platform: Capacitor.getPlatform(),
            isNative: Capacitor.isNativePlatform(),
            url: this.supabaseUrl
        };
    }
}

export const connectionManager = ConnectionManager.getInstance();
