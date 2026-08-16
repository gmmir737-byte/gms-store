import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

export function TermsPage() {
  const { settings } = useSettings();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-8">Terms & Conditions</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Last updated: {new Date().getFullYear()}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
  {`Welcome to ${settings.store_name}. By accessing our website and using our services, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access our services.`}
</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Accounts</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            When you create an account with us, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account password and for restricting access to your computer or device.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Orders and Payment</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            All orders are subject to acceptance and availability. We reserve the right to cancel any order at any stage. Prices for our products are subject to change without notice. Payment must be made at the time of purchase.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Shipping and Delivery</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Delivery times are estimates and are not guaranteed. We shall not be liable for any delay in delivery. Risk of loss and title for items purchased pass to you upon delivery to the carrier.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Returns and Refunds</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We offer a 7-day return policy for most products. Items must be returned in original condition with all tags attached. Refunds will be processed within 7 business days of receiving the returned item.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Intellectual Property</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            All content included on this website, such as text, graphics, logos, images, and software, is the property of {settings.store_name} and is protected by copyright and trademark laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Limitation of Liability</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
           To the fullest extent permitted by law, {settings.store_name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Governing Law</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">9. Contact Us</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            if you have any questions about these terms, please contact us at {settings.email}.
          </p>
        </section>
      </div>
    </div>
  );
}
export default TermsPage;
