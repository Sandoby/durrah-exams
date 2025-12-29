import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const downloaderService = {
    async downloadFile(filename: string, data: string, type: 'text' | 'base64' = 'text') {
        if (Capacitor.isNativePlatform()) {
            try {
                // Determine the directory based on platform
                // On Android/iOS, Directory.Documents is the most appropriate for "Downloads"
                const directory = Directory.Documents;

                // Write file to the documents directory
                await Filesystem.writeFile({
                    path: filename,
                    data,
                    directory,
                    encoding: type === 'text' ? Encoding.UTF8 : undefined,
                    recursive: true
                });

                toast.success(`Success: ${filename} saved to Documents folder`);

                // Note: We don't use Share.share here as the user wants direct downloading.
                // The file will be available in the "Files" app (iOS) or "Documents" folder (Android).

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
