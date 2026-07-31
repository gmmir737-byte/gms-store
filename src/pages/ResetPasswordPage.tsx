import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input, Button } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await auth.resetPassword(email);
    setLoading(false);
    if (!error) toast.success('Reset link sent if the email exists');
    else toast.error(error);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We will send a reset link to your email">
      <form onSubmit={handleReset} className="space-y-4">
        <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
