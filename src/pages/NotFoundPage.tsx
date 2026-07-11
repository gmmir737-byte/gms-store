import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-display font-bold text-primary-600 dark:text-primary-400">404</h1>
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-4 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button icon={<Home className="h-4 w-4" />}>Go Home</Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" icon={<ShoppingBag className="h-4 w-4" />}>Browse Shop</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
export default NotFoundPage;
