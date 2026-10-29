'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field, Form } from '@/components/ui';

interface ChangeForm {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

/** First sign-in with a temporary password: the user must choose their own before using the app. */
export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading, applySession, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ChangeForm>();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
    else if (!user.mustChangePassword) router.replace('/dashboard');
  }, [isLoading, user, router]);

  if (!user?.mustChangePassword) return null;

  const onSubmit = async (v: ChangeForm) => {
    setSaving(true);
    setError('');
    try {
      const res = await authApi.changePassword(v.currentPassword, v.newPassword);
      // The server issues a fresh token that no longer carries the "must change password" flag.
      applySession(res.data.accessToken, res.data.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(apiError(err, 'Could not change the password'));
      setSaving(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle={`Welcome, ${user.name}. Your account has a temporary password. Set your own to continue.`}>
      <Form post onSubmit={handleSubmit(onSubmit)} loading={saving} submitLabel="Save and continue" error={error || undefined}>
        <Field label="Temporary password" required error={errors.currentPassword?.message}>
          <input type="password" className="form-input" autoComplete="current-password"
            {...register('currentPassword', { required: 'Enter the temporary password you were given' })} />
        </Field>
        <Field label="New password" required error={errors.newPassword?.message} hint="At least 8 characters">
          <input type="password" className="form-input" autoComplete="new-password"
            {...register('newPassword', { required: 'Enter a new password', minLength: { value: 8, message: 'At least 8 characters' } })} />
        </Field>
        <Field label="Confirm new password" required error={errors.confirm?.message}>
          <input type="password" className="form-input" autoComplete="new-password"
            {...register('confirm', { required: 'Confirm the new password', validate: (v) => v === watch('newPassword') || 'Passwords do not match' })} />
        </Field>
      </Form>
      <p className="auth-footnote spaced">
        <button type="button" className="btn btn-link" onClick={logout}>Sign out</button>
      </p>
    </AuthShell>
  );
}
