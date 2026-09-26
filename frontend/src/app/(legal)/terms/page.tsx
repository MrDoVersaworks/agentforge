import Link from 'next/link';

const sections = [
  ['1', 'Using AgentForge', 'AgentForge provides tools for creating and operating AI agents, including agent instructions, knowledge documents, and conversations. You may use the service only in accordance with these Terms and applicable law.'],
  ['2', 'Your account', 'You are responsible for keeping your account credentials secure and for activity performed through your account. Provide accurate account information and do not share access in a way that would undermine account security.'],
  ['3', 'Your content', 'You retain responsibility for the prompts, instructions, documents, credentials, and other content you submit. You must have the rights and permissions needed to submit and use that content.'],
  ['4', 'AI output', 'AI-generated output can be incomplete, inaccurate, or unsuitable for a particular purpose. Review output before relying on it, especially where an error could cause financial, legal, safety, or other material consequences.'],
  ['5', 'Acceptable use', 'Do not use AgentForge to bypass access controls, access another person’s account or data, interfere with the service, introduce malicious code, abuse authentication or rate limits, or facilitate unlawful activity.'],
  ['6', 'Third-party services and credentials', 'Some AgentForge features may use third-party services or credentials that you configure. You are responsible for having the right to use those services and for complying with their applicable terms.'],
  ['7', 'Service changes and availability', 'AgentForge may add, modify, suspend, or discontinue features as the service evolves. We may also restrict access where reasonably necessary to protect users, the service, or security.'],
  ['8', 'Account deletion', 'You can request deletion through the account controls provided in the application. Deletion is subject to the application’s data relationships and any information that must be retained for legitimate legal or security reasons.'],
  ['9', 'Disclaimer', 'AgentForge is provided as a software service. To the extent permitted by applicable law, the service and AI output are provided without a guarantee that they will always be uninterrupted, error-free, or suitable for every purpose.'],
  ['10', 'Changes to these Terms', 'When these Terms materially change, the published version and its update date will be changed accordingly. Your continued use of AgentForge after a change takes effect constitutes acceptance where permitted by law.'],
  ['11', 'Contact', 'Questions about these Terms should be sent through the contact or support channel made available by AgentForge.']
] as const;

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <div className="legal-topbar">
            <Link href="/" className="legal-brand">AgentForge</Link>
            <nav aria-label="Legal navigation" className="legal-nav">
              <Link href="/terms" aria-current="page">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/register" className="legal-cta">Start Building</Link>
            </nav>
          </div>
          <div className="legal-heading">
            <span className="legal-eyebrow">Legal</span>
            <h1>Terms of Service</h1>
            <p>These Terms explain the basic rules for using AgentForge and the responsibilities that come with creating and operating AI agents.</p>
            <div className="legal-meta"><span>Effective September 26, 2026</span><span>Version 1.0</span></div>
          </div>
        </header>

        <div className="legal-layout">
          <article className="legal-document">
            <div className="legal-intro">
              <strong>Please read these Terms before using AgentForge.</strong>
              <span>By creating an account or using the service, you agree to these Terms to the extent permitted by applicable law.</span>
            </div>
            {sections.map(([number, title, body]) => (
              <section id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} key={number} className="legal-section">
                <div className="section-number">{number}</div>
                <div><h2>{title}</h2><p>{body}</p></div>
              </section>
            ))}
          </article>
          <aside className="legal-sidebar">
            <div className="legal-sidebar-card">
              <span>On this page</span>
              <nav>
                {sections.map(([number, title]) => <a key={number} href={'#' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>{number}. {title}</a>)}
              </nav>
            </div>
          </aside>
        </div>
      </div>
      <style jsx>{`
        .legal-page{min-height:100vh;background:var(--background);color:var(--text-primary)}
        .legal-shell{max-width:1120px;margin:0 auto;padding:28px 24px 80px}
        .legal-header{border-bottom:1px solid var(--border-color);padding-bottom:44px}
        .legal-topbar{display:flex;align-items:center;justify-content:space-between;gap:20px}
        .legal-brand{font-weight:800;letter-spacing:-.02em;color:var(--text-primary);text-decoration:none}
        .legal-nav{display:flex;align-items:center;gap:6px}
        .legal-nav a{padding:8px 11px;border-radius:8px;color:var(--text-secondary);font-size:.85rem;text-decoration:none}
        .legal-nav a:hover,.legal-nav a[aria-current="page"]{color:var(--text-primary);background:var(--surface)}
        .legal-nav .legal-cta{background:var(--text-primary);color:var(--background);font-weight:700;margin-left:6px}
        .legal-heading{max-width:760px;padding-top:72px}
        .legal-eyebrow{font-size:.72rem;text-transform:uppercase;letter-spacing:.16em;color:var(--text-secondary);font-weight:700}
        h1{font-size:clamp(2.3rem,6vw,4.4rem);line-height:1.02;letter-spacing:-.055em;margin:12px 0 20px}
        .legal-heading p{max-width:680px;color:var(--text-secondary);font-size:1.05rem;line-height:1.75;margin:0}
        .legal-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;color:var(--text-secondary);font-size:.78rem}
        .legal-meta span{border:1px solid var(--border-color);border-radius:999px;padding:7px 11px;background:var(--surface)}
        .legal-layout{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:48px;padding-top:44px}
        .legal-document{max-width:760px}
        .legal-intro{display:grid;gap:8px;padding:20px 22px;border:1px solid var(--border-color);border-radius:14px;background:var(--surface);line-height:1.7;color:var(--text-secondary)}
        .legal-intro strong{color:var(--text-primary)}
        .legal-section{display:grid;grid-template-columns:38px 1fr;gap:18px;padding:38px 0;border-bottom:1px solid var(--border-color);scroll-margin-top:24px}
        .section-number{font-size:.76rem;color:var(--text-secondary);padding-top:5px}
        h2{font-size:1.18rem;letter-spacing:-.02em;margin:0 0 10px}
        .legal-section p{color:var(--text-secondary);line-height:1.8;margin:0}
        .legal-sidebar-card{position:sticky;top:24px;border:1px solid var(--border-color);border-radius:14px;background:var(--surface);padding:18px}
        .legal-sidebar-card>span{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.13em;font-weight:700;color:var(--text-secondary);margin-bottom:12px}
        .legal-sidebar-card nav{display:grid;gap:2px;max-height:65vh;overflow:auto}
        .legal-sidebar-card a{padding:7px 8px;color:var(--text-secondary);font-size:.78rem;line-height:1.4;text-decoration:none;border-radius:7px}
        .legal-sidebar-card a:hover{color:var(--text-primary);background:var(--background)}
        @media(max-width:800px){.legal-layout{grid-template-columns:1fr}.legal-sidebar{display:none}.legal-shell{padding-inline:18px}.legal-heading{padding-top:54px}.legal-nav a:not(.legal-cta){display:none}}
        @media(max-width:480px){.legal-nav .legal-cta{margin-left:0}.legal-header{padding-bottom:32px}.legal-section{grid-template-columns:28px 1fr;gap:12px}.legal-shell{padding-top:18px}}
      `}</style>
    </main>
  );
}
