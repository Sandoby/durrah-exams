import { Printer } from '@capgo/capacitor-printer';
import { Capacitor } from '@capacitor/core';

export const printerService = {
    async printHtml(html: string) {
        if (Capacitor.isNativePlatform()) {
            try {
                await Printer.printHtml({ html: html });
                return true;
            } catch (error) {
                console.error('Printing failed:', error);
                throw error;
            }
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }
            return true;
        }
    },

    async printUrl(url: string) {
        if (Capacitor.isNativePlatform()) {
            // In @capgo/capacitor-printer, if it's a remote URL, we might need printPdf or just use printHtml with an iframe/redirect
            // For now, let's use the standard native behavior if available or fallback
            await Printer.printHtml({ html: `<script>window.location.href="${url}"</script>` });
        } else {
            window.open(url, '_blank')?.print();
        }
    }
};
