import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Smartphone } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/common';
import { PhoneInput } from '../components/common/PhoneInput';
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

export function LoginPage() {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawRedirect = searchParams.get('redirect');
  const safeRedirect = getSafeRedirectUrl(rawRedirect);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Signed in successfully!');
    navigate(safeRedirect);
  };

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    const fullPhone = `${countryCode}${phone.trim()}`;
    setLoading(true);
    const res = await authLib.sendOtp(fullPhone);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success('OTP sent successfully to your phone!');
    const targetUrl = `/otp-verify?identifier=${encodeURIComponent(fullPhone)}${
      rawRedirect ? `&redirect=${encodeURIComponent(rawRedirect)}` : ''
    }`;
    navigate(targetUrl);
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
    <AuthLayout title="Sign in to your account" subtitle="Access your orders, wishlist, and profile">
      {mode === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<Mail className="h-5 w-5" />}
            required
            autoComplete="email"
          />

          <div className="space-y-1">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              icon={<Lock className="h-5 w-5" />}
              required
              autoComplete="current-password"
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
            <div className="flex justify-end pt-1">
              <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full font-medium" loading={loading}>
            Sign In
          </Button>

          {/* OR Divider for Phone Login */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-800 px-3 text-gray-400 font-medium">OR</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2 border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => setMode('phone')}
          >
            <Smartphone className="h-5 w-5 text-gray-500" />
            <span>Continue with Phone OTP</span>
          </Button>

          {/* OR Divider for Social Logins */}
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
            Don't have an account?{' '}
            <Link
              to={rawRedirect ? `/register?redirect=${encodeURIComponent(rawRedirect)}` : '/register'}
              className="text-primary-600 font-medium hover:underline"
            >
              Create an Account
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <PhoneInput
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phoneNumber={phone}
            onPhoneNumberChange={setPhone}
          />

          <Button type="submit" size="lg" className="w-full font-medium" loading={loading}>
            Send Verification Code
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            We will send an SMS OTP code to your mobile number.
          </p>

          {/* OR Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-800 px-3 text-gray-400 font-medium">OR</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setMode('email')}
          >
            <Mail className="h-5 w-5 text-gray-500" />
            <span>Continue with Email & Password</span>
          </Button>

          {/* Social Logins */}
          <div className="space-y-3 pt-2">
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
            Don't have an account?{' '}
            <Link
              to={rawRedirect ? `/register?redirect=${encodeURIComponent(rawRedirect)}` : '/register'}
              className="text-primary-600 font-medium hover:underline"
            >
              Create an Account
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

export default LoginPage;
