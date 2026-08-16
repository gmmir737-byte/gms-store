import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/common';
import authLib from '../lib/auth';
import toast from 'react-hot-toast';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const { error } = await authLib.sendPasswordReset(email);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    setSubmitted(true);
    toast.success('Password reset instructions sent!');
  };

  if (submitted) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Password reset instructions have been sent">
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We sent a password reset link to <strong className="text-gray-900 dark:text-white">{email}</strong>. Please check your inbox and spam folder.
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="outline" size="lg" className="w-full flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your email address to receive a password reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5" />}
          required
        />

        <Button type="submit" size="lg" className="w-full font-medium" loading={loading}>
          Send Reset Link
        </Button>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
