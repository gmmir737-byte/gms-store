import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common';

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{title || 'Welcome'}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>}
        </header>

        <main>{children}</main>

        <footer className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Need help? <Link to="/contact" className="text-primary-600 hover:underline">Contact Support</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default AuthLayout;
