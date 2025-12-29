import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const downloaderService = {
    async downloadFile(filename: string, data: string, type: 'text' | 'base64' = 'text') {
        if (Capacitor.isNativePlatform()) {
            try {
                // Create a unique filename if needed or use provided
                const path = filename;

                // Write file to cache or temporary directory for sharing
                const result = await Filesystem.writeFile({
                    path,
                    data,
                    directory: Directory.Cache,
                    encoding: type === 'text' ? Encoding.UTF8 : undefined,
                });

                // Share the file so the user can save or open it
                await Share.share({
                    title: `Download ${filename}`,
                    text: `Here is your ${filename}`,
                    url: result.uri,
                    dialogTitle: 'Save or Share File',
                });

                return true;
            } catch (error) {
                console.error('Download failed:', error);
                throw error;
            }
        } else {
            // Browser logic
            const blob = new Blob([data], { type: type === 'text' ? 'text/plain' : 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            return true;
        }
    }
};
