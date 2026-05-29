'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import type { Agent } from '@/types';

export default function ChatPage({ params }: { params: { id: string } }) {
  const agentId = params.id;
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const {
    conversations,
    messages,
    currentConversation,
    isLoading,
    isStreaming,
    fetchConversations,
    loadConversation,
    sendMessage,
    stopStreaming,
    deleteConversation,
    newConversation,
  } = useChat(agentId);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch agent details & conversation list ──
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const { data } = await api.get(`/agents/${agentId}`);
        setAgent(data.data);
      } catch {
        addToast('error', 'Failed to retrieve agent details.');
        router.push('/dashboard');
      }
    };
    fetchAgent();
    fetchConversations();
  }, [agentId, fetchConversations, router, addToast]);

  // ── Auto Scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const currentInput = input;
    setInput('');

    try {
      await sendMessage(currentInput, currentConversation?.id);
      // Re-fetch conversation list to pick up any new conversation titles
      fetchConversations();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to stream response.');
    }
  };

  const handleConversationSelect = (id: string) => {
    if (isStreaming) {
      addToast('info', 'Please stop the active stream before switching conversations.');
      return;
    }
    loadConversation(id);
  };

  const handleDeleteConv = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete conversation "${title}"?`)) {
      return;
    }
    try {
      await deleteConversation(id);
      addToast('success', 'Conversation deleted.');
      fetchConversations();
    } catch {
      addToast('error', 'Failed to delete conversation.');
    }
  };

  const handleNewConversation = () => {
    if (isStreaming) {
      addToast('info', 'Please stop the active stream first.');
      return;
    }
    newConversation();
  };

  return (
    <div className="chat-page page-enter">
      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>

      <div className="chat-layout glass">
        {/* ── Left Panel: Conversations History ── */}
        <div className="chat-history-sidebar">
          <button className="btn btn-secondary new-conv-btn" onClick={handleNewConversation}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>

          <div className="conv-list-header">History</div>

          <div className="conv-list">
            {conversations.length === 0 ? (
              <div className="no-history">No chats yet</div>
            ) : (
              conversations.map((conv) => {
                const isActive = currentConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    className={`conv-row ${isActive ? 'active' : ''}`}
                    onClick={() => handleConversationSelect(conv.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="conv-icon">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="conv-title">{conv.title}</span>
                    <button
                      className="btn-delete-conv"
                      onClick={(e) => handleDeleteConv(e, conv.id, conv.title)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Chat Feed ── */}
        <div className="chat-feed-panel">
          {/* ── Panel Header ── */}
          <div className="chat-panel-header">
            <div className="agent-info">
              <h3>{agent?.name || 'Agent'}</h3>
              <p>Persona: {agent?.systemPrompt || 'General Assistant'}</p>
            </div>
            {agent && (agent.documentCount || 0) === 0 && (
              <div className="no-docs-warning" onClick={() => router.push(`/agents/${agentId}/knowledge`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Grounded mode inactive. Chat uses standard LLM baseline. Add data to ground.</span>
              </div>
            )}
          </div>

          {/* ── Messages Stream ── */}
          <div className="messages-stream">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="agent-avatar-large">
                  {agent?.name ? agent.name[0].toUpperCase() : 'A'}
                </div>
                <h3>Chat with {agent?.name}</h3>
                <p>
                  {(agent?.documentCount || 0) > 0
                    ? `Ask questions grounded in the ${agent?.documentCount} indexed document(s).`
                    : 'Configure custom knowledge bases to enable Retrieval-Augmented Generation.'}
                </p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.id} className={`message-wrapper ${isUser ? 'user' : 'model'}`}>
                      <div className="message-bubble">
                        <div className="message-sender">
                          {isUser ? 'You' : agent?.name}
                        </div>
                        <div className="message-content prose">
                          {msg.content || (
                            <div className="typing-indicator">
                              <span />
                              <span />
                              <span />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── Input Box ── */}
          <div className="chat-input-bar">
            <form onSubmit={handleSend} className="chat-form">
              <input
                type="text"
                className="input-field chat-input"
                placeholder={`Send a message to ${agent?.name || 'Agent'}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              
              {isStreaming ? (
                <button type="button" className="btn btn-danger btn-icon" onClick={stopStreaming} title="Stop generation">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" />
                  </svg>
                </button>
              ) : (
                <button type="submit" className="btn btn-primary btn-icon" disabled={!input.trim() || isLoading}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .chat-page {
          height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
        }

        .chat-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 280px 1fr;
          overflow: hidden;
          background: rgba(14, 14, 26, 0.5);
          height: 100%;
        }

        /* ── Left Sidebar: Conversation History ── */
        .chat-history-sidebar {
          background: rgba(9, 9, 15, 0.4);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          padding: 20px;
          overflow: hidden;
        }
        .new-conv-btn {
          width: 100%;
          margin-bottom: 20px;
        }
        .conv-list-header {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
        }
        .conv-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .no-history {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          text-align: center;
          padding: 20px 0;
        }
        .conv-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
        }
        .conv-row:hover {
          color: var(--text-primary);
          background: rgba(139, 92, 246, 0.04);
        }
        .conv-row.active {
          color: white;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }
        .conv-icon {
          flex-shrink: 0;
          opacity: 0.6;
        }
        .conv-row.active .conv-icon {
          color: var(--accent-violet);
          opacity: 1;
        }
        .conv-title {
          flex: 1;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .btn-delete-conv {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
        }
        .conv-row:hover .btn-delete-conv {
          opacity: 1;
        }
        .btn-delete-conv:hover {
          color: var(--accent-rose);
        }

        /* ── Right Panel: Chat Feed ── */
        .chat-feed-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          position: relative;
        }
        .chat-panel-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(14, 14, 26, 0.2);
          gap: 16px;
        }
        .agent-info h3 {
          font-size: 1.05rem;
          font-weight: 700;
        }
        .agent-info p {
          font-size: 0.78rem;
          color: var(--text-secondary);
          max-width: 480px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .no-docs-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(251, 113, 133, 0.08);
          border: 1px solid rgba(251, 113, 133, 0.2);
          color: var(--accent-rose);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          max-width: 400px;
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .no-docs-warning:hover {
          background: rgba(251, 113, 133, 0.14);
        }
        .no-docs-warning svg {
          flex-shrink: 0;
        }

        /* ── Messages Feed ── */
        .messages-stream {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: rgba(9, 9, 15, 0.2);
        }
        .chat-empty-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          max-width: 400px;
          margin: 0 auto;
        }
        .agent-avatar-large {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: white;
          font-weight: 800;
          font-size: 1.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          box-shadow: var(--shadow-glow-strong);
        }
        .chat-empty-state h3 {
          font-size: 1.2rem;
          font-weight: 800;
        }
        .chat-empty-state p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .message-wrapper {
          display: flex;
          width: 100%;
        }
        .message-wrapper.user {
          justify-content: flex-end;
        }
        .message-wrapper.model {
          justify-content: flex-start;
        }
        .message-bubble {
          max-width: 75%;
          padding: 16px 20px;
          border-radius: var(--radius-lg);
        }
        .message-wrapper.user .message-bubble {
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.22);
          border-bottom-right-radius: 4px;
        }
        .message-wrapper.model .message-bubble {
          background: rgba(20, 20, 42, 0.65);
          border: 1px solid var(--glass-border);
          border-bottom-left-radius: 4px;
        }
        .message-sender {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 6px;
        }
        .message-wrapper.user .message-sender {
          color: var(--text-accent);
          text-align: right;
        }
        .message-wrapper.model .message-sender {
          color: var(--accent-cyan);
        }

        /* ── Typing Indicator ── */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-secondary);
          animation: wave 1.2s ease-in-out infinite;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes wave {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30%           { transform: translateY(-4px); opacity: 1; }
        }

        /* ── Input Bar ── */
        .chat-input-bar {
          padding: 20px 24px;
          border-top: 1px solid var(--glass-border);
          background: rgba(14, 14, 26, 0.4);
        }
        .chat-form {
          display: flex;
          gap: 12px;
        }
        .chat-input {
          flex: 1;
        }

        @media (max-width: 768px) {
          .chat-layout {
            grid-template-columns: 1fr;
          }
          .chat-history-sidebar {
            display: none; /* Hide history by default on mobile for screen space */
          }
          .chat-panel-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .message-bubble {
            max-width: 90%;
          }
        }
      `}</style>
    </div>
  );
}
