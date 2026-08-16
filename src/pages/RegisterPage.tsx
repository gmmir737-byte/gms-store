import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/common';
import { GoogleIcon, AppleIcon } from '../components/common/SocialIcons';
import { useAuth } from '../contexts/AuthContext';
import authLib from '../lib/auth';
import toast from 'react-hot-toast';

function getSafeRedirectUrl(url: string | null | undefined): string {
  if (!url) return '/';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
    return url;
  }
  return '/';
}

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawRedirect = searchParams.get('redirect');
  const safeRedirect = getSafeRedirectUrl(rawRedirect);

  const validate = () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!authLib.validatePassword(password)) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (!agree) {
      toast.error('Please accept the Terms and Privacy Policy to continue');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Account created successfully!');
    navigate(safeRedirect);
  };

  const handleProvider = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await signInWithProvider(provider);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      navigate(safeRedirect);
    }
  };

  return (
    <AuthLayout title="Create an account" subtitle="Sign up for fast checkout and order tracking">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          icon={<User className="h-5 w-5" />}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail className="h-5 w-5" />}
          required
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          icon={<Lock className="h-5 w-5" />}
          required
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-300 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
          icon={<Lock className="h-5 w-5" />}
          required
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            id="terms-checkbox"
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            required
          />
          <label htmlFor="terms-checkbox" className="text-xs text-gray-600 dark:text-gray-300">
            I agree to the{' '}
            <Link to="/terms" className="text-primary-600 font-medium hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-primary-600 font-medium hover:underline">
              Privacy Policy
            </Link>
          </label>
        </div>

        <Button type="submit" size="lg" className="w-full font-medium" loading={loading}>
          Create Account
        </Button>

        {/* OR Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-800 px-3 text-gray-400 font-medium">OR</span>
          </div>
        </div>

        {/* Social Logins */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleProvider('google')}
            loading={loading}
          >
            <GoogleIcon className="h-5 w-5" />
            <span>Continue with Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleProvider('apple')}
            loading={loading}
          >
            <AppleIcon className="h-5 w-5" />
            <span>Continue with Apple</span>
          </Button>
        </div>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400 pt-4">
          Already have an account?{' '}
          <Link
            to={rawRedirect ? `/login?redirect=${encodeURIComponent(rawRedirect)}` : '/login'}
            className="text-primary-600 font-medium hover:underline"
          >
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
