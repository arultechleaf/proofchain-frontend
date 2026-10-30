'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field, Notice, SubmitButton } from '@/components/ui';

type Step = 'email' | 'otp' | 'password' | 'done';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 60;

const SUBTITLES: Record<Step, string | undefined> = {
  email: "Enter your registered email and we'll send you a 6-digit code.",
  otp: 'Enter the 6-digit code we emailed you.',
  password: 'Choose a new password for your account.',
  done: undefined,
};

/** Forgot password in three steps: email -> OTP -> new password (the hash is stored in the users table). */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const emailForm = useForm<{ email: string }>();
  const otpForm = useForm<{ otp: string }>();
  const passwordForm = useForm<{ password: string; confirm: string }>();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await action();
    } catch (err) {
      setError(apiError(err, fallback));
    } finally {
      setLoading(false);
    }
  };

  const sendCode = (address: string) =>
    run(async () => {
      await authApi.forgotPassword(address);
      setEmail(address);
      setCooldown(RESEND_SECONDS);
      setStep('otp');
      setInfo(`If ${address} is registered, a code is on its way. It expires in 5 minutes.`);
    }, 'Could not send the code');

  const verifyCode = ({ otp }: { otp: string }) =>
    run(async () => {
      await authApi.verifyResetOtp(email, otp.trim());
      setStep('password');
    }, 'Could not verify the code');

  const savePassword = ({ password }: { password: string }) =>
    run(async () => {
      await authApi.resetPassword(email, password);
      setStep('done');
    }, 'Could not update the password');

  return (
    <AuthShell title={step === 'done' ? 'Password updated' : 'Reset your password'} subtitle={SUBTITLES[step]}>
      {error && <Notice kind="error">{error}</Notice>}
      {info && !error && <Notice kind="success">{info}</Notice>}

      {step === 'email' && (
        <form onSubmit={emailForm.handleSubmit(({ email: v }) => sendCode(v.trim().toLowerCase()))} className="auth-form" noValidate>
          <Field label="Email address" required error={emailForm.formState.errors.email?.message}>
            <input type="email" className="form-input" autoComplete="email" placeholder="you@example.com"
              {...emailForm.register('email', {
                required: 'Email is required',
                validate: (v) => EMAIL_PATTERN.test(v.trim()) || 'Enter a valid email address',
              })} />
          </Field>
          <SubmitButton loading={loading}>Send code</SubmitButton>
          <p className="auth-footnote"><Link href="/login" className="auth-link">Back to sign in</Link></p>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={otpForm.handleSubmit(verifyCode)} className="auth-form" noValidate>
          <Field label="6-digit code" required error={otpForm.formState.errors.otp?.message}>
            <input className="form-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              placeholder="000000" style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18 }}
              {...otpForm.register('otp', {
                required: 'Enter the code from your email',
                pattern: { value: /^\d{6}$/, message: 'The code is 6 digits' },
              })} />
          </Field>
          <SubmitButton loading={loading}>Verify code</SubmitButton>
          <p className="auth-footnote">
            {cooldown > 0 ? (
              <>Resend code in {cooldown}s</>
            ) : (
              <button type="button" className="btn btn-link" disabled={loading} onClick={() => sendCode(email)}>Resend code</button>
            )}
            {' · '}
            <button type="button" className="btn btn-link" onClick={() => { setStep('email'); setError(''); setInfo(''); }}>Change email</button>
          </p>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(savePassword)} className="auth-form" noValidate>
          <Field label="New password" required error={passwordForm.formState.errors.password?.message} hint="At least 8 characters">
            <input type="password" className="form-input" autoComplete="new-password"
              {...passwordForm.register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })} />
          </Field>
          <Field label="Confirm password" required error={passwordForm.formState.errors.confirm?.message}>
            <input type="password" className="form-input" autoComplete="new-password"
              {...passwordForm.register('confirm', {
                required: 'Confirm your password',
                validate: (v) => v === passwordForm.getValues('password') || 'Passwords do not match',
              })} />
          </Field>
          <SubmitButton loading={loading}>Update password</SubmitButton>
        </form>
      )}

      {step === 'done' && (
        <div className="auth-success">
          <CheckCircle2 size={42} color="#34d399" className="auth-success-icon" />
          <p className="auth-success-text">Your password has been changed. You can sign in now.</p>
          <Link href="/login" className="btn btn-primary btn-block">Sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
