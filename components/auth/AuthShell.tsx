'use client';

import { motion } from 'framer-motion';

/** Centered card with the ProofChain logo, shared by the register / forgot / reset pages. */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    // wide (the step-by-step sign-up): a roomier card pinned to the top, so it does not jump between steps
    <div className={`page-center auth-bg${wide ? ' auth-top' : ''}`}>
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`auth-wrap${wide ? ' auth-wrap-wide' : ''}`}
      >

<div className="glass-card auth-card">
          <img src="/A_logo.svg" alt="Inventory Audit" className="auth-logo-img" />
          <h2 className={`auth-card-title${subtitle ? ' has-subtitle' : ''}`}>{title}</h2>
          {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
          {children}
        </div>
      </motion.div>
    </div>
  );
}
