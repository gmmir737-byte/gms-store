import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Laptop, RefreshCw, Check, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ImageUploadInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  aspectRatioHint?: string;
  bucket?: string;
  maxDimension?: number;
}

// Client-side image optimizer to keep uploads lightweight, fast, and durable
async function processAndCompressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file from PC'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob, width, height });
            } else {
              resolve({ dataUrl, blob: new Blob([dataUrl], { type: mimeType }), width, height });
            }
          },
          mimeType,
          quality
        );
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'https://example.com/banner.jpg',
  helperText,
  aspectRatioHint = 'Recommended: 1920 × 800 (Landscape)',
  bucket = 'settings',
  maxDimension = 1920,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<'pc' | 'url'>('pc');
  const [urlInput, setUrlInput] = useState(value);
  const [previewError, setPreviewError] = useState(false);

  // Sync internal url input if prop value changes externally
  React.useEffect(() => {
    setUrlInput(value);
    setPreviewError(false);
  }, [value]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }

    setUploading(true);
    setPreviewError(false);

    try {
      // 1. Process & compress image on client for immediate, high-fidelity local rendering
      const { dataUrl, blob } = await processAndCompressImage(file, maxDimension);

      // Attempt upload to Supabase Storage
      let uploadedUrl = '';
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const safeName = `hero_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(safeName, blob, {
            upsert: true,
            contentType: file.type || 'image/jpeg',
          });

        if (!uploadErr && uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(uploadData.path);
          if (publicUrlData?.publicUrl) {
            uploadedUrl = publicUrlData.publicUrl;
          }
        }
      } catch (storageErr) {
        console.warn('Storage bucket upload notice, utilizing compressed data URL fallback:', storageErr);
      }

      // If storage URL was produced, use it; otherwise fallback to client compressed data URL
      const finalUrl = uploadedUrl || dataUrl;
      onChange(finalUrl);
      setUrlInput(finalUrl);
      toast.success('Hero banner picture loaded from PC successfully!');
    } catch (err: unknown) {
      console.error('Image upload failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to process picture from PC');
    } finally {
      setUploading(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // reset input so same file can be chosen again if desired
    e.target.value = '';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    setPreviewError(false);
    toast.success('Image removed');
  };

  const handleUrlApply = () => {
    onChange(urlInput);
    setPreviewError(false);
    toast.success('Image URL applied');
  };

  return (
    <div className="space-y-2">
      {/* Label and mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary-600" />
          {label}
        </label>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setUploadMode('pc')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
              uploadMode === 'pc'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Laptop className="w-3 h-3" />
            From PC / Device
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
              uploadMode === 'url'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            Image URL
          </button>
        </div>
      </div>

      {/* Upload Box for PC / Local Computer */}
      {uploadMode === 'pc' ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
            isDragging
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-4 ring-primary-500/20'
              : value
              ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-100/50 dark:hover:bg-gray-800/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, image/gif"
            onChange={onFileInputChange}
            className="hidden"
          />

          {uploading ? (
            <div className="py-4 flex flex-col items-center gap-2 text-primary-600 dark:text-primary-400">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
              <p className="text-xs font-semibold">Processing image from PC...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  value
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                }`}
              >
                {value ? <Check className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>

              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    {value ? 'Change Picture from PC' : 'Click to Upload Picture from PC'}
                  </span>
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                    PC Explorer
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Drag & drop your banner file here, or click to choose from computer
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                  {aspectRatioHint} • PNG, JPG, WebP supported
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Direct URL Input Mode */
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={handleUrlApply}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Apply URL
          </button>
        </div>
      )}

      {/* Image Preview & Details Card */}
      {value && (
        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/80 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-20 h-14 sm:w-28 sm:h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0 border border-gray-200/80 dark:border-gray-700">
              {!previewError ? (
                <img
                  src={value}
                  alt="Banner preview"
                  onError={() => setPreviewError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-amber-500 text-[10px] p-1 text-center font-medium">
                  <AlertCircle className="w-4 h-4 mb-0.5" />
                  Preview error
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  Active Banner Picture
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs sm:max-w-md mt-0.5">
                {value.startsWith('data:') ? 'Loaded from local PC (Optimized Data)' : value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              Replace from PC
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs transition-colors"
              title="Remove Banner Picture"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};
