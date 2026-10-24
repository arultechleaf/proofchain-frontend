'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

/** Centered card with the ProofChain logo, shared by the register / forgot / reset pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="page-center">
      <div style={{
        position: 'absolute', top: '25%', left: '25%', width: 380, height: 380, borderRadius: '50%',
        background: 'rgba(37,99,235,0.08)', filter: 'blur(64px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '25%', right: '25%', width: 380, height: 380, borderRadius: '50%',
        background: 'rgba(124,58,237,0.08)', filter: 'blur(64px)', pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440, padding: '24px 16px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56,
            borderRadius: 16, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', marginBottom: 12,
            boxShadow: '0 0 32px rgba(37,99,235,0.4)',
          }}>
            <Shield style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>ProofChain</h1>
        </div>

        <div className="glass-card" style={{ borderRadius: 22, padding: '28px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: subtitle ? 6 : 20 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{subtitle}</p>}
          {children}
        </div>
      </motion.div>
    </div>
  );
}
