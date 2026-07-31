import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Phone } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const PHONE_AUTH_ENABLED = import.meta.env.VITE_SUPABASE_PHONE_AUTH_ENABLED !== 'false';
export function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password, remember);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Signed in successfully');
    navigate('/');
  };
  const handlePhoneLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    navigate(`/otp-verify?identifier=${encodeURIComponent(phone.trim())}`);
  };
  const handleProvider = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await signInWithProvider(provider);
    setLoading(false);
    if (error) {
      toast.error(error);
    }
  };
  return (
    <AuthLayout title="Sign in to your account" subtitle="Secure access to your orders, wishlist, and more">
      <div className="flex gap-3 mb-6 rounded-xl bg-gray-100 dark:bg-gray-900 p-2">
        <button
          type="button"
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${loginMethod === 'email' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:bg-white/80 dark:text-gray-300'}`}
          onClick={() => setLoginMethod('email')}
        >
          Email login
        </button>
        {PHONE_AUTH_ENABLED && (
          <button
            type="button"
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${loginMethod === 'phone' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:bg-white/80 dark:text-gray-300'}`}
            onClick={() => setLoginMethod('phone')}
          >
            Phone login
          </button>
        )}
      </div>
      {!PHONE_AUTH_ENABLED && (
        <p className="text-sm text-gray-500 mb-4">Phone login is not enabled for this app. Use email login instead.</p>
      )}
      {loginMethod === 'email' ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
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
            placeholder="Enter your password"
            icon={<Lock className="h-5 w-5" />}
            iconPosition="left"
            required
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Sign in
          </Button>
          <div className="text-center text-sm text-gray-500">Or continue with</div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={() => handleProvider('google')} loading={loading}>
              Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleProvider('apple')} loading={loading}>
              Apple
            </Button>
          </div>
          <p className="text-sm text-center text-gray-500 mt-4">
            New here? <Link to="/register" className="text-primary-600 hover:underline">Create an account</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handlePhoneLogin} className="space-y-5">
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            icon={<Phone className="h-5 w-5" />}
            required
          />
          <p className="text-sm text-gray-500">
            We will send a verification code to your phone. Use international format (e.g. +1234567890).
          </p>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Continue with phone
          </Button>
          <div className="text-center text-sm text-gray-500">Or continue with</div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={() => handleProvider('google')} loading={loading}>
              Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleProvider('apple')} loading={loading}>
              Apple
            </Button>
          </div>
          <p className="text-sm text-center text-gray-500 mt-4">
            Want to sign in with email? <button type="button" className="text-primary-600 hover:underline" onClick={() => setLoginMethod('email')}>Use email instead</button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
export default LoginPage;
