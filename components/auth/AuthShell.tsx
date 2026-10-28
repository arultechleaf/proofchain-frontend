'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

/** Centered card with the ProofChain logo, shared by the register / forgot / reset pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="page-center">
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="auth-wrap"
      >
        <div className="auth-brand">
          <div className="auth-logo">
            <Shield className="auth-logo-icon" />
          </div>
          <h1 className="gradient-text auth-brand-name">ProofChain</h1>
        </div>

        <div className="glass-card auth-card">
          <h2 className={`auth-card-title${subtitle ? ' has-subtitle' : ''}`}>{title}</h2>
          {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
          {children}
        </div>
      </motion.div>
    </div>
  );
}
