'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { useToast } from '@/hooks/useToast';
import type { Agent } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { agents, isLoading, fetchAgents, createAgent, updateAgent, deleteAgent } = useAgents();
  const { toasts, addToast, removeToast } = useToast();

  // ── Modal State ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  
  // ── Form State ──
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Agents on load ──
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const openCreateModal = () => {
    setEditingAgent(null);
    setModalTitle('Create New AI Agent');
    setName('');
    setSystemPrompt('');
    setTemperature(0.7);
    setModalOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setModalTitle(`Edit Agent: ${agent.name}`);
    setName(agent.name);
    setSystemPrompt(agent.systemPrompt);
    setTemperature(agent.temperature);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Agent name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, {
          name,
          systemPrompt,
          temperature,
        });
        addToast('success', `Agent "${name}" updated successfully.`);
      } else {
        await createAgent({
          name,
          systemPrompt,
          temperature,
        });
        addToast('success', `Agent "${name}" created successfully.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to save agent details';
      addToast('error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${name}"? All documents, conversation history, and knowledge base associations will be permanently vaporized.`)) {
      return;
    }
    try {
      await deleteAgent(id);
      addToast('success', `Agent "${name}" and all associated data deleted.`);
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || 'Failed to delete agent');
    }
  };

  return (
    <div className="dashboard-page page-enter">
      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Key Warning Banner ── */}
      {!user?.hasGeminiKey && (
        <div className="warning-banner glass">
          <div className="warning-banner-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="warning-content">
              <h4>Gemini API Key Required</h4>
              <p>You haven't set up your Google Gemini API Key. To chat with agents and process document embeddings, please add your key in Settings.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/settings')}>
              Configure Now
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>AI Agents</h1>
          <p>Create and customize autonomous assistants grounded in your specific data</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Agent
        </button>
      </div>

      {/* ── Agent Grid / Empty State ── */}
      {isLoading ? (
        <div className="agents-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="agent-card-loading glass">
              <div className="skeleton title-skeleton" />
              <div className="skeleton prompt-skeleton" />
              <div className="skeleton footer-skeleton" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="empty-state glass">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="11" y2="17" />
            </svg>
          </div>
          <h3 className="empty-state-title">No agents found</h3>
          <p className="empty-state-description">
            Create your first intelligent assistant, upload documentation, and start querying your custom knowledge bases.
          </p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Build First Agent
          </button>
        </div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card glass">
              <div className="agent-card-header">
                <h3 className="agent-name">{agent.name}</h3>
                <div className="agent-meta">
                  <span className="badge badge-violet">Temp {agent.temperature}</span>
                </div>
              </div>

              <p className="agent-prompt-preview">
                {agent.systemPrompt || (
                  <span className="no-prompt">No custom system prompt configured. Assumes standard assistant persona.</span>
                )}
              </p>

              <div className="agent-stats">
                <div className="stat-item">
                  <span className="stat-label">Documents</span>
                  <span className="stat-value">{agent.documentCount || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Chunks</span>
                  <span className="stat-value">{agent.chunkCount || 0}</span>
                </div>
              </div>

              <div className="agent-actions">
                <button
                  className="btn btn-primary btn-sm flex-1"
                  onClick={() => router.push(`/chat/${agent.id}`)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Chat
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => router.push(`/agents/${agent.id}/knowledge`)}
                  title="Manage Knowledge Base"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Data
                </button>
                <button
                  className="btn btn-secondary btn-sm btn-icon"
                  onClick={() => openEditModal(agent)}
                  title="Configure Persona"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="btn btn-secondary btn-sm btn-icon hover-rose"
                  onClick={() => handleDeleteAgent(agent.id, agent.name)}
                  title="Delete Agent"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal (Create/Edit) ── */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass page-enter">
            <div className="modal-header">
              <h2>{modalTitle}</h2>
              <button className="btn-close" onClick={() => setModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="input-label">Agent Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Sales Assistant, DevDoc Expert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">System Persona Prompt</label>
                <textarea
                  className="input-field"
                  placeholder="e.g. You are a technical documentation assistant. Ground your answers strictly in the uploaded files. Be concise..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="form-group">
                <div className="slider-label-row">
                  <label className="input-label">Temperature: {temperature}</label>
                  <span className="slider-hint">
                    {temperature === 0 ? 'Deterministic' : temperature >= 0.8 ? 'Creative' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.1"
                  className="temperature-slider"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="spinner" />
                      Saving...
                    </>
                  ) : (
                    'Save Agent'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard-page {
          width: 100%;
        }

        /* ── Warning Banner ── */
        .warning-banner {
          margin-bottom: var(--space-xl);
          background: rgba(251, 113, 133, 0.05);
          border: 1px solid rgba(251, 113, 133, 0.2);
        }
        .warning-banner-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px var(--space-lg);
          color: var(--accent-rose);
        }
        .warning-content {
          flex: 1;
        }
        .warning-content h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .warning-content p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .btn-sm {
          padding: 8px 14px;
          font-size: 0.8rem;
        }

        /* ── Header ── */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-xl);
          gap: 16px;
        }
        .page-header h1 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .page-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* ── Agent Grid ── */
        .agents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-lg);
        }

        .agent-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          min-height: 240px;
        }
        .agent-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }
        .agent-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .agent-prompt-preview {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 20px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .no-prompt {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .agent-stats {
          display: flex;
          gap: 24px;
          padding: 12px 0;
          border-top: 1px solid var(--glass-border);
          border-bottom: 1px solid var(--glass-border);
          margin-bottom: 16px;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .stat-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .agent-actions {
          display: flex;
          gap: 8px;
        }
        .flex-1 { flex: 1; }
        .hover-rose:hover {
          color: var(--accent-rose) !important;
          background: rgba(251, 113, 133, 0.08) !important;
          border-color: rgba(251, 113, 133, 0.2) !important;
        }

        /* ── Loading Skeletons ── */
        .agent-card-loading {
          padding: 24px;
          min-height: 240px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .title-skeleton { height: 24px; width: 60%; }
        .prompt-skeleton { height: 60px; width: 100%; }
        .footer-skeleton { height: 36px; width: 100%; margin-top: auto; }

        /* ── Modal Setup ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 28px;
          background: #0e0e1a;
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
        }
        .btn-close {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .btn-close:hover {
          color: var(--text-primary);
        }
        .form-group {
          margin-bottom: 20px;
        }
        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .slider-hint {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-violet);
        }
        .temperature-slider {
          width: 100%;
          -webkit-appearance: none;
          height: 6px;
          border-radius: var(--radius-full);
          background: var(--bg-elevated);
          outline: none;
        }
        .temperature-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent-violet);
          cursor: pointer;
          transition: transform var(--transition-fast);
        }
        .temperature-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .page-header .btn {
            width: 100%;
          }
          .warning-banner-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .warning-banner-inner .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
