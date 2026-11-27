'use client';

/**
 * "Welcome back" card shown in the top-right corner after a successful login:
 * initials with a check mark, the user's name, role and ID, and a bar that counts down to closing.
 */
import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import styles from './WelcomeToast.module.css';

export interface WelcomeToastProps {
  name: string;
  roleLabel: string;
  userId: number | string;
  /** Milliseconds before it closes itself. */
  duration?: number;
  onClose: () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : parts[0][1] ?? '';
  return (first + last).toUpperCase();
}

export function WelcomeToast({ name, roleLabel, userId, duration = 4000, onClose }: WelcomeToastProps) {
  // keeps the timer from restarting when the parent re-renders
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => closeRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className={styles.holder}>
      <div className={styles.card} role="status" aria-live="polite">
        <div className={styles.avatar} aria-hidden="true">
          {initialsOf(name)}
          <span className={styles.check}>
            <Check size={12} strokeWidth={3} />
          </span>
        </div>

        <div className={styles.body}>
          <p className={styles.kicker}>Welcome back</p>
          <p className={styles.name}>{name}</p>
          <div className={styles.chips}>
            <span className={`${styles.chip} ${styles.chipRole}`}>{roleLabel}</span>
            <span className={styles.chip}>ID #{userId}</span>
          </div>
        </div>

        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>

        {duration > 0 && (
          <div className={styles.track} aria-hidden="true">
            <div className={styles.bar} style={{ animationDuration: `${duration}ms` }} />
          </div>
        )}
      </div>
    </div>
  );
}
