'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// ================================================================
// AgentForge — Landing Page
// Interactive particle constellation + sandbox demo + split hero
// ================================================================

// ── Particle System (Canvas-based neural constellation) ──
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulseSpeed: number;
  pulseOffset: number;
}

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };
    const PARTICLE_COUNT = 80;
    const CONNECTION_DISTANCE = 140;
    const MOUSE_RADIUS = 200;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function initParticles() {
      if (!canvas) return;
      particles = [];
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(time: number) {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Clamp velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1) {
          p.vx = (p.vx / speed) * 1;
          p.vy = (p.vy / speed) * 1;
        }

        const pulse = Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7;
        const alpha = p.opacity * pulse;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw mouse connections
      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const alpha = (1 - dist / MOUSE_RADIUS) * 0.3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function handleMouseLeave() {
      mouse.x = -1000;
      mouse.y = -1000;
    }

    resize();
    initParticles();
    animationId = requestAnimationFrame(draw);
    window.addEventListener('resize', () => { resize(); initParticles(); });
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef]);
}

// ── Typing animation hook ──
function useTypingEffect(words: string[], typingSpeed: number, deletingSpeed: number, pauseTime: number) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && text === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timeout = setTimeout(() => {
        setText(
          isDeleting
            ? currentWord.substring(0, text.length - 1)
            : currentWord.substring(0, text.length + 1)
        );
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, wordIndex, isDeleting, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const typedWord = useTypingEffect(
    ['Your Own Data', 'Legal Documents', 'Research Papers', 'Product Docs', 'Knowledge Bases'],
    80, 40, 2000
  );

  useParticleCanvas(canvasRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // ── Sandbox Demo (auto-provision guest account) ──
  const handleDemoSandbox = useCallback(async () => {
    if (isDemoLoading) return;
    setIsDemoLoading(true);
    setDemoError('');

    const demoEmail = 'guest@sandbox.agentforge.dev';
    const demoPassword = 'SandboxDemo2026!';

    try {
      await login(demoEmail, demoPassword);
      router.push('/dashboard');
    } catch {
      try {
        await register(demoEmail, demoPassword, 'Sandbox Guest');
        router.push('/dashboard');
      } catch {
        setDemoError('Failed to initialize sandbox. Please try registering manually.');
      }
    } finally {
      setIsDemoLoading(false);
    }
  }, [isDemoLoading, login, register, router]);

  if (!mounted) return null;

  if (isLoading || isAuthenticated) {
    return (
      <div className="landing-loader">
        <div className="landing-loader-spinner" />
        <style jsx>{`
          .landing-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: var(--bg-primary);
          }
          .landing-loader-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(139, 92, 246, 0.1);
            border-top-color: var(--accent-violet);
            border-radius: 50%;
            animation: spin 0.8s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* ── Interactive Particle Canvas ── */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* ── Ambient glow spots ── */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="landing-logo-text">AgentForge</span>
          </div>
          <div className="landing-nav-actions">
            <button className="btn btn-ghost" onClick={() => router.push('/login')}>
              Sign In
            </button>
            <button className="btn btn-primary" onClick={() => router.push('/register')}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section (Split Layout) ── */}
      <main className="landing-hero page-enter">
        <div className="hero-split">
          {/* Left: Content */}
          <div className="hero-content">
            <div className="landing-hero-badge">
              <span className="landing-hero-badge-dot" />
              Powered by Google Gemini &amp; pgvector
            </div>

            <h1 className="landing-hero-title">
              Build Intelligent
              <span className="landing-hero-gradient"> AI Agents </span>
              From <span className="typed-text">{typedWord}</span>
              <span className="typed-cursor">|</span>
            </h1>

            <p className="landing-hero-subtitle">
              Upload documents, configure custom system prompts, and deploy 
              RAG-powered chatbots that actually understand your knowledge base. 
              No infrastructure complexity. No vendor lock-in.
            </p>

            <div className="landing-hero-cta">
              <button className="btn btn-primary btn-lg" onClick={() => router.push('/register')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Start Building - Free
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={handleDemoSandbox}
                disabled={isDemoLoading}
              >
                {isDemoLoading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Demo Sandbox
                  </>
                )}
              </button>
            </div>
            {demoError && <p className="demo-error">{demoError}</p>}

            {/* Tech stack pills */}
            <div className="tech-pills">
              <span className="tech-pill">Next.js 14</span>
              <span className="tech-pill">Express</span>
              <span className="tech-pill">Gemini AI</span>
              <span className="tech-pill">pgvector</span>
              <span className="tech-pill">AES-256</span>
            </div>
          </div>

          {/* Right: RAG Pipeline Visualization */}
          <div className="hero-visual">
            <div className="pipeline-card glass">
              <div className="pipeline-header">
                <div className="pipeline-dot pipeline-dot-red" />
                <div className="pipeline-dot pipeline-dot-yellow" />
                <div className="pipeline-dot pipeline-dot-green" />
                <span className="pipeline-title">RAG Pipeline</span>
              </div>
              <div className="pipeline-body">
                {/* Step 1: Upload */}
                <div className="pipeline-step pipeline-step-animate-1">
                  <div className="pipeline-step-icon pipeline-step-violet">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="pipeline-step-content">
                    <span className="pipeline-step-label">Documents</span>
                    <span className="pipeline-step-desc">Upload .txt knowledge files</span>
                  </div>
                </div>

                <div className="pipeline-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>

                {/* Step 2: Chunk & Embed */}
                <div className="pipeline-step pipeline-step-animate-2">
                  <div className="pipeline-step-icon pipeline-step-cyan">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className="pipeline-step-content">
                    <span className="pipeline-step-label">Chunk &amp; Embed</span>
                    <span className="pipeline-step-desc">768-dim vectors via Gemini</span>
                  </div>
                </div>

                <div className="pipeline-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>

                {/* Step 3: Cosine Retrieval */}
                <div className="pipeline-step pipeline-step-animate-3">
                  <div className="pipeline-step-icon pipeline-step-emerald">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <div className="pipeline-step-content">
                    <span className="pipeline-step-label">Cosine Retrieval</span>
                    <span className="pipeline-step-desc">Semantic vector search</span>
                  </div>
                </div>

                <div className="pipeline-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>

                {/* Step 4: Grounded Response */}
                <div className="pipeline-step pipeline-step-animate-4">
                  <div className="pipeline-step-icon pipeline-step-amber">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="pipeline-step-content">
                    <span className="pipeline-step-label">Grounded Response</span>
                    <span className="pipeline-step-desc">Context-aware streaming</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature Cards ── */}
        <div className="landing-features">
          <div className="landing-feature-card glass">
            <div className="landing-feature-icon landing-feature-icon-violet">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Knowledge Ingestion</h3>
            <p className="landing-feature-desc">
              Upload text documents. Our pipeline chunks, embeds, and stores them in pgvector 
              for instant semantic retrieval.
            </p>
          </div>

          <div className="landing-feature-card glass">
            <div className="landing-feature-icon landing-feature-icon-cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="landing-feature-title">RAG-Powered Chat</h3>
            <p className="landing-feature-desc">
              Real-time streaming responses grounded in your documents. 
              Cosine similarity search retrieves the most relevant context.
            </p>
          </div>

          <div className="landing-feature-card glass">
            <div className="landing-feature-icon landing-feature-icon-emerald">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="landing-feature-title">AES-256 Security</h3>
            <p className="landing-feature-desc">
              Your API keys are encrypted at rest with AES-256-GCM. 
              JWT auth with httpOnly refresh tokens. Zero-knowledge architecture.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p className="landing-footer-line">AgentForge AI Chatbot Builder — Engineered with Next.js &amp; Express.</p>
        <p className="landing-footer-author">
          Architected by <span className="landing-footer-accent">Oyewole Favour</span>
        </p>
      </footer>

      <style jsx>{`
        .landing-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Particle Canvas ── */
        .particle-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: auto;
        }

        /* ── Ambient Glows ── */
        .ambient-glow {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .ambient-glow-1 {
          width: 500px;
          height: 500px;
          background: rgba(139, 92, 246, 0.08);
          top: -10%;
          left: -5%;
        }
        .ambient-glow-2 {
          width: 400px;
          height: 400px;
          background: rgba(99, 102, 241, 0.06);
          bottom: -5%;
          right: -5%;
        }
        .ambient-glow-3 {
          width: 300px;
          height: 300px;
          background: rgba(34, 211, 238, 0.04);
          top: 50%;
          right: 15%;
        }

        /* ── Nav ── */
        .landing-nav {
          position: relative;
          z-index: 10;
          padding: 20px 32px;
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.06);
        }
        .landing-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .landing-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .landing-logo-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border-radius: var(--radius-md);
          color: white;
        }
        .landing-logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Hero (Split) ── */
        .landing-hero {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 24px 40px;
        }

        .hero-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          max-width: 1200px;
          width: 100%;
          align-items: center;
          margin-bottom: 80px;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
        }

        .landing-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: var(--radius-full);
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.2);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-accent);
          margin-bottom: 28px;
          letter-spacing: 0.02em;
          width: fit-content;
        }
        .landing-hero-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-emerald);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.5); }
        }

        .landing-hero-title {
          font-size: clamp(2rem, 3.5vw, 3.2rem);
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .landing-hero-gradient {
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .typed-text {
          color: var(--accent-cyan);
        }
        .typed-cursor {
          color: var(--accent-violet);
          animation: blink 1s step-end infinite;
          font-weight: 300;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          50.1%, 100% { opacity: 0; }
        }

        .landing-hero-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 520px;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .landing-hero-cta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .btn-lg {
          padding: 14px 28px;
          font-size: 0.95rem;
        }

        .demo-error {
          font-size: 0.82rem;
          color: var(--accent-rose);
          margin-bottom: 16px;
        }

        .tech-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .tech-pill {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-tertiary);
          border: 1px solid rgba(139, 92, 246, 0.1);
          background: rgba(139, 92, 246, 0.04);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        /* ── Pipeline Visualization ── */
        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
          animation: float-visual 6s ease-in-out infinite;
        }
        @keyframes float-visual {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }

        .pipeline-card {
          width: 100%;
          max-width: 400px;
          overflow: hidden;
        }
        .pipeline-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(14, 14, 26, 0.5);
        }
        .pipeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .pipeline-dot-red { background: #ef4444; }
        .pipeline-dot-yellow { background: #eab308; }
        .pipeline-dot-green { background: #22c55e; }
        .pipeline-title {
          margin-left: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .pipeline-body {
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pipeline-step {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          background: rgba(139, 92, 246, 0.04);
          border: 1px solid rgba(139, 92, 246, 0.06);
          transition: all var(--transition-base);
        }
        .pipeline-step:hover {
          border-color: var(--glass-border-hover);
          background: rgba(139, 92, 246, 0.08);
        }

        .pipeline-step-animate-1 { animation: step-fade-in 0.5s ease-out 0.2s both; }
        .pipeline-step-animate-2 { animation: step-fade-in 0.5s ease-out 0.5s both; }
        .pipeline-step-animate-3 { animation: step-fade-in 0.5s ease-out 0.8s both; }
        .pipeline-step-animate-4 { animation: step-fade-in 0.5s ease-out 1.1s both; }
        @keyframes step-fade-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .pipeline-step-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
        .pipeline-step-violet {
          background: rgba(139, 92, 246, 0.15);
          color: var(--accent-violet);
        }
        .pipeline-step-cyan {
          background: rgba(34, 211, 238, 0.12);
          color: var(--accent-cyan);
        }
        .pipeline-step-emerald {
          background: rgba(52, 211, 153, 0.12);
          color: var(--accent-emerald);
        }
        .pipeline-step-amber {
          background: rgba(251, 191, 36, 0.12);
          color: var(--accent-amber);
        }

        .pipeline-step-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pipeline-step-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .pipeline-step-desc {
          font-size: 0.72rem;
          color: var(--text-tertiary);
        }

        .pipeline-arrow {
          display: flex;
          justify-content: center;
          color: var(--text-tertiary);
          opacity: 0.4;
        }

        /* ── Feature Cards ── */
        .landing-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          max-width: 1200px;
          width: 100%;
        }
        .landing-feature-card {
          padding: 28px;
          text-align: left;
        }
        .landing-feature-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          margin-bottom: 16px;
        }
        .landing-feature-icon-violet {
          background: rgba(139, 92, 246, 0.12);
          color: var(--accent-violet);
        }
        .landing-feature-icon-cyan {
          background: rgba(34, 211, 238, 0.1);
          color: var(--accent-cyan);
        }
        .landing-feature-icon-emerald {
          background: rgba(52, 211, 153, 0.1);
          color: var(--accent-emerald);
        }
        .landing-feature-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .landing-feature-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* ── Footer ── */
        .landing-footer {
          position: relative;
          z-index: 10;
          border-top: 1px solid rgba(139, 92, 246, 0.06);
          padding: 32px 24px;
          text-align: center;
        }
        .landing-footer-line {
          font-size: 0.82rem;
          color: var(--text-tertiary);
          margin-bottom: 6px;
        }
        .landing-footer-author {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .landing-footer-accent {
          color: var(--accent-violet);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .landing-nav { padding: 16px 20px; }
          .landing-hero { padding: 24px 16px 48px; }
          .hero-split {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: center;
          }
          .hero-content {
            align-items: center;
          }
          .landing-hero-cta {
            justify-content: center;
          }
          .tech-pills {
            justify-content: center;
          }
          .landing-features { grid-template-columns: 1fr; }
          .pipeline-card { max-width: 360px; }
        }
      `}</style>
    </div>
  );
}
