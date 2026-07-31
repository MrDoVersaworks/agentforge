'use client';

import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface LegalDoc {
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

export default function PrivacyPolicyPage() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrivacyPolicy() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/public/legal/privacy_policy`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDoc(json.data);
          }
        }
      } catch (_err) {
        // Fallback silently if offline or API unavailable
      } finally {
        setLoading(false);
      }
    }
    fetchPrivacyPolicy();
  }, []);

  return (
    <div className="min-h-screen bg-[#04071a] text-[#94a3b8] p-8 pt-24">
      <div className="max-w-4xl mx-auto py-12 space-y-8">
        <h1 className="text-4xl font-bold mb-8 text-white">
          {doc ? doc.title : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-[#64748b]">
          Version: {doc ? doc.version : '1.0.0'} &bull; Last updated: {doc ? new Date(doc.updatedAt).toLocaleDateString() : 'July 2026'}
        </p>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading document...</div>
        ) : doc ? (
          <div
            className="prose prose-invert max-w-none space-y-4"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        ) : (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">1. Information We Collect</h2>
              <p>When you use AgentForge, we collect agent configurations, system prompts, knowledge documents, and conversation history.</p>
            </section>
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">2. Data Security</h2>
              <p>All sensitive credentials (including BYOK Gemini keys) are encrypted using AES-256-GCM before storage.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
