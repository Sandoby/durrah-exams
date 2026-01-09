
/**
 * Reads a file as an HTMLImageElement
 */
export async function readFileAsImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = String(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Downscales an image to fit within maxDimension and compresses it to JPEG.
 * @param img The source HTMLImageElement
 * @param maxDimension The variable maximum width or height
 * @param quality JPEG quality (0 to 1)
 * @returns Blob of the compressed image
 */
export function compressImage(img: HTMLImageElement, maxDimension: number = 1200, quality: number = 0.7): Promise<Blob> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Maintain aspect ratio
        if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            // Fallback if context creation fails (unlikely in modern browsers)
            canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/jpeg', quality);
            return;
        }

        // Use better quality scaling if supported (optional, but good practice)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
            (blob) => resolve(blob || new Blob()),
            'image/jpeg',
            quality
        );
    });
}

/**
 * Helper to convert Blob to Data URL for preview/fallback
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
    });
}
