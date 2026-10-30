'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';

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
      className="auth-network-node"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
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
      const signedIn = await login(data.email, data.password);
      router.push(signedIn.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err: any) {
      setError(apiError(err, 'Could not sign in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center auth-bg">

      {/* ── Animated background ── */}
      <div className="auth-bg-layer">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="auth-bg-svg">
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
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="auth-wrap auth-wrap-lg"
      >

{/* Form card */}
        <div className="glass-card auth-card auth-card-lg">
          <img src="/A_logo.svg" alt="Inventory Audit" className="auth-logo-img" />
          <h2 className="auth-card-title">Sign In</h2>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="auth-error"
              >
                <AlertCircle />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form method="post" onSubmit={handleSubmit(onSubmit)} className="auth-form auth-form-lg">

            {/* Email */}
            <div>
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-with-icon">
                <Mail />
                <input
                  id="login-email"
                  type="email"
                  className={`form-input${errors.email ? ' is-invalid' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-with-icon has-trailing">
                <Lock />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' is-invalid' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="input-trailing-btn"
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
              <div className="forgot-link-row">
                <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary auth-submit"
            >
              {loading
                ? <><Loader2 className="animate-spin" /> Signing in...</>
                : <><ChevronRight /> Sign In</>
              }
            </button>
          </form>

          <p className="auth-footnote spaced">
            New here? <Link href="/register" className="auth-link">Create an account</Link>
          </p>

          {/* Dev credentials */}
          <div className="dev-accounts">
            <p className="dev-accounts-title">
              Development Accounts
            </p>
            <div className="dev-accounts-grid">
              {DEV_CREDENTIALS.map((c) => (
                <button
                  key={c.email}
                  onClick={() => { setValue('email', c.email); setValue('password', c.password); }}
                  className="dev-account-btn"
                >
                  <span className="dev-account-label">{c.label}</span>
                  <span className="dev-account-email">{c.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="auth-powered">
          ProofChain — Powered by Hyperledger Besu + NestJS
        </p>
      </motion.div>
    </div>
  );
}
