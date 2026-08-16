import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showValue?: boolean;
  reviewCount?: number;
}

export function Rating({
  value,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  showValue = false,
  reviewCount,
}: RatingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className="flex items-center">
      <div className={`flex ${gapClasses[size]}`}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < Math.floor(value);
          const partial = i === Math.floor(value) && value % 1 > 0;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i + 1)}
              disabled={readonly}
              className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  filled
                    ? 'fill-yellow-400 text-yellow-400'
                    : partial
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {value.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
