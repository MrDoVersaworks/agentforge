'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useKnowledge } from '@/hooks/useKnowledge';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import type { Agent } from '@/types';

export default function KnowledgePage({ params }: { params: { id: string } }) {
  const agentId = params.id;
  const router = useRouter();
  const { documents, isLoading, isUploading, fetchDocuments, uploadDocument, deleteDocument } = useKnowledge(agentId);
  const { toasts, addToast, removeToast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch agent details ──
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
    fetchDocuments();
  }, [agentId, fetchDocuments, router, addToast]);

  // ── File reader helper ──
  const processFile = (file: File) => {
    if (!file) return;

    // Limit to text/markdown/pdf etc (or just read any as text if we chunk it)
    // Let's check size limit (e.g. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'File size exceeds the 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text || !text.trim()) {
        addToast('error', 'File is empty or could not be read.');
        return;
      }
      try {
        await uploadDocument(file.name, text);
        addToast('success', `"${file.name}" uploaded and chunked successfully.`);
      } catch (err: any) {
        addToast('error', err.response?.data?.error?.message || `Failed to process "${file.name}"`);
      }
    };
    reader.onerror = () => {
      addToast('error', 'Error reading file contents.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the document "${name}"? This will delete all search indexes and vector embeddings associated with it.`)) {
      return;
    }
    try {
      await deleteDocument(docId);
      addToast('success', `"${name}" removed from knowledge base.`);
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || 'Failed to delete document');
    }
  };

  return (
    <div className="knowledge-page page-enter">
      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Back Navigation ── */}
      <div className="back-link" onClick={() => router.push('/dashboard')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Agents
      </div>

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Knowledge Base</h1>
          <p>
            Ground <span className="agent-highlight">{agent?.name || 'Agent'}</span> using local files (.txt, .md, .csv)
          </p>
        </div>
      </div>

      <div className="knowledge-content-layout">
        {/* ── Left Column: Upload ── */}
        <div className="upload-column">
          <div className="glass upload-card">
            <h3>Upload Documents</h3>
            <p className="upload-subtitle">Files will be parsed, split into semantic chunks, and indexed into pgvector.</p>

            <div
              className={`dropzone ${dragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                accept=".txt,.md,.json,.csv,.xml,.html"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              
              {isUploading ? (
                <div className="dropzone-inner">
                  <div className="spinner-large" />
                  <h4>Vectorizing document...</h4>
                  <p>Splitting content, calculating embeddings, and writing to PostgreSQL.</p>
                </div>
              ) : (
                <div className="dropzone-inner">
                  <div className="upload-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <h4>Drag &amp; drop file here</h4>
                  <p>or click to browse from device (Max 2MB)</p>
                  <div className="file-types-hint">Supports .txt, .md, .csv, .json</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Documents List ── */}
        <div className="documents-column">
          <div className="glass docs-card">
            <div className="card-header">
              <h3>Indexed Files</h3>
              <span className="badge badge-cyan">{documents.length} Files</span>
            </div>

            {isLoading ? (
              <div className="docs-list-loading">
                {[1, 2].map((n) => (
                  <div key={n} className="doc-row-skeleton">
                    <div className="skeleton row-title" />
                    <div className="skeleton row-meta" />
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                </div>
                <h4 className="empty-state-title">No documents indexed</h4>
                <p className="empty-state-description">Upload text files on the left to train your AI assistant with customized context.</p>
              </div>
            ) : (
              <div className="docs-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="doc-row">
                    <div className="doc-info">
                      <div className="doc-name">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="doc-icon">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>{doc.filename}</span>
                      </div>
                      <div className="doc-meta">
                        <span>{doc.chunkCount || 0} vectors</span>
                        <span className="dot-divider" />
                        <span>Indexed {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="btn-delete-doc"
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      title="Delete document"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .knowledge-page {
          width: 100%;
        }

        /* ── Back Link ── */
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 20px;
          transition: color var(--transition-fast);
        }
        .back-link:hover {
          color: var(--text-primary);
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
        .agent-highlight {
          color: var(--accent-cyan);
          font-weight: 600;
        }

        /* ── Layout ── */
        .knowledge-content-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: var(--space-xl);
          margin-top: var(--space-xl);
        }

        @media (max-width: 1024px) {
          .knowledge-content-layout {
            grid-template-columns: 1fr;
          }
        }

        /* ── Upload Card ── */
        .upload-card, .docs-card {
          padding: 28px;
        }
        .upload-card h3, .docs-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .upload-subtitle {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        /* ── Dropzone ── */
        .dropzone {
          border: 2px dashed rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-lg);
          background: rgba(14, 14, 26, 0.4);
          cursor: pointer;
          transition: all var(--transition-base);
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dropzone:hover {
          border-color: var(--accent-violet);
          background: rgba(139, 92, 246, 0.03);
        }
        .dropzone.active {
          border-color: var(--accent-cyan);
          background: rgba(34, 211, 238, 0.05);
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.1);
        }
        .dropzone.uploading {
          border-color: var(--accent-violet);
          background: rgba(14, 14, 26, 0.6);
          cursor: not-allowed;
        }
        .hidden-file-input {
          display: none;
        }
        .dropzone-inner {
          text-align: center;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .upload-icon {
          color: var(--text-tertiary);
          margin-bottom: 4px;
          transition: color var(--transition-fast);
        }
        .dropzone:hover .upload-icon {
          color: var(--accent-violet);
        }
        .dropzone-inner h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .dropzone-inner p {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .file-types-hint {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          background: rgba(255, 255, 255, 0.03);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          margin-top: 8px;
        }

        /* ── Spinner Large ── */
        .spinner-large {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: var(--accent-violet);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 8px;
        }

        /* ── Documents Card ── */
        .docs-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .docs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 480px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .doc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: rgba(14, 14, 26, 0.5);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .doc-row:hover {
          border-color: var(--glass-border-hover);
          background: rgba(20, 20, 42, 0.6);
        }
        .doc-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow: hidden;
        }
        .doc-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
        }
        .doc-name span {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .doc-icon {
          color: var(--accent-violet);
          flex-shrink: 0;
        }
        .doc-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
        .dot-divider {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--text-tertiary);
          opacity: 0.5;
        }
        .btn-delete-doc {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }
        .btn-delete-doc:hover {
          color: var(--accent-rose);
          background: rgba(251, 113, 133, 0.08);
        }

        /* ── Loading Skeletons ── */
        .docs-list-loading {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .doc-row-skeleton {
          height: 64px;
          border-radius: var(--radius-md);
          background: rgba(14, 14, 26, 0.4);
          border: 1px solid var(--glass-border);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }
        .row-title { height: 16px; width: 40%; }
        .row-meta { height: 12px; width: 60%; }
      `}</style>
    </div>
  );
}
