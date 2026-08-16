import React from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  magnetic?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  magnetic = true,
  onClick,
  ...props
}: ButtonProps) {
  const baseClasses =
    'relative overflow-hidden inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-500 hover:to-primary-600 focus:ring-primary-500 shadow-md shadow-primary-500/20 dark:shadow-primary-900/30',
    secondary:
      'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-md shadow-gray-950/10 dark:shadow-white/10',
    outline:
      'border-2 border-gray-300/80 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/80',
    ghost:
      'text-gray-600 hover:bg-gray-100/80 focus:ring-gray-500 dark:text-gray-400 dark:hover:bg-gray-800/80',
    danger:
      'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 focus:ring-red-500 shadow-md shadow-red-500/20',
  };

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4.5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-xl gap-2.5',
  };

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.025, y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.96, y: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        magnetic ? 'magnetic-glow' : ''
      } ${className}`}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {/* Specular sheen effect on hover */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out" />

      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="transition-transform duration-200 group-hover:-translate-x-0.5">{icon}</span>
      )}
      <span className="relative z-10">{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>
      )}
    </motion.button>
  );
}

