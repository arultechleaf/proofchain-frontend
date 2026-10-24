'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field, Notice, SubmitButton } from '@/components/ui';

interface RegisterForm {
  name: string;
  email: string;
  organizationCode: string;
  password: string;
  confirm: string;
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (v: RegisterForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        organizationCode: v.organizationCode.trim(),
      });
      setDone(res.data.message);
    } catch (err) {
      setError(apiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Request received">
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <CheckCircle2 size={42} color="#34d399" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{done}</p>
          <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Join your organization. An administrator approves new accounts before they can sign in.">
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full name" required error={errors.name?.message}>
          <input className="form-input" autoComplete="name" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} />
        </Field>
        <Field label="Work email" required error={errors.email?.message}>
          <input type="email" className="form-input" autoComplete="email"
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        </Field>
        <Field label="Organization code" required error={errors.organizationCode?.message} hint="Ask your administrator for your organization's code">
          <input className="form-input" placeholder="COMP-A" style={{ textTransform: 'uppercase' }}
            {...register('organizationCode', { required: 'Organization code is required' })} />
        </Field>
        <Field label="Password" required error={errors.password?.message} hint="At least 8 characters">
          <input type="password" className="form-input" autoComplete="new-password"
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
        </Field>
        <Field label="Confirm password" required error={errors.confirm?.message}>
          <input type="password" className="form-input" autoComplete="new-password"
            {...register('confirm', { required: 'Confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })} />
        </Field>
        <SubmitButton loading={loading}>Request account</SubmitButton>
      </form>
      <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
        Already have an account? <Link href="/login" style={{ color: '#60a5fa' }}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
