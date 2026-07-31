import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '../components/common';
import { useSettings } from '../contexts/SettingsContext';

export function AboutPage() {
  const { settings } = useSettings();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white text-center mb-8">
        About {settings.store_name}
      </h1>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-12">
          {settings.store_tagline ||
  "Your trusted destination for quality products at unbeatable prices."}
        </p>
        <div className="grid md:grid-cols-2 gap-12 mb-16">

  <div>
    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">
      Our Story
    </h2>

    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
      {settings.about_us ||
        `Welcome to ${settings.store_name}. We are committed to providing quality products and an outstanding shopping experience.`}
    </p>

    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
      Thank you for choosing {settings.store_name}. We continue to improve our services and bring you the latest products at the best prices.
    </p>
  </div>

  <div>
    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">
      Our Mission
    </h2>

    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
      We strive to provide our customers with the best shopping experience possible. From premium quality products to fast delivery and excellent customer service, we go above and beyond to exceed your expectations.
    </p>

    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
      Our commitment to innovation drives us to continuously improve and bring you the latest products and services that make your life easier and more enjoyable.
    </p>
  </div>

</div>

        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-8 text-center">Why Choose Us</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {[
            { title: 'Quality Assurance', desc: 'Every product is carefully sourced and quality-checked before reaching you.' },
            { title: 'Best Prices', desc: 'Competitive prices and regular discounts ensure you get the best value.' },
            { title: 'Fast Delivery', desc: 'Lightning-fast delivery with real-time tracking for peace of mind.' },
            {
  title: 'Easy Returns',
  desc: 'Hassle-free 7-day return policy if you change your mind.'
},
            { title: 'Secure Payments', desc: 'Multiple secure payment options for your convenience.' },
            { title: 'Customer Support', desc: 'Dedicated support team available to help you anytime.' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">Ready to Start Shopping?</h2>
          <Link to="/shop">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
export default AboutPage;
