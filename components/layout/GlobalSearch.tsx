'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getContacts, getDeals, getActivities } from '@/lib/store';
import { Contact, Deal, Activity } from '@/lib/types';
import { Search, Users, TrendingUp, Calendar, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Result =
  | { kind: 'contact'; item: Contact }
  | { kind: 'deal'; item: Deal; contactName: string }
  | { kind: 'activity'; item: Activity; contactName: string };

const STAGE_LABELS: Record<string, string> = {
  r1: 'R1', r2: 'R2', 'devis-envoye': 'Devis envoyé', signe: 'Signé', perdu: 'Perdu',
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const [contacts, deals, activities] = await Promise.all([getContacts(), getDeals(), getActivities()]);

    const res: Result[] = [];

    contacts.filter(c =>
      `${c.firstName} ${c.lastName} ${c.company} ${c.email}`.toLowerCase().includes(lower)
    ).slice(0, 4).forEach(c => res.push({ kind: 'contact', item: c }));

    deals.filter(d =>
      `${d.title} ${d.notes}`.toLowerCase().includes(lower)
    ).slice(0, 4).forEach(d => {
      const c = contacts.find(c => c.id === d.contactId);
      res.push({ kind: 'deal', item: d, contactName: c ? `${c.firstName} ${c.lastName}` : '' });
    });

    activities.filter(a =>
      `${a.title} ${a.notes}`.toLowerCase().includes(lower)
    ).slice(0, 3).forEach(a => {
      const c = contacts.find(c => c.id === a.contactId);
      res.push({ kind: 'activity', item: a, contactName: c ? `${c.firstName} ${c.lastName}` : '' });
    });

    setResults(res);
    setCursor(0);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  function navigate(r: Result) {
    setOpen(false);
    if (r.kind === 'contact') router.push('/contacts');
    else if (r.kind === 'deal') router.push('/pipeline');
    else router.push('/activites');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && results[cursor]) navigate(results[cursor]);
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      {/* Trigger button in sidebar */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(0,0,0,0.04)',
          color: 'rgba(60,60,67,0.50)', cursor: 'pointer', fontSize: 13,
          marginBottom: 8,
        }}
      >
        <Search size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>Rechercher…</span>
        <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.06)', padding: '2px 5px', borderRadius: 4, color: 'rgba(60,60,67,0.40)' }}>⌘K</span>
      </button>

      {/* Modal — rendered via portal to escape backdrop-filter stacking context */}
      {open && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.22)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 'clamp(16px, 10vh, 100px)',
            paddingLeft: 12, paddingRight: 12,
            zIndex: 1000,
          }}
        >
          <div style={{
            width: '100%', maxWidth: 560,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <Search size={18} color="rgba(60,60,67,0.45)" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Rechercher un contact, deal, activité…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#1d1d1f', fontSize: 16,
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(60,60,67,0.40)', padding: 2 }}>
                  <X size={15} />
                </button>
              )}
              <kbd style={{ fontSize: 11, color: 'rgba(60,60,67,0.40)', background: 'rgba(0,0,0,0.06)', padding: '3px 7px', borderRadius: 5 }}>Esc</kbd>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {(['contact', 'deal', 'activity'] as const).map(kind => {
                  const group = results.filter(r => r.kind === kind);
                  if (group.length === 0) return null;
                  const labels = { contact: 'Contacts', deal: 'Deals', activity: 'Activités' };
                  const icons = {
                    contact: <Users size={13} />,
                    deal: <TrendingUp size={13} />,
                    activity: <Calendar size={13} />,
                  };
                  return (
                    <div key={kind}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(60,60,67,0.40)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px 4px' }}>
                        {labels[kind]}
                      </div>
                      {group.map((r) => {
                        const globalIdx = results.indexOf(r);
                        const active = globalIdx === cursor;
                        return (
                          <div
                            key={r.kind === 'contact' ? r.item.id : r.kind === 'deal' ? r.item.id : r.item.id}
                            onClick={() => navigate(r)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 20px', cursor: 'pointer',
                              background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
                              transition: 'background 0.1s',
                            }}
                          >
                            <div style={{ color: active ? '#6366f1' : 'rgba(60,60,67,0.40)', flexShrink: 0 }}>{icons[kind]}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {r.kind === 'contact' && (
                                <>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{r.item.firstName} {r.item.lastName}</div>
                                  <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.50)' }}>{r.item.company}</div>
                                </>
                              )}
                              {r.kind === 'deal' && (
                                <>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{r.item.title}</div>
                                  <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.50)' }}>{r.contactName} · {STAGE_LABELS[r.item.stage]}</div>
                                </>
                              )}
                              {r.kind === 'activity' && (
                                <>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{r.item.title}</div>
                                  <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.50)' }}>{r.contactName} · {format(new Date(r.item.date), 'd MMM', { locale: fr })}</div>
                                </>
                              )}
                            </div>
                            {r.kind === 'deal' && (
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(60,60,67,0.70)', flexShrink: 0 }}>{formatCurrency(r.item.value)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : query ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(60,60,67,0.45)', fontSize: 14 }}>
                Aucun résultat pour « {query} »
              </div>
            ) : (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Raccourcis</div>
                {[
                  { key: '↑↓', label: 'Naviguer' },
                  { key: '↵', label: 'Ouvrir' },
                  { key: 'Esc', label: 'Fermer' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <kbd style={{ fontSize: 11, color: 'rgba(60,60,67,0.50)', background: 'rgba(0,0,0,0.06)', padding: '2px 7px', borderRadius: 4 }}>{key}</kbd>
                    <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.50)' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
