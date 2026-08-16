import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  rightIcon,
  className = '',
  id,
  value,
  ...props
}: InputProps) {
  const inputId = id || props.name;
  const sanitizedValue = value === null ? '' : value;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          value={sanitizedValue}
          className={`
            w-full px-4 py-2.5 rounded-lg border transition-colors duration-200
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${rightIcon ? 'pr-12' : ''}
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
            }
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  value,
  ...props
}: TextareaProps) {
  const textareaId = id || props.name;
  const sanitizedValue = value === null ? '' : value;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        value={sanitizedValue}
        className={`
          w-full px-4 py-2.5 rounded-lg border transition-colors duration-200
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
          }
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-opacity-50
          disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
          resize-none
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export function Select({
  label,
  error,
  helperText,
  options,
  children,
  className = '',
  id,
  value,
  ...props
}: SelectProps) {
  const selectId = id || props.name;
  const sanitizedValue = value === null ? '' : value;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={sanitizedValue}
        className={`
          w-full px-4 py-2.5 rounded-lg border transition-colors duration-200
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
          }
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-opacity-50
          disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      >
        {children ? (
          children
        ) : options && options.length > 0 ? (
          options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : null}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}
