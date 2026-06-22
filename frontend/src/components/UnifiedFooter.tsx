import Link from 'next/link';

interface FooterProps {
  platformName: string;
  techStack: string;
  contactLink?: string;
  creatorName?: string;
}

export function UnifiedFooter({ platformName, techStack, contactLink, creatorName = 'Oyewole Favour' }: FooterProps) {
  return (
    <footer style={{
      marginTop: 'auto',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '3rem 2rem',
      color: '#64748b',
      fontSize: '0.875rem',
      zIndex: 10,
      position: 'relative',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Contact CTA */}
        {contactLink && (
          <div style={{ marginBottom: '1rem' }}>
            <Link 
              href={contactLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '9999px',
                color: '#38bdf8',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              Initiate Contact Transmission
            </Link>
          </div>
        )}

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500, color: '#e2e8f0' }}>
            {platformName} — Engineered with {techStack}.
          </p>
          <p style={{ margin: '0 0 1rem 0' }}>
            Architected by <span style={{ color: '#38bdf8', fontWeight: 600 }}>{creatorName}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
          <Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
