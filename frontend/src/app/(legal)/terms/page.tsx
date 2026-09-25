'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface LegalDoc {
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

interface LegalPageProps {
  kind: 'terms_of_service' | 'privacy_policy';
  fallbackTitle: string;
  fallbackIntro: string;
  fallbackSections: { title: string; body: string }[];
}

function LegalPage({ kind, fallbackTitle, fallbackIntro, fallbackSections }: LegalPageProps) {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDocument() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/public/legal/${kind}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('Unable to load legal document');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error('Invalid legal document response');
        setDoc(json.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchDocument();
    return () => controller.abort();
  }, [kind]);

  const title = doc?.title || fallbackTitle;
  const version = doc?.version || '1.0.0';
  const updatedAt = doc?.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : null;

  return (
    <main className="min-h-screen bg-[#070a12] text-slate-200">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <header className="mb-10 border-b border-white/10 pb-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-semibold tracking-tight text-white transition-opacity hover:opacity-70">
              AgentForge
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link href="/terms" className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Terms</Link>
              <Link href="/privacy" className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Privacy</Link>
              <Link href="/register" className="rounded-lg bg-white px-3 py-2 font-medium text-slate-900 hover:bg-slate-200">Start Building</Link>
            </div>
          </div>

          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Legal</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="mt-5 text-base leading-7 text-slate-400">{fallbackIntro}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-white/10 px-3 py-1.5">Version {version}</span>
              {updatedAt && <span className="rounded-full border border-white/10 px-3 py-1.5">Updated {updatedAt}</span>}
            </div>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
          <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-6 shadow-2xl shadow-black/10 sm:p-10">
            {loading ? (
              <div className="space-y-4" aria-live="polite">
                <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                <p className="pt-4 text-sm text-slate-500">Loading the current document…</p>
              </div>
            ) : doc ? (
              <div
                className="legal-content"
                dangerouslySetInnerHTML={{ __html: doc.content }}
              />
            ) : (
              <div className="space-y-8">
                {fallbackSections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-xl font-semibold tracking-tight text-white">{section.title}</h2>
                    <p className="mt-3 leading-7 text-slate-300">{section.body}</p>
                  </section>
                ))}
                {failed && (
                  <p className="border-t border-white/10 pt-6 text-sm text-slate-500">
                    The current published document could not be retrieved, so this page is showing the built-in summary.
                  </p>
                )}
              </div>
            )}
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">On this page</p>
              <nav className="mt-4 space-y-1 text-sm text-slate-400">
                <a href="#acceptance" className="block rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Acceptance</a>
                <a href="#your-data" className="block rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Your data</a>
                <a href="#security" className="block rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Security</a>
                <a href="#responsibilities" className="block rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Responsibilities</a>
                <a href="#contact" className="block rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">Contact</a>
              </nav>
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .legal-content {
          color: rgb(203 213 225);
          font-size: 0.975rem;
          line-height: 1.8;
        }
        .legal-content h1,
        .legal-content h2,
        .legal-content h3 {
          color: white;
          font-weight: 650;
          letter-spacing: -0.02em;
          scroll-margin-top: 2rem;
        }
        .legal-content h1 { font-size: 1.75rem; margin: 0 0 1.5rem; }
        .legal-content h2 { font-size: 1.25rem; margin: 2.5rem 0 0.75rem; }
        .legal-content h3 { font-size: 1rem; margin: 1.75rem 0 0.5rem; }
        .legal-content p { margin: 0.8rem 0; }
        .legal-content ul,
        .legal-content ol { margin: 0.9rem 0; padding-left: 1.4rem; }
        .legal-content li { margin: 0.45rem 0; }
        .legal-content a { color: rgb(226 232 240); text-decoration: underline; text-underline-offset: 3px; }
        .legal-content a:hover { color: white; }
        .legal-content strong { color: white; font-weight: 600; }
        .legal-content hr { border-color: rgb(255 255 255 / 0.1); margin: 2rem 0; }
      `}</style>
    </main>
  );
}

export default function TermsOfServicePage() {
  return (
    <LegalPage
      kind="terms_of_service"
      fallbackTitle="Terms of Service"
      fallbackIntro="These terms explain the rules for using AgentForge, the responsibilities that come with creating and operating AI agents, and the boundaries of the service."
      fallbackSections={[
        { title: 'Acceptance', body: 'By creating an account or using AgentForge, you agree to these Terms of Service and applicable law. If you do not agree, do not use the service.' },
        { title: 'Your data and agents', body: 'You are responsible for the prompts, documents, credentials, and other material you provide. You must have the rights and permissions needed to use that material.' },
        { title: 'AI output', body: 'AgentForge provides tools for building AI-powered applications. Outputs may be incomplete or incorrect and should be reviewed before you rely on them for consequential decisions.' },
        { title: 'Security and misuse', body: 'Do not attempt to bypass access controls, access another user’s data, abuse the service, introduce malicious code, or use the service for unlawful activity.' },
        { title: 'Changes and availability', body: 'The service may evolve, and features may be changed, suspended, or discontinued. Where legally required, material changes to these terms will be communicated through appropriate channels.' },
        { title: 'Contact', body: 'For questions about these terms, use the support or contact channel provided by AgentForge.' },
      ]}
    />
  );
}
