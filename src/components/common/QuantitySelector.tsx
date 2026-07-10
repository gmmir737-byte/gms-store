import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  disabled = false,
}: QuantitySelectorProps) {
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
  };

  const buttonSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
  };

  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className={`inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ${sizeClasses[size]}`}>
      <button
        type="button"
        onClick={handleDecrease}
        disabled={disabled || value <= min}
        className={`
          ${buttonSizeClasses[size]} flex items-center justify-center
          text-gray-600 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-l-lg transition-colors
        `}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-12 text-center font-medium text-gray-900 dark:text-white">
        {value}
      </span>
      <button
        type="button"
        onClick={handleIncrease}
        disabled={disabled || value >= max}
        className={`
          ${buttonSizeClasses[size]} flex items-center justify-center
          text-gray-600 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-r-lg transition-colors
        `}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
