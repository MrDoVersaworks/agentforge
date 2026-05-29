'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Initializing secure workspace...</p>
        <style jsx>{`
          .dashboard-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background-color: var(--bg-primary);
            color: var(--text-secondary);
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems = [
    {
      label: 'Agents Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      label: 'Global Settings',
      path: '/settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="dashboard-layout">
      {/* ── Mobile Header ── */}
      <header className="mobile-header hide-desktop">
        <div className="mobile-header-inner">
          <div className="brand-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>AgentForge</span>
          </div>
          <button className="btn-menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header hide-mobile">
          <div className="brand-logo">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="logo-text">AgentForge</span>
          </div>
        </div>

        {/* ── User Card ── */}
        <div className="user-profile-card">
          <div className="user-avatar">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          {!user?.hasGeminiKey && (
            <div className="key-warning-badge" onClick={() => router.push('/settings')}>
              <span className="pulse-warning-dot" />
              API Key Missing
            </div>
          )}
        </div>

        {/* ── Nav Links ── */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path));
            return (
              <button
                key={item.path}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  router.push(item.path);
                  setSidebarOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Sidebar Footer / Logout ── */}
        <div className="sidebar-footer">
          <button className="btn-theme-toggle" onClick={toggleTheme} id="theme-toggle-btn">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-icon-sun">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-icon-moon">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="btn-logout" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Shell ── */}
      <div className="dashboard-main">
        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <div className="dashboard-content">{children}</div>
      </div>

      <style jsx>{`
        .dashboard-layout {
          min-height: 100vh;
          display: flex;
          background-color: var(--bg-primary);
        }

        /* ── Sidebar ── */
        .dashboard-sidebar {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          width: var(--sidebar-width);
          background: var(--sidebar-bg, rgba(14, 14, 26, 0.7));
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: transform var(--transition-base);
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid var(--glass-border);
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border-radius: var(--radius-sm);
          color: white;
        }
        .logo-text {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── User Card ── */
        .user-profile-card {
          margin: 20px;
          padding: 16px;
          background: rgba(139, 92, 246, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--gradient-accent);
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .user-email {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .key-warning-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(251, 113, 133, 0.1);
          border: 1px solid rgba(251, 113, 133, 0.2);
          color: var(--accent-rose);
          font-size: 0.72rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .key-warning-badge:hover {
          background: rgba(251, 113, 133, 0.18);
        }
        .pulse-warning-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-rose);
          animation: pulse-warn 1.5s ease-in-out infinite;
        }
        @keyframes pulse-warn {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(1.3); }
        }

        /* ── Nav Links ── */
        .sidebar-nav {
          flex: 1;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-family: var(--font-family);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }
        .nav-btn:hover {
          color: var(--text-primary);
          background: rgba(139, 92, 246, 0.05);
        }
        .nav-btn.active {
          color: white;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }
        .nav-btn svg {
          opacity: 0.7;
          transition: opacity var(--transition-fast);
        }
        .nav-btn.active svg {
          color: var(--accent-violet);
          opacity: 1;
        }

        /* ── Footer ── */
        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid var(--glass-border);
        }
        .btn-theme-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-family: var(--font-family);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          margin-bottom: 6px;
          transition: all var(--transition-fast);
        }
        .btn-theme-toggle:hover {
          color: var(--text-primary);
          background: rgba(139, 92, 246, 0.05);
        }
        .theme-icon-sun {
          color: #f59e0b;
        }
        .theme-icon-moon {
          color: #6366f1;
        }
        .btn-logout {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          border-radius: var(--radius-md);
          font-family: var(--font-family);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }
        .btn-logout:hover {
          color: var(--accent-rose);
          background: rgba(251, 113, 133, 0.06);
        }

        /* ── Main Area ── */
        .dashboard-main {
          flex: 1;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .dashboard-content {
          flex: 1;
          padding: var(--space-xl);
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ── Mobile Elements ── */
        .mobile-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: var(--header-bg, rgba(9, 9, 15, 0.8));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--glass-border);
          z-index: 99;
          padding: 0 16px;
        }
        .mobile-header-inner {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mobile-header .brand-logo {
          font-weight: 800;
          font-size: 1rem;
        }
        .mobile-header .brand-logo svg {
          color: var(--accent-violet);
        }
        .btn-menu {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
        }

        @media (max-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(-100%);
            width: 280px;
            background: #0e0e1a;
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          .dashboard-main {
            margin-left: 0;
            padding-top: 64px;
          }
          .dashboard-content {
            padding: var(--space-md);
          }
          .sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(2px);
            z-index: 98;
          }
        }
      `}</style>
    </div>
  );
}
