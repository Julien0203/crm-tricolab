'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getActivities, getSettings } from '@/lib/store';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  CalendarCheck,
  Zap,
  BarChart2,
  Calendar,
  Menu,
  X,
  PhoneCall,
  BookOpen,
  Settings,
  CheckSquare,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import GlobalSearch from '@/components/layout/GlobalSearch';
import { useTheme } from '@/app/context/ThemeContext';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/session', label: "Session d'appels", icon: PhoneCall },
  { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
  { href: '/activites', label: 'Activités', icon: CalendarCheck },
  { href: '/calendrier', label: 'Calendrier', icon: Calendar },
  { href: '/rapports', label: 'Rapports', icon: BarChart2 },
];

const tools = [
  { href: '/taches', label: 'Tâches', icon: CheckSquare },
  { href: '/scripts', label: 'Scripts', icon: BookOpen },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [userName, setUserName] = useState(DEFAULT_SETTINGS.userName);
  const [userTitle, setUserTitle] = useState(DEFAULT_SETTINGS.userTitle);

  useEffect(() => {
    setMobileOpen(false);
    async function loadSidebarData() {
      const now = new Date();
      const activities = await getActivities();
      setOverdueCount(activities.filter(a => !a.completed && new Date(a.date) < now).length);
      const s = await getSettings();
      setUserName(s.userName);
      setUserTitle(s.userTitle);
    }
    loadSidebarData();
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const activeLink = {
    background: 'var(--glass-bg-solid)',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border-med)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  };
  const inactiveLink = {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent',
    boxShadow: 'none',
    fontWeight: 400,
    letterSpacing: 'normal',
  };

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {mobileOpen ? <X size={17} /> : <Menu size={17} />}
      </button>

      {/* Overlay — mobile only */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`sidebar-nav${mobileOpen ? ' mobile-open' : ''}`}
        style={{
          width: 220,
          minHeight: '100vh',
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: isDark ? '1px 0 0 rgba(255,255,255,0.04)' : '1px 0 0 rgba(255,255,255,0.60)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Zap size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{userName} CRM</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userTitle}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px 0' }}>
          <GlobalSearch />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>
            Navigation
          </div>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="nav-link"
                data-active={String(active)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14,
                  ...(active ? activeLink : inactiveLink),
                }}
              >
                <Icon size={17} />
                <span style={{ flex: 1 }}>{label}</span>
                {href === '/activites' && overdueCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 5px', lineHeight: 1.5, minWidth: 16, textAlign: 'center' }}>
                    {overdueCount > 9 ? '9+' : overdueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Tools */}
        <nav style={{ padding: '0 12px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em', padding: '4px 8px 4px', textTransform: 'uppercase' }}>
            Outils
          </div>
          {tools.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="nav-link"
                data-active={String(active)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14,
                  ...(active ? activeLink : inactiveLink),
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: dark mode toggle + logout + copyright */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Thomas CRM © 2026</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={toggle}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--hover-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--hover-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
