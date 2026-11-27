'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import LoadSpinner from '@/components/components/loadspinner/LoadSpinner';
import { AuthSplit } from '@/components/auth/AuthSplit';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [showPw, setShowPw]   = useState(false);
  const [error,  setError]    = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

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
    <AuthSplit
      title="Welcome"
      subtitle="Log in to your account to continue"
      side={{
        heading: 'Welcome Back!',
        text: 'To stay connected with us, please log in with your account details.',
        actionLabel: 'Sign up',
        actionHref: '/register',
      }}
    >
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
          <label className="form-label" htmlFor="login-email">Email</label>
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
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.password && <p className="form-error">{errors.password.message}</p>}
          <div className="forgot-link-row">
            <Link href="/forgot-password" className="auth-link">Forgot your password?</Link>
          </div>
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="btn btn-primary auth-submit"
        >
          {loading ? <><LoadSpinner size="sm" /> Logging in...</> : 'Log in'}
        </button>
      </form>

      <p className="auth-footnote spaced">
        Don&apos;t have an account? <Link href="/register" className="auth-link">Sign up</Link>
      </p>
    </AuthSplit>
  );
}
