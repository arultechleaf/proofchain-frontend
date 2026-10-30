'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Check, CheckCircle2 } from 'lucide-react';
import { authApi, emailOtpApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field, Notice, SubmitButton } from '@/components/ui';
import { ProfileFields, emptyProfile, profilePayload, type ProfileValues } from '@/components/account/ProfileFields';

const STEPS = ['Email', 'Personal', 'Address', 'Account'];

/** The inputs of each step, so Next only validates what is on screen. */
const STEP_FIELDS: Array<Array<keyof RegisterForm>> = [
  ['email'],
  ['firstName', 'lastName', 'dateOfBirth', 'mobile', 'alternateMobile', 'designation'],
  ['pincode', 'address'],
  ['organizationCode', 'password', 'confirm'],
];

interface RegisterForm extends ProfileValues {
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
  const [step, setStep] = useState(0);
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<RegisterForm>({ defaultValues: { ...emptyProfile(), email: '', organizationCode: '', password: '', confirm: '' } });
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
      // Verified: go straight to the next step.
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
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
        ...profilePayload(v),
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

  const lastStep = STEPS.length - 1;

  // Validate only the inputs shown on this step, then move on.
  const goNext = async () => {
    setError('');
    if (step === 0 && !isEmailVerified) {
      setError('Verify your email address to continue');
      return;
    }
    if (await trigger(STEP_FIELDS[step])) setStep((s) => Math.min(s + 1, lastStep));
  };
  const goBack = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };
  // Enter moves to the next step; only the last step really submits.
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < lastStep) void goNext();
    else void handleSubmit(onSubmit)(e);
  };

  return (
    <AuthShell wide title="Create account" subtitle="An administrator approves new accounts before they can sign in.">
      <ol className="wizard-steps" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="wizard-dot">{i < step ? <Check size={12} /> : i + 1}</span>
            <span className="wizard-label">{label}</span>
          </li>
        ))}
      </ol>

      {error && <Notice kind="error">{error}</Notice>}
      <form method="post" onSubmit={onFormSubmit} className="auth-form" noValidate>
        {step === 0 && (
          <>
            <Field label="Work email" required error={errors.email?.message}>
              <input type="email" className="form-input" autoComplete="email"
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
            </Field>
            {isEmailVerified ? (
              <Notice kind="success">Email address verified. Continue to the next step.</Notice>
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
          </>
        )}

        {step === 1 && <ProfileFields register={register} errors={errors} watch={watch} sections={['personal', 'contact']} />}
        {step === 2 && (
          <>
            <ProfileFields register={register} errors={errors} watch={watch} sections={['address']} />
            <p className="form-hint">The address is optional. You can skip it and add it later in your profile.</p>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="form-section">Organization and password</h3>
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
          </>
        )}

        <div className="wizard-actions">
          {step > 0 && <button type="button" className="btn btn-secondary" onClick={goBack}>Back</button>}
          {step < lastStep ? (
            <button type="button" className="btn btn-primary" onClick={() => void goNext()} disabled={step === 0 && !isEmailVerified}>Next</button>
          ) : (
            <SubmitButton loading={loading} disabled={!isEmailVerified}>Request account</SubmitButton>
          )}
        </div>
      </form>
      <p className="auth-footnote spaced">
        Already have an account? <Link href="/login" className="auth-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
