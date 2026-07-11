import React from 'react';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Last updated: January 2024
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We collect information you provide directly to us, including your name, email address, shipping address, phone number, and payment information. We also collect information from your interactions with our services and your device information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We use the information we collect to fulfill your orders, communicate with you, improve our services, personalize your experience, and protect against fraud and unauthorized transactions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Information Sharing</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We do not sell your personal information. We share your information only with trusted third parties who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Security</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Your Rights</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            You have the right to access, correct, or delete your personal information at any time. Please contact us at support@gmsstore.com for any such requests.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Cookies and Tracking</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Contact Us</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at support@gmsstore.com.
          </p>
        </section>
      </div>
    </div>
  );
}
export default PrivacyPolicyPage;
