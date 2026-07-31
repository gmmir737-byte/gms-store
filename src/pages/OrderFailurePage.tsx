import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ShoppingBag, Home } from 'lucide-react';
import { Button } from '../components/common';
import { useSettings } from '../contexts/SettingsContext';

export function OrderFailurePage() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-20">
      <div className="max-w-md w-full px-4 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Payment Failed
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your payment could not be completed. Please try again or choose another payment method.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Number</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">#{orderNumber}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/checkout" className="flex-1">
              <Button variant="outline" className="w-full">
                Try Again
              </Button>
            </Link>
            <Link to="/orders" className="flex-1">
              <Button className="w-full">
                View Orders
              </Button>
            </Link>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 font-medium mt-6 hover:underline"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
export default OrderFailurePage;
