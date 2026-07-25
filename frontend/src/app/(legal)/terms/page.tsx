export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#04071a] text-[#94a3b8] p-8 pt-24">
      <div className="max-w-4xl mx-auto py-12 space-y-8">
        <h1 className="text-4xl font-bold mb-8 text-white">Terms of Service</h1>
        <p className="text-sm text-[#64748b]">Last updated: July 2026</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>By accessing or using AgentForge, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Account Responsibilities</h2>
          <p>You are responsible for maintaining the security of your account credentials and API keys. You must not share your password or allow unauthorized access to your account.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. AI & Knowledge Base Usage</h2>
          <p>AgentForge provides AI agent creation and RAG capabilities as a portfolio demonstration. AI-generated responses are not guaranteed to be accurate and should not be relied upon for critical decisions without verification.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Intellectual Property</h2>
          <p>You retain all rights to data, documents, and content you upload to AgentForge. The AgentForge platform, its design, code, and branding are the intellectual property of the developer.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Limitation of Liability</h2>
          <p>AgentForge is provided &quot;as is&quot; without warranties of any kind. In no event shall the developer be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Contact</h2>
          <p>For questions about these terms, please use the contact form on our portfolio site at <a href="https://devpulse-igt5.vercel.app" className="text-[#8b5cf6] hover:underline">devpulse-igt5.vercel.app</a>.</p>
        </section>
      </div>
    </div>
  );
}
