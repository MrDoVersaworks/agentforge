'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  // ── Gemini States ──
  const [apiKey, setApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [savingKey, setSavingKey] = useState(false);

  // ── Profile States ──
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Account Deletion States ──
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── Hydrate forms with user info ──
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setGeminiModel(user.geminiModel || 'gemini-2.5-flash');
    }
  }, [user]);

  // ── Save Gemini API Key & Model ──
  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);

    try {
      // 1. Save API Key if user typed anything
      if (apiKey.trim()) {
        await api.post('/settings/api-key', {
          gemini_key: apiKey.trim(),
        });
        setApiKey('');
      }

      // 2. Update Gemini Model
      await api.patch('/settings', {
        gemini_model: geminiModel,
      });

      await refreshUser();
      addToast('success', 'Gemini credentials and settings updated.');
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update Gemini settings.');
    } finally {
      setSavingKey(false);
    }
  };

  // ── Save Profile Name ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Name cannot be empty.');
      return;
    }
    setSavingProfile(true);

    try {
      await api.patch('/settings', {
        name: name.trim(),
      });
      await refreshUser();
      addToast('success', 'Profile updated successfully.');
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Account Vaporization ──
  const handleDeleteAccount = async () => {
    const doubleConfirm = confirm(
      '🚨 WARNING: This action is permanent and irreversible!\n\nAll your custom agents, uploaded document indexes, vector chunks, and conversation histories will be completely vaporized. Do you wish to proceed?'
    );
    if (!doubleConfirm) return;

    setDeletingAccount(true);
    try {
      await api.delete('/settings/account');
      addToast('success', 'Your account has been successfully vaporized.');
      await logout();
      router.push('/login');
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || 'Failed to delete user account.');
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
          <p>Configure LLM credentials, update account info, and manage data vaporization</p>
        </div>
      </div>

      <div className="settings-content-layout">
        {/* ── Left Column: Credentials & Profile ── */}
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

          {/* Card 2: Profile Setup */}
          <div className="glass settings-card">
            <div className="card-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cyan-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h3>Profile Settings</h3>
            </div>
            <p className="card-desc">Update your personal account display information.</p>

            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  className="input-field disabled-field"
                  value={user?.email || ''}
                  disabled
                />
                <span className="field-hint">Email address cannot be changed.</span>
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Updating Profile...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right Column: Danger Zone ── */}
        <div className="settings-danger-column">
          <div className="glass danger-card">
            <div className="danger-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rose-icon">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3>Danger Zone</h3>
            </div>
            <p className="danger-desc">
              Actions in this section are highly destructive. Please double check before executing.
            </p>

            <div className="danger-action-row">
              <div className="action-text">
                <h4>Vaporize Account Data</h4>
                <p>Delete your profile and permanently erase all custom AI agents, document chunks, and chat history.</p>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
              >
                {deletingAccount ? 'Vaporizing...' : 'Vaporize Account'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
          grid-template-columns: 1.2fr 1fr;
          gap: var(--space-xl);
          margin-top: var(--space-xl);
        }

        @media (max-width: 1024px) {
          .settings-content-layout {
            grid-template-columns: 1fr;
          }
        }

        /* ── Settings Card ── */
        .settings-card {
          padding: 28px;
          margin-bottom: var(--space-xl);
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
          background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
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
          border-color: rgba(251, 113, 133, 0.25);
          background: rgba(251, 113, 133, 0.02);
          padding: 28px;
        }
        .danger-card:hover {
          border-color: rgba(251, 113, 133, 0.4);
          box-shadow: 0 0 24px rgba(251, 113, 133, 0.08);
          background: rgba(251, 113, 133, 0.04);
        }
        .danger-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          color: var(--accent-rose);
        }
        .danger-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .danger-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 20px;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .danger-action-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .action-text h4 {
          font-size: 0.92rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .action-text p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .danger-action-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .danger-action-row .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
