'use client';

import { AuthSplit, type AuthSide } from './AuthSplit';

/** Shared by the register / forgot / change-password pages: the split welcome layout. */
const DEFAULT_SIDE: AuthSide = {
  heading: 'Welcome!',
  text: 'Blockchain-verified delivery and billing ledger for your business.',
  actionLabel: 'Sign in',
  actionHref: '/login',
};

export function AuthShell({ title, subtitle, children, wide, side }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  /** Text and button on the green panel. */
  side?: AuthSide;
}) {
  return (
    <AuthSplit title={title} subtitle={subtitle} wide={wide} side={side ?? DEFAULT_SIDE}>
      {children}
    </AuthSplit>
  );
}
