import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import authLib from '../lib/auth';
import toast from 'react-hot-toast';
export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const validate = () => {
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!authLib.validatePassword(password)) {
      toast.error('Password must be at least 8 characters and include upper, lower, number, and special character.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (!agree) {
      toast.error('You must agree to the terms and conditions');
      return false;
    }
    return true;
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email, password, fullName, remember);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Account created. Please verify your email or OTP.');
    navigate('/otp-verify');
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
    <AuthLayout title="Create your account" subtitle="Fast, secure sign up">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          icon={<User className="h-5 w-5" />}
          required
        />
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
          placeholder="Create a strong password"
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
        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          icon={<Lock className="h-5 w-5" />}
          required
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
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            I agree to the <Link to="/terms" className="text-primary-600 hover:underline">Terms</Link>
          </label>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
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
        <p className="text-sm text-center text-gray-500">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
export default RegisterPage;
