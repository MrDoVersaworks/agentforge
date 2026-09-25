import Link from 'next/link';

interface FooterProps {
  platformName: string;
  techStack: string;
  contactLink?: string;
  creatorName?: string;
}

export function UnifiedFooter({
  platformName,
  techStack,
  contactLink,
  creatorName = 'Oyewole Favour',
}: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-name">{platformName}</span>
          <span>Engineered with {techStack}.</span>
        </div>

        {contactLink ? (
          <Link href={contactLink} className="site-footer-contact">
            Contact
          </Link>
        ) : null}

        <div className="site-footer-meta">
          <span>Architected by {creatorName}</span>
          <span className="site-footer-divider" aria-hidden="true" />
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
