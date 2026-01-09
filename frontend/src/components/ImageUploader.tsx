import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readFileAsImage, compressImage, blobToDataUrl } from '../utils/imageUtils';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  userId?: string;
  compact?: boolean;
  maxDimension?: number; // Max width/height
  quality?: number; // JPEG quality
  bucket?: string; // Supabase storage bucket name
}

export function ImageUploader({ value, onChange, userId = 'anon', compact = false, maxDimension = 1200, quality = 0.7, bucket }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const img = await readFileAsImage(file);
      const blob = await compressImage(img, maxDimension, quality);

      // Try Supabase Storage first
      const targetBucket = bucket || (import.meta as any).env?.VITE_SUPABASE_STORAGE_BUCKET || 'question-media';
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      try {
        const { data, error: upErr } = await supabase.storage.from(targetBucket).upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(targetBucket).getPublicUrl(data?.path || path);
        if (pub?.publicUrl) {
          onChange(pub.publicUrl);
          return;
        }
        // Fallback to data URL if public URL missing
        const dataUrl = await blobToDataUrl(blob);
        onChange(dataUrl);
      } catch (e) {
        // If storage fails (bucket missing / RLS), fallback to data URL
        const dataUrl = await blobToDataUrl(blob);
        onChange(dataUrl);
        setError('Uploaded locally. Configure storage for public URLs.');
      }
    } catch (e) {
      setError('Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center gap-3">
          {value ? (
            <img src={value} alt="preview" className="h-20 w-20 object-cover rounded border" />
          ) : (
            <div className="h-20 w-20 flex items-center justify-center rounded border text-gray-400">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          <div className="text-xs text-gray-500">
            JPG, auto-downscaled to fit {maxDimension}px, quality {Math.round(quality * 100)}%
          </div>
        </div>
      )}

      {compact && value && (
        <img src={value} alt="preview" className="h-10 w-10 object-cover rounded border" />
      )}

      <div className={compact ? '' : 'flex items-center gap-2'}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) doUpload(file);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-sm ${compact ? '' : 'bg-white hover:bg-gray-50'}`}
          disabled={isUploading}
          title="Upload Photo"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {!compact && (isUploading ? 'Uploading...' : 'Upload Photo')}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-xs text-red-600"
            title="Clear"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {error && <div className="text-xs text-amber-600">{error}</div>}
    </div>
  );
}
