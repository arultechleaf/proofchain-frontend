'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { authApi, emailOtpApi } from '@/lib/api';
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
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSentFor, setOtpSentFor] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [resendInSeconds, setResendInSeconds] = useState(0);
  const [done, setDone] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const email = watch('email')?.trim().toLowerCase() ?? '';
  const isEmailVerified = email.length > 0 && verifiedEmail === email;

  useEffect(() => {
    if (resendInSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendInSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendInSeconds]);

  const sendOtp = async () => {
    if (!email) return;
    setOtpLoading(true);
    setError('');
    try {
      await emailOtpApi.send(email);
      setOtpSentFor(email);
      setOtp('');
      setVerifiedEmail('');
      setResendInSeconds(60);
    } catch (err) {
      setError(apiError(err, 'Could not send a verification code'));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setOtpLoading(true);
    setError('');
    try {
      await emailOtpApi.verify(email, otp);
      setVerifiedEmail(email);
    } catch (err) {
      setError(apiError(err, 'Could not verify the email address'));
    } finally {
      setOtpLoading(false);
    }
  };

  const onSubmit = async (v: RegisterForm) => {
    if (verifiedEmail !== v.email.trim().toLowerCase()) {
      setError('Verify your email address before requesting an account');
      return;
    }
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
        <div className="auth-success padded">
          <CheckCircle2 size={42} color="#34d399" className="auth-success-icon" />
          <p className="auth-success-text">{done}</p>
          <Link href="/login" className="btn btn-primary btn-block">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Join your organization. An administrator approves new accounts before they can sign in.">
      {error && <Notice kind="error">{error}</Notice>}
      <form method="post" onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <Field label="Full name" required error={errors.name?.message}>
          <input className="form-input" autoComplete="name" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} />
        </Field>
        <Field label="Work email" required error={errors.email?.message}>
          <input type="email" className="form-input" autoComplete="email"
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        </Field>
        {isEmailVerified ? (
          <Notice kind="success">Email address verified</Notice>
        ) : otpSentFor !== '' && otpSentFor === email ? (
          <>
            <Notice kind="info">Enter the 6-digit code sent to your email. The code expires in 5 minutes.</Notice>
            <Field label="Email verification code" required>
              <input
                className="form-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
            </Field>
            <SubmitButton type="button" loading={otpLoading} disabled={otp.length !== 6} onClick={verifyOtp}>
              Verify email
            </SubmitButton>
            <button type="button" className="btn btn-secondary btn-block" disabled={otpLoading || resendInSeconds > 0} onClick={sendOtp}>
              {resendInSeconds > 0 ? `Resend code in ${resendInSeconds}s` : 'Resend code'}
            </button>
          </>
        ) : (
          <SubmitButton type="button" loading={otpLoading} disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={sendOtp}>
            Send verification code
          </SubmitButton>
        )}
        <Field label="Organization code" required error={errors.organizationCode?.message} hint="Ask your administrator for your organization's code">
          <input className="form-input uppercase-input" placeholder="COMP-A"
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
        <SubmitButton loading={loading} disabled={!isEmailVerified}>Request account</SubmitButton>
      </form>
      <p className="auth-footnote spaced">
        Already have an account? <Link href="/login" className="auth-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
