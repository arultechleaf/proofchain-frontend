'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export type OtpStatus = 'idle' | 'verifying' | 'success';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are entered. */
  onComplete?: (value: string) => void;
  status?: OtpStatus;
  length?: number;
  hasError?: boolean;
  /** Seconds left before a resend is allowed (0 = allowed now). */
  resendIn?: number;
  onResend?: () => void;
}

/** Animated OTP entry: access-code boxes -> "Verifying..." spinner -> "Access Granted" check. */
export function OtpEntry({ value, onChange, onComplete, status = 'idle', length = 6, hasError = false, resendIn = 0, onResend }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const locked = status !== 'idle';

  useEffect(() => {
    if (status === 'idle') refs.current[Math.min(value.length, length - 1)]?.focus();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const onInput = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = digit || ' ';
    commit(chars.join('').replace(/ +$/, '').slice(0, length));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    commit(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className={`otp-entry otp-${status}`} aria-live="polite">
      {status === 'idle' && (
        <>
          <p className="otp-title">Enter Access Code</p>
          <p className="otp-sub">A {length}-digit code has been sent to your email.</p>
          <div className="otp-boxes">
            {Array.from({ length }, (_, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                className={`otp-box${value[i] ? ' filled' : ''}${hasError ? ' invalid' : ''}`}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                value={value[i] ?? ''}
                disabled={locked}
                onChange={(e) => onInput(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>
          {onResend && (
            <p className="otp-resend">
              Didn't receive it?{' '}
              <button type="button" disabled={resendIn > 0} onClick={onResend}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend'}
              </button>
            </p>
          )}
        </>
      )}
      {status === 'verifying' && (
        <div className="otp-state">
          <Loader2 size={40} className="otp-spinner" />
          <p className="otp-title">Verifying...</p>
        </div>
      )}
      {status === 'success' && (
        <div className="otp-state">
          <CheckCircle2 size={44} color="#4ade80" className="otp-check" />
          <p className="otp-title otp-done">Verification completed</p>
        </div>
      )}
    </div>
  );
}
