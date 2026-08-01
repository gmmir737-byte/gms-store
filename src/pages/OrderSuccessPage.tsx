import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ShoppingBag, Home } from 'lucide-react';
import { Button } from '../components/common';
import { useSettings } from '../contexts/SettingsContext';

export function OrderSuccessPage() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
const orderNumber = searchParams.get('order');
const customerEmail = searchParams.get('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-20">
      <div className="max-w-md w-full px-4 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Order Placed Successfully!
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-6">
           Thank you for shopping with {settings.store_name}. We've received your order and will process it shortly.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Number</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">#{orderNumber}</p>
            </div>
          )}

          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  What happens next?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {customerEmail
                    ? `A confirmation email has been sent to ${customerEmail}.`
                    : "A confirmation email has been sent to the email address you provided."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/orders" className="flex-1">
              <Button variant="outline" className="w-full" icon={<Package className="h-4 w-4" />}>
                View Orders
              </Button>
            </Link>
            <Link to="/shop" className="flex-1">
              <Button className="w-full" icon={<ShoppingBag className="h-4 w-4" />}>
                Continue Shopping
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
export default OrderSuccessPage;
