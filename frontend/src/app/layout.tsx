import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';
import Script from 'next/script';
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[WARN] NEXT_PUBLIC_API_URL is not defined in the environment.');
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const metadata: Metadata = {
  title: 'AgentForge — AI Chatbot Builder with RAG',
  description: 'Build intelligent AI chatbots powered by your own documents. Upload knowledge bases, configure custom agents, and deploy RAG-powered conversational interfaces.',
  keywords: ['AI', 'chatbot', 'RAG', 'knowledge base', 'LLM', 'agent builder'],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  let settings: { termly_uuid?: string; google_analytics_id?: string } | null = null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/settings`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      settings = json.data;
    }
  } catch (e) {
    console.warn('Failed to fetch global settings for scripts');
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {settings?.termly_uuid && (
          <script
            type="text/javascript"
            src="https://app.termly.io/embed.min.js"
            data-auto-block="on"
            data-website-uuid={settings.termly_uuid}
          ></script>
        )}
        {settings?.google_analytics_id && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer ? window.dataLayer : [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${settings.google_analytics_id}');
              `}
            </Script>
          </>
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#09090f" />
        {/* Block flash of incorrect theme color immediately before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = localStorage.getItem('agentforge-theme') ? localStorage.getItem('agentforge-theme') : 'dark';
                document.documentElement.setAttribute('data-theme', storedTheme);
                if (storedTheme === 'dark') {
                  document.documentElement.style.backgroundColor = '#09090f';
                } else {
                  document.documentElement.style.backgroundColor = '#f8fafc';
                }
              } catch (e) {
                console.error(e);
              }
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
