'use client';

import { motion } from 'framer-motion';

/** Centered card with the ProofChain logo, shared by the register / forgot / reset pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="page-center auth-bg">
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="auth-wrap"
      >
        <div className="auth-brand">
          <img src="/inventory-audit-hexlens-A-logo.svg" alt="Inventory Audit" className="auth-logo-img" />
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
