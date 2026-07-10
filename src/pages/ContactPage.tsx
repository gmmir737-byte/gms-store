import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Clock, MessageCircle } from 'lucide-react';
import { Button, Input, Textarea } from '../components/common';
import toast from 'react-hot-toast';

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Message sent successfully! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
    setSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-4">Contact Us</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Have a question or need assistance? We're here to help. Reach out to us and our team will respond promptly.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                <a href="mailto:support@gmsstore.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                  support@gmsstore.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Phone className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Phone</h3>
                <a href="tel:+919876543210" className="text-primary-600 dark:text-primary-400 hover:underline">
                  +91 98765 43210
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <MapPin className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Address</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  123 Shopping Street<br />Mumbai, India 400001
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Business Hours</h3>
                <p className="text-gray-600 dark:text-gray-400">Mon - Sat: 9AM - 8PM<br />Sunday: 10AM - 6PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Your Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <Input label="Subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={5} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
              </div>
              <Button type="submit" loading={submitting} icon={<Send className="h-4 w-4" />} size="lg">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
