import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4">
      <div className="min-h-full flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div
          className={`
            relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl
            w-full max-w-[95vw] ${sizeClasses[size]}
            max-h-[92vh] flex flex-col
            transform transition-all
            animate-slide-up my-auto my-2 sm:my-8
          `}
        >
          {title && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate pr-2">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-70px)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
