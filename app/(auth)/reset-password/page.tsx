'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field, Notice, SubmitButton } from '@/components/ui';

interface ResetForm {
  password: string;
  confirm: string;
}

function ResetPassword() {
  const token = useSearchParams().get('token') ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>();

  const onSubmit = async (v: ResetForm) => {
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, v.password);
      setDone(true);
    } catch (err) {
      setError(apiError(err, 'Could not reset the password'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Reset link missing">
        <Notice kind="error">This page needs a reset link. Request a new one below.</Notice>
        <Link href="/forgot-password" className="btn btn-primary" style={{ justifyContent: 'center' }}>Request a reset link</Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div style={{ textAlign: 'center' }}>
          <CheckCircle2 size={42} color="#34d399" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 20 }}>Your password has been changed. You can sign in now.</p>
          <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      {error && <Notice kind="error">{error} <Link href="/forgot-password" style={{ color: '#60a5fa' }}>Request a new link</Link></Notice>}
      <form method="post" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="New password" required error={errors.password?.message} hint="At least 8 characters">
          <input type="password" className="form-input" autoComplete="new-password"
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
        </Field>
        <Field label="Confirm password" required error={errors.confirm?.message}>
          <input type="password" className="form-input" autoComplete="new-password"
            {...register('confirm', { required: 'Confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })} />
        </Field>
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
