'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field, Notice, SubmitButton } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; resetToken?: string } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();

  const onSubmit = async ({ email }: { email: string }) => {
    setLoading(true);
    setError('');
    try {
      setResult((await authApi.forgotPassword(email.trim())).data);
    } catch (err) {
      setError(apiError(err, 'Could not process the request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll generate a reset link.">
      {error && <Notice kind="error">{error}</Notice>}

      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Notice kind="success">{result.message}</Notice>
          {result.resetToken && (
            <Notice kind="info">
              Email delivery is not set up yet, so the link is shown here (development only).{' '}
              <Link href={`/reset-password?token=${result.resetToken}`} style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                Choose a new password
              </Link>
            </Notice>
          )}
          <Link href="/login" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email address" required error={errors.email?.message}>
            <input type="email" className="form-input" autoComplete="email" placeholder="you@example.com"
              {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
          </Field>
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            <Link href="/login" style={{ color: '#60a5fa' }}>Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
