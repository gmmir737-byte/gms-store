import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input, Button } from '../components/common';
import authLib from '../lib/auth';
import toast from 'react-hot-toast';

const PHONE_AUTH_ENABLED = import.meta.env.VITE_SUPABASE_PHONE_AUTH_ENABLED !== 'false';

export function OtpVerifyPage() {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const param = searchParams.get('identifier');
    if (param) setIdentifier(param);
  }, [searchParams]);

  const isPhoneInput = (value: string) => {
    const trimmed = value.trim();
    return trimmed && !trimmed.includes('@');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your email or phone number');
      return;
    }
    setLoading(true);
    const res = await authLib.sendOtp(identifier);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else toast.success('OTP sent');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the OTP code');
      return;
    }
    setLoading(true);
    const res = await authLib.verifyOtp(identifier, otp);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else toast.success('Verified');
  };

  const identifierLabel = PHONE_AUTH_ENABLED ? 'Email or phone number' : 'Email address';
  const identifierPlaceholder = PHONE_AUTH_ENABLED ? 'you@example.com or +1234567890' : 'you@example.com';

  return (
    <AuthLayout
      title="Verify your account"
      subtitle={PHONE_AUTH_ENABLED ? 'Enter the code we sent to your email or phone' : 'Enter the code we sent to your email'}
    >
      {!PHONE_AUTH_ENABLED && (
        <p className="text-sm text-gray-500 mb-4">Phone login is not configured. Please use an email address instead.</p>
      )}
      {isPhoneInput(identifier) && (
        <p className="text-xs text-gray-500 mb-2">
          Phone numbers should be in international format (e.g. +1234567890).
        </p>
      )}
      <form onSubmit={handleSend} className="space-y-4">
        <Input
          label={identifierLabel}
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder={identifierPlaceholder}
        />
        <Button type="submit" className="w-full" loading={loading}>Send OTP</Button>
      </form>

      <form onSubmit={handleVerify} className="space-y-4 mt-6">
        <Input label="OTP code" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" />
        <Button type="submit" className="w-full" loading={loading}>Verify</Button>
      </form>
    </AuthLayout>
  );
}

export default OtpVerifyPage;
