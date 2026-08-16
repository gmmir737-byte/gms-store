import React, { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No image</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-zoom-in"
        onClick={() => setIsZoomed(true)}
      >
        <img
          src={images[selectedIndex]}
          alt={`${alt} - ${selectedIndex + 1}`}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`
                flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden
                border-2 transition-colors
                ${selectedIndex === index
                  ? 'border-primary-600'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <img
                src={image}
                alt={`${alt} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setIsZoomed(false)}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={images[selectedIndex]}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
