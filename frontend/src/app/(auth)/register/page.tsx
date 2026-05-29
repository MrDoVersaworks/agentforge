'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// ================================================================
// AgentForge — Register Page
// ================================================================

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, name);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="auth-container page-enter">
        <div className="auth-card glass">
          {/* ── Header ── */}
          <div className="auth-header">
            <div className="auth-logo" onClick={() => router.push('/')}>
              <div className="auth-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="auth-logo-text">AgentForge</span>
            </div>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start building intelligent AI agents in minutes</p>
          </div>

          {/* ── Form ── */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label className="input-label" htmlFor="register-name">Full Name</label>
              <input
                id="register-name"
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label className="input-label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="input-label" htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label className="input-label" htmlFor="register-confirm">Confirm Password</label>
              <input
                id="register-confirm"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          {/* ── Footer ── */}
          <p className="auth-footer">
            Already have an account?{' '}
            <button className="auth-link" onClick={() => router.push('/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 24px;
        }
        .auth-card {
          padding: 36px 32px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          cursor: pointer;
        }
        .auth-logo-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border-radius: var(--radius-sm);
          color: white;
        }
        .auth-logo-text {
          font-size: 1.1rem;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .auth-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .auth-field {
          display: flex;
          flex-direction: column;
        }
        .auth-error {
          padding: 10px 14px;
          background: rgba(251, 113, 133, 0.1);
          border: 1px solid rgba(251, 113, 133, 0.25);
          border-radius: var(--radius-md);
          color: var(--accent-rose);
          font-size: 0.82rem;
          font-weight: 500;
        }
        .auth-submit {
          width: 100%;
          margin-top: 4px;
          padding: 12px;
        }
        .auth-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .auth-link {
          background: none;
          border: none;
          color: var(--accent-violet);
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-family);
          font-size: 0.82rem;
        }
        .auth-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
