import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const downloaderService = {
    async downloadFile(filename: string, data: string, type: 'text' | 'base64' = 'text') {
        if (Capacitor.isNativePlatform()) {
            try {
                // Determine the directory based on platform
                // Directory.Cache is always accessible and good for temporary files to be shared/saved
                const directory = Directory.Cache;

                // Write file to the cache directory
                const result = await Filesystem.writeFile({
                    path: filename,
                    data,
                    directory,
                    encoding: type === 'text' ? Encoding.UTF8 : undefined,
                    recursive: true
                });

                // Use Share to let the user "Save to Files" or "Download"
                // This is the most reliable way on Android 11+ to get the file into public space
                await Share.share({
                    title: `Download ${filename}`,
                    text: `Exporting ${filename}`,
                    url: result.uri,
                    dialogTitle: 'Save to device'
                });

                toast.success(`Exporting ${filename}...`);
                return true;
            } catch (error: any) {
                console.error('Download failed:', error);
                toast.error(`Download failed: ${error.message || 'Unknown error'}`);
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
