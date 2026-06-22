import Script from 'next/script';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#04071a] text-[#94a3b8] p-8 pt-24">
      <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-4xl font-bold mb-8 text-[var(--admin-text)]">Terms of Service</h1>
              {/* @ts-expect-error Termly relies on a custom name attribute */}
      <div name="termly-embed" data-id="placeholder-terms" data-type="iframe"></div>
        <Script type="text/javascript" src="https://app.termly.io/embed-policy.min.js" strategy="lazyOnload" />
      </div>
    </div>
  );
}
