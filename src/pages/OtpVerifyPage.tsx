import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RotateCw } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input, Button } from '../components/common';
import { PhoneInput } from '../components/common/PhoneInput';
import authLib from '../lib/auth';
import toast from 'react-hot-toast';

function getSafeRedirectUrl(url: string | null | undefined): string {
  if (!url) return '/';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
    return url;
  }
  return '/';
}

export function OtpVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawRedirect = searchParams.get('redirect');
  const safeRedirect = getSafeRedirectUrl(rawRedirect);

  const [inputType, setInputType] = useState<'phone' | 'email'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const identifier = searchParams.get('identifier');
    if (identifier) {
      if (identifier.includes('@')) {
        setInputType('email');
        setEmail(identifier);
      } else {
        setInputType('phone');
        if (identifier.startsWith('+')) {
          // Extract country code if possible
          if (identifier.startsWith('+91')) {
            setCountryCode('+91');
            setPhone(identifier.replace('+91', ''));
          } else if (identifier.startsWith('+1')) {
            setCountryCode('+1');
            setPhone(identifier.replace('+1', ''));
          } else if (identifier.startsWith('+44')) {
            setCountryCode('+44');
            setPhone(identifier.replace('+44', ''));
          } else if (identifier.startsWith('+971')) {
            setCountryCode('+971');
            setPhone(identifier.replace('+971', ''));
          } else {
            setPhone(identifier);
          }
        } else {
          setPhone(identifier);
        }
      }
    }
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const getFullIdentifier = useCallback(() => {
    if (inputType === 'email') return email.trim();
    return `${countryCode}${phone.trim()}`;
  }, [inputType, email, countryCode, phone]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const target = getFullIdentifier();
    if (!target) {
      toast.error(inputType === 'email' ? 'Please enter your email address' : 'Please enter your phone number');
      return;
    }

    setLoading(true);
    const res = await authLib.sendOtp(target);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Verification code sent successfully!');
      setResendCooldown(60); // Start 60s cooldown
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = getFullIdentifier();

    if (!target) {
      toast.error(inputType === 'email' ? 'Please enter your email address' : 'Please enter your phone number');
      return;
    }

    if (!otp.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setLoading(true);
    const res = await authLib.verifyOtp(target, otp);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Phone / Account verified successfully!');
      navigate(safeRedirect);
    }
  };

  return (
    <AuthLayout
      title="Verify OTP Code"
      subtitle="Enter the verification code sent to your phone or email"
    >
      <div className="space-y-6">
        {/* Toggle between phone and email verification */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              inputType === 'phone'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
            onClick={() => setInputType('phone')}
          >
            Phone Verification
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              inputType === 'email'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
            onClick={() => setInputType('email')}
          >
            Email Verification
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {inputType === 'phone' ? (
            <PhoneInput
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              phoneNumber={phone}
              onPhoneNumberChange={setPhone}
            />
          ) : (
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              6-Digit Verification Code
            </label>
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.trim().replace(/[^\d]/g, '').slice(0, 6))}
              placeholder="e.g. 123456"
              icon={<ShieldCheck className="h-5 w-5 text-gray-400" />}
              required
              maxLength={6}
              className="text-center tracking-widest text-lg font-mono"
            />
          </div>

          <Button type="submit" size="lg" className="w-full font-medium" loading={loading}>
            Verify Code & Sign In
          </Button>
        </form>

        {/* Resend OTP Section */}
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Didn't receive code?</span>
          <button
            type="button"
            disabled={resendCooldown > 0 || loading}
            onClick={() => handleSendOtp()}
            className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
          >
            <RotateCw className={`h-3.5 w-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default OtpVerifyPage;
