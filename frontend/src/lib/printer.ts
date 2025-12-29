import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const printerService = {
    async printHtml(html: string) {
        if (Capacitor.isNativePlatform()) {
            try {
                if (!Printer) {
                    throw new Error('Printer plugin not available');
                }
                await Printer.print({
                    content: html,
                    name: 'Exam Document'
                });
                return true;
            } catch (error: any) {
                console.error('Printing failed:', error);
                toast.error(`Printing failed: ${error.message || 'Unknown error'}`);
                return false;
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
            try {
                // Fallback to printHtml with iframe or redirect
                await Printer.print({ content: `<script>window.location.href="${url}"</script>` });
            } catch (error) {
                console.error('Print URL failed:', error);
                toast.error('Print URL failed');
            }
        } else {
            window.open(url, '_blank')?.print();
        }
    }
};
