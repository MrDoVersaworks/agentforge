'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import { AxiosError } from 'axios';

// ── Type-safe error extraction (no `any`) ──
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ? err.response?.data?.error?.message : (err.response?.data?.message ? err.response?.data?.message : fallback);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  // ── Gemini States ──
  const [apiKey, setApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [savingKey, setSavingKey] = useState(false);

  // ── Account Deletion States ──
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // ── Hydrate forms with user info ──
  useEffect(() => {
    if (user) {
      setGeminiModel(user.geminiModel ? user.geminiModel : 'gemini-2.5-flash');
    }
  }, [user]);

  // ── Save Gemini API Key & Model ──
  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);

    try {
      if (apiKey.trim()) {
        await api.post('/settings/api-key', {
          gemini_key: apiKey.trim(),
        });
        setApiKey('');
      }

      await api.patch('/settings', {
        gemini_model: geminiModel,
      });

      await refreshUser();
      addToast('success', 'Gemini credentials and settings updated.');
    } catch (err: unknown) {
      addToast('error', extractErrorMessage(err, 'Failed to update Gemini settings.'));
    } finally {
      setSavingKey(false);
    }
  };

  // ── Account deletion ──
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/auth/account', { data: { password: deletePassword } });
      addToast('success', 'Your account has been permanently deleted.');
      setDeletePassword('');
      await logout();
      router.push('/login');
    } catch (err: unknown) {
      addToast('error', extractErrorMessage(err, 'Failed to delete user account.'));
      setDeletingAccount(false);
    }
  };

  return (
    <div className="settings-page page-enter">
      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Global Settings</h1>
          <p>Configure your model access and account security</p>
        </div>
      </div>

      <div className="settings-content-layout">
        {/* ── LLM Configuration ── */}
        <div className="settings-form-column">
          {/* Card 1: LLM Setup */}
          <div className="glass settings-card">
            <div className="card-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="violet-icon">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <h3>Google Gemini Integration</h3>
            </div>
            <p className="card-desc">
              Enter your Gemini API key from Google AI Studio. Your key is encrypted at rest using AES-256-GCM.
            </p>

            <form onSubmit={handleSaveGemini}>
              <div className="form-group">
                <label className="input-label">Gemini API Key</label>
                <div className="key-input-wrapper">
                  <input
                    type="password"
                    className="input-field"
                    placeholder={user?.hasGeminiKey ? '••••••••••••••••••••••••••••••••' : 'Enter your Gemini API Key'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  {user?.hasGeminiKey && (
                    <span className="key-status-indicator active">
                      <span className="active-dot" />
                      Active Key Saved
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Preferred Gemini Model</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. gemini-2.5-flash"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingKey}>
                {savingKey ? 'Saving Settings...' : 'Save LLM Settings'}
              </button>
            </form>
          </div>

        </div>

        {/* ── Right Column: Danger Zone ── */}
        <div className="settings-danger-column">
          <div className="glass danger-card">
            <div className="danger-heading">
              <div className="danger-heading-icon" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 21 6.5v5.6c0 4.2-2.9 7.9-9 9.9-6.1-2-9-5.7-9-9.9V6.5L12 3Z" />
                  <path d="M12 8v4" />
                  <path d="M12 15.5h.01" />
                </svg>
              </div>
              <div>
                <span className="danger-kicker">ACCOUNT SECURITY</span>
                <h3>Danger Zone</h3>
              </div>
            </div>
            <div className="danger-copy">
              <h4>Delete Account &amp; Data</h4>
              <p>Permanently remove your account and the data created under it. This action cannot be reversed.</p>
            </div>
            <div className="danger-action-row">
              <div className="danger-consequence">
                <span className="danger-consequence-dot" aria-hidden="true" />
                <div className="danger-consequence-copy">
                  <span className="danger-consequence-label">What gets deleted</span>
                  <span>Agents, documents, API credentials, and chat history.</span>
                </div>
              </div>
              <div className="danger-action">
                <button
                  type="button"
                  className="btn btn-danger danger-trigger"
                  disabled={deletingAccount}
                  onClick={() => setShowDeleteAccount(true)}
                  aria-haspopup="dialog"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M6 7l1 13h10l1-13" />
                    <path d="M9 7V4h6v3" />
                  </svg>
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteAccount && (
        <div className="delete-modal-backdrop" role="presentation" onClick={() => { if (!deletingAccount) { setShowDeleteAccount(false); setDeletePassword(''); } }}>
          <section className="delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description" onClick={(event) => event.stopPropagation()}>
            <div className="delete-modal-topline">
              <div className="delete-modal-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 21 6.5v5.6c0 4.2-2.9 7.9-9 9.9-6.1-2-9-5.7-9-9.9V6.5L12 3Z" />
                  <path d="M12 8v4" />
                  <path d="M12 15.5h.01" />
                </svg>
              </div>
              <span className="delete-modal-eyebrow">Permanent action</span>
            </div>
            <h2 id="delete-account-title">Delete your account?</h2>
            <p id="delete-account-description">Your account and everything created under it will be permanently removed. There is no recovery after deletion.</p>
            <div className="delete-modal-list" aria-label="Data that will be deleted">
              <span>Agents and knowledge documents</span>
              <span>Stored API credentials and settings</span>
              <span>Conversation history</span>
            </div>
            <label className="delete-password-label" htmlFor="delete-account-password">Confirm with your password</label>
            <input
              id="delete-account-password"
              className="input-field"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Your account password"
            />
            <div className="delete-modal-actions">
              <button type="button" className="btn btn-secondary" disabled={deletingAccount} onClick={() => { setShowDeleteAccount(false); setDeletePassword(''); }}>
                Keep Account
              </button>
              <button type="button" className="btn btn-danger" disabled={deletingAccount || !deletePassword} onClick={() => void handleDeleteAccount()}>
                {deletingAccount ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .delete-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(3, 5, 12, 0.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .delete-modal {
          width: min(100%, 480px);
          padding: 28px;
          border: 1px solid rgba(251, 113, 133, 0.2);
          border-radius: 18px;
          background: var(--bg-secondary, #10131d);
          box-shadow: 0 28px 90px rgba(0,0,0,.42);
        }
        .delete-modal-topline {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .delete-modal-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(251, 113, 133, 0.2);
          border-radius: 10px;
          background: rgba(251, 113, 133, 0.08);
          color: var(--accent-rose);
        }
        .delete-modal-eyebrow {
          color: var(--accent-rose);
          font-size: 0.68rem;
          font-weight: 750;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .delete-modal h2 {
          font-size: 1.2rem;
          font-weight: 760;
          letter-spacing: -0.015em;
          margin-bottom: 8px;
        }
        .delete-modal > p {
          color: var(--text-secondary);
          font-size: .84rem;
          line-height: 1.65;
        }
        .delete-modal-list {
          display: grid;
          gap: 7px;
          margin-top: 17px;
          padding: 13px 14px;
          border: 1px solid var(--glass-border);
          border-radius: 11px;
          background: rgba(255,255,255,0.018);
        }
        .delete-modal-list span {
          position: relative;
          padding-left: 14px;
          color: var(--text-secondary);
          font-size: .75rem;
          line-height: 1.45;
        }
        .delete-modal-list span::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.55em;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent-rose);
        }
        .delete-password-label {
          display: block;
          margin-top: 20px;
          margin-bottom: 7px;
          font-size: .76rem;
          font-weight: 650;
          color: var(--text-primary);
        }
        .delete-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 10px;
          margin-top: 20px;
        }
        .delete-modal-actions .btn { min-height: 44px; }

        .settings-page {
          width: 100%;
        }

        /* ── Header ── */
        .page-header h1 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .page-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* ── Layout ── */
        .settings-content-layout {
          display: grid;
          grid-template-columns: minmax(0, 920px);
          gap: 20px;
          margin-top: 24px;
        }

        .settings-form-column,
        .settings-danger-column {
          min-width: 0;
          width: 100%;
        }

        /* ── Settings Card ── */
        .settings-card {
          padding: 24px;
          margin-bottom: 0;
        }
        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .card-header-icon h3 {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .violet-icon { color: var(--accent-violet); }
        .cyan-icon { color: var(--accent-cyan); }
        .amber-icon { color: #f59e0b; }
        .card-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .form-group {
          margin-bottom: 20px;
        }
        .select-field {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='https://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 40px;
        }
        .disabled-field {
          background: rgba(9, 9, 15, 0.4);
          border-color: rgba(255, 255, 255, 0.05);
          color: var(--text-tertiary);
          cursor: not-allowed;
        }
        .field-hint {
          display: block;
          font-size: 0.72rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        /* ── API Key Input Wrapper ── */
        .key-input-wrapper {
          position: relative;
        }
        .key-status-indicator {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        .key-status-indicator.active {
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.2);
          color: var(--accent-emerald);
        }
        .active-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent-emerald);
        }

        /* ── Danger Card ── */
        .danger-card {
          box-sizing: border-box;
          width: 100%;
          position: relative;
          padding: 32px;
          overflow: hidden;
          border: 1px solid rgba(255, 69, 58, 0.18);
          background: linear-gradient(180deg, rgba(255, 69, 58, 0.035), rgba(255,255,255,0.012));
          box-shadow: none;
        }
        .danger-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 3px;
          background: var(--accent-rose);
          opacity: 0.85;
        }
        .danger-card:hover {
          border-color: rgba(251, 113, 133, 0.24);
          box-shadow: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.014));
        }
        .danger-heading {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .danger-heading-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(251, 113, 133, 0.18);
          border-radius: 9px;
          background: rgba(251, 113, 133, 0.06);
          color: var(--accent-rose);
        }
        .danger-kicker {
          display: block;
          margin-bottom: 2px;
          color: var(--accent-rose);
          font-size: 0.57rem;
          font-weight: 800;
          letter-spacing: 0.13em;
          line-height: 1.15;
        }
        .danger-heading h3 {
          font-size: 1.05rem;
          line-height: 1.2;
          font-weight: 750;
          color: var(--text-primary);
        }
        .danger-copy {
          margin-top: 20px;
          padding-left: 0;
        }
        .danger-copy h4 {
          font-size: 0.92rem;
          line-height: 1.3;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .danger-copy p {
          max-width: 700px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          line-height: 1.5;
        }
        .danger-action-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
          margin-top: 22px;
          padding: 18px 0 0;
          border-top: 1px solid var(--glass-border);
        }
        .danger-action {
          min-width: 0;
        }
        .danger-consequence {
          min-width: 0;
          padding: 11px 13px;
          border: 1px solid rgba(255, 69, 58, 0.12);
          border-radius: 10px;
          background: rgba(255, 69, 58, 0.035);
          color: var(--text-tertiary);
          font-size: 0.72rem;
          line-height: 1.45;
        }
        .danger-consequence-copy {
          display: block;
          min-width: 0;
        }
        .danger-consequence-label {
          color: var(--text-primary);
          font-size: 0.7rem;
          font-weight: 700;
          margin-right: 5px;
        }
        .danger-consequence-label::after {
          content: ":";
        }
        .danger-consequence-dot {
          display: none;
        }
        .danger-trigger {
          min-width: 158px;
          min-height: 42px;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          border-radius: 9px;
          background: rgba(251, 113, 133, 0.04);
          border-color: rgba(251, 113, 133, 0.24);
          color: var(--accent-rose);
          font-size: 0.73rem;
          font-weight: 700;
          letter-spacing: 0.005em;
          white-space: nowrap;
        }
        .danger-trigger svg {
          flex: 0 0 auto;
          opacity: 0.9;
        }
        .danger-trigger:hover {
          background: rgba(251, 113, 133, 0.085);
          border-color: rgba(251, 113, 133, 0.38);
          color: var(--accent-rose);
          box-shadow: none;
        }

        @media (max-width: 560px) {
          .danger-card {
            padding: 24px;
          }
          .danger-heading {
            gap: 10px;
          }
          .danger-heading-icon {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }
          .danger-heading h3 {
            font-size: 0.98rem;
          }
          .danger-copy {
            margin-top: 16px;
            padding-left: 0;
          }
          .danger-copy h4 {
            font-size: 0.86rem;
          }
          .danger-copy p {
            font-size: 0.76rem;
            line-height: 1.55;
          }
          .danger-action-row {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-top: 18px;
            padding: 16px 0 0;
          }
          .danger-consequence {
            font-size: 0.7rem;
          }
          .danger-trigger {
            width: 100%;
            min-height: 42px;
          }
        }

        @media (max-width: 560px) {
          .delete-modal {
            padding: 24px;
          }
          .delete-modal-actions {
            grid-template-columns: 1fr;
          }
          .delete-modal-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
