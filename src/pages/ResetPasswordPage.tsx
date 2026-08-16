import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input, Button } from '../components/common';
import authLib from '../lib/auth';
import toast from 'react-hot-toast';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authLib.validatePassword(password)) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await authLib.updatePassword(password);
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      setSuccess(true);
      toast.success('Your password has been updated successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password Reset Complete" subtitle="Your password has been updated successfully">
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You can now sign in using your new password. Redirecting to sign in page...
          </p>
          <Link to="/login">
            <Button size="lg" className="w-full mt-2">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set New Password" subtitle="Enter your new password below to reset your account">
      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          icon={<Lock className="h-5 w-5" />}
          required
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-300 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />

        <Input
          label="Confirm New Password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          icon={<Lock className="h-5 w-5" />}
          required
        />

        <Button type="submit" size="lg" className="w-full font-medium" loading={loading}>
          Update Password
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

export default ResetPasswordPage;
