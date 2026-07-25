export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#04071a] text-[#94a3b8] p-8 pt-24">
      <div className="max-w-4xl mx-auto py-12 space-y-8">
        <h1 className="text-4xl font-bold mb-8 text-white">Privacy Policy</h1>
        <p className="text-sm text-[#64748b]">Last updated: July 2026</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Information We Collect</h2>
          <p>When you use AgentForge, we collect information you provide directly: your name, email address, agent configurations, and knowledge base documents. We also collect usage data to improve the platform.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. How We Use Your Information</h2>
          <p>We use collected information to operate your AI agent infrastructure, process retrieval-augmented generation (RAG) queries against your knowledge bases, and communicate important service updates.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. Data Security</h2>
          <p>All sensitive credentials are encrypted using AES-256-GCM before storage. Knowledge base embeddings are stored using pgvector with cosine similarity indexing. Authentication tokens are transmitted via httpOnly secure cookies. All data is transmitted over HTTPS.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. BYOK (Bring Your Own Key)</h2>
          <p>AgentForge operates on a Bring Your Own Key architecture. Your API keys are encrypted at rest using AES-256-GCM and are never transmitted to any third party. Keys are decrypted only at the moment of use within our secure server environment.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Knowledge Base Data</h2>
          <p>Documents you upload to your knowledge bases are processed into vector embeddings for semantic search. The original documents and their embeddings are scoped exclusively to your account and are never shared with other users.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Data Retention & Deletion</h2>
          <p>You may delete your account at any time. Upon deletion, all associated data including agents, knowledge bases, embeddings, chat history, and encrypted credentials are permanently removed from our systems within 30 days.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">7. Contact</h2>
          <p>For privacy-related inquiries, please use the contact form on our portfolio site at <a href="https://devpulse-igt5.vercel.app" className="text-[#8b5cf6] hover:underline">devpulse-igt5.vercel.app</a>.</p>
        </section>
      </div>
    </div>
  );
}
