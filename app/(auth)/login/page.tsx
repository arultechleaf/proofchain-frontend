'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface LoginForm {
  email: string;
  password: string;
}

const DEV_CREDENTIALS = [
  { label: 'Admin',     email: 'admin@proofchain.dev',  password: 'Admin@123456' },
  { label: 'Company A', email: 'alice@companya.dev',    password: 'Alice@123456' },
  { label: 'Company B', email: 'bob@companyb.dev',      password: 'Bob@123456' },
  { label: 'Auditor',   email: 'carol@auditor.dev',     password: 'Carol@123456' },
];

function NetworkNode({ x, y, delay, size = 4 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        borderRadius: '50%',
        background: 'rgba(59,130,246,0.35)',
      }}
      animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay }}
    />
  );
}

function ConnectionLine({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  return (
    <motion.line
      x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
      stroke="rgba(59,130,246,0.15)" strokeWidth="1"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 0.6, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay, repeatDelay: 2 }}
    />
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [showPw, setShowPw]   = useState(false);
  const [error,  setError]    = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">

      {/* ── Animated background ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          <ConnectionLine x1={10} y1={20} x2={30} y2={45} delay={0} />
          <ConnectionLine x1={30} y1={45} x2={70} y2={35} delay={1} />
          <ConnectionLine x1={70} y1={35} x2={85} y2={60} delay={2} />
          <ConnectionLine x1={20} y1={70} x2={50} y2={80} delay={0.5} />
          <ConnectionLine x1={50} y1={80} x2={80} y2={65} delay={1.5} />
        </svg>
        {[
          { x: 10, y: 20 }, { x: 30, y: 45 }, { x: 70, y: 35 }, { x: 85, y: 60 },
          { x: 20, y: 70 }, { x: 50, y: 80 }, { x: 80, y: 65 }, { x: 15, y: 55 },
          { x: 65, y: 15 }, { x: 90, y: 30 },
        ].map((n, i) => (
          <NetworkNode key={i} x={n.x} y={n.y} delay={i * 0.4} size={i % 3 === 0 ? 6 : 4} />
        ))}
      </div>

      {/* ── Gradient orbs ── */}
      <div style={{
        position: 'absolute', top: '25%', left: '25%',
        width: 380, height: 380, borderRadius: '50%',
        background: 'rgba(37,99,235,0.08)', filter: 'blur(64px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '25%', right: '25%',
        width: 380, height: 380, borderRadius: '50%',
        background: 'rgba(124,58,237,0.08)', filter: 'blur(64px)', pointerEvents: 'none',
      }} />

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, padding: '0 16px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              marginBottom: 14,
              boxShadow: '0 0 32px rgba(37,99,235,0.4)',
            }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Shield style={{ width: 30, height: 30, color: '#fff' }} />
          </motion.div>
          <h1 className="gradient-text" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>ProofChain</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Blockchain Delivery Verification Platform</p>
        </div>

        {/* Form card */}
        <div className="glass-card" style={{ borderRadius: 22, padding: '32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 22 }}>Sign In</h2>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontSize: 13,
                }}
              >
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569' }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 36, borderColor: errors.email ? 'rgba(239,68,68,0.5)' : undefined }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569' }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 36, paddingRight: 36, borderColor: errors.password ? 'rgba(239,68,68,0.5)' : undefined }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2,
                  }}
                >
                  {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
              {errors.password && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.password.message}</p>}
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <Link href="/forgot-password" style={{ fontSize: 12, color: '#60a5fa' }}>Forgot password?</Link>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4, fontSize: 14 }}
            >
              {loading
                ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Signing in...</>
                : <><ChevronRight style={{ width: 15, height: 15 }} /> Sign In</>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
            New here? <Link href="/register" style={{ color: '#60a5fa' }}>Create an account</Link>
          </p>

          {/* Dev credentials */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(51,65,85,0.6)' }}>
            <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Development Accounts
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEV_CREDENTIALS.map((c) => (
                <button
                  key={c.email}
                  onClick={() => { setValue('email', c.email); setValue('password', c.password); }}
                  style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(100,116,139,0.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)')}
                >
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>{c.label}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 20 }}>
          ProofChain — Powered by Hyperledger Besu + NestJS
        </p>
      </motion.div>
    </div>
  );
}
