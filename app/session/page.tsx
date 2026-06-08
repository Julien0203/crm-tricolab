'use client';

import { useEffect, useRef, useState } from 'react';
import { getContacts, updateContact, saveActivity } from '@/lib/store';
import {
  Contact, ProspectStatus,
  PROSPECT_STATUS_LABELS, PROSPECT_STATUS_COLORS, SITE_STATUS_LABELS,
} from '@/lib/types';
import { Phone, Check, RotateCcw, Timer, Square } from 'lucide-react';

function formatTimer(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

const PRIORITY_ORDER: ProspectStatus[] = ['chaud', 'r2-planifie', 'interesse', 'injoignable', 'a-appeler'];


const QUICK_ACTIONS: { status: ProspectStatus; label: string; color: string }[] = [
  { status: 'chaud',         label: 'Chaud',       color: '#f97316' },
  { status: 'interesse',     label: 'Intéressé',   color: '#10b981' },
  { status: 'r2-planifie',   label: 'R2 planifié', color: '#6366f1' },
  { status: 'injoignable',   label: 'Injoignable', color: '#f59e0b' },
  { status: 'non-interesse', label: 'Non intéressé', color: '#ef4444' },
];

const SITE_COLORS: Record<string, string> = {
  aucun: '#ef4444', existant: '#10b981', vieux: '#f59e0b', inconnu: 'var(--text-subtle)',
};

export default function SessionPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [batch, setBatch] = useState<string>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actioned, setActioned] = useState<Set<string>>(new Set());
  const [timers, setTimers] = useState<Record<string, number>>({}); // seconds elapsed
  const [activeTimer, setActiveTimer] = useState<string | null>(null); // contact id
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reload = async () => setContacts(await getContacts());
  useEffect(() => { reload(); }, []);

  // Tick active timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!activeTimer) return;
    timerRef.current = setInterval(() => {
      setTimers(prev => ({ ...prev, [activeTimer]: (prev[activeTimer] || 0) + 1 }));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTimer]);

  function startTimer(contactId: string) {
    setActiveTimer(contactId);
    setTimers(prev => ({ ...prev, [contactId]: prev[contactId] || 0 }));
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimer(null);
  }

  const batches = [...new Set(contacts.map(c => c.weekBatch).filter(Boolean) as string[])].sort().reverse();

  const sessionContacts = contacts
    .filter(c => (batch === 'all' || c.weekBatch === batch) && c.prospectStatus !== 'non-interesse')
    .sort((a, b) => {
      const pa = PRIORITY_ORDER.indexOf(a.prospectStatus);
      const pb = PRIORITY_ORDER.indexOf(b.prospectStatus);
      return pa !== pb ? pa - pb : a.company.localeCompare(b.company, 'fr');
    });

  const actionedCount = sessionContacts.filter(c => actioned.has(c.id)).length;
  const positifs = [...actioned].filter(id => {
    const c = contacts.find(x => x.id === id);
    return c && ['chaud', 'r2-planifie', 'interesse'].includes(c.prospectStatus);
  }).length;
  const negatifs = actionedCount - positifs;

  async function handleAction(contact: Contact, newStatus: ProspectStatus, e: React.MouseEvent) {
    e.stopPropagation();
    const note = notes[contact.id] || '';
    const duration = timers[contact.id] || 0;
    await updateContact(contact.id, { prospectStatus: newStatus, ...(note ? { callNotes: note } : {}) });
    await saveActivity({
      type: 'appel',
      contactId: contact.id,
      title: `${PROSPECT_STATUS_LABELS[newStatus]} — ${contact.firstName} ${contact.lastName}`,
      notes: note + (duration > 0 ? ` [${formatTimer(duration)}]` : ''),
      date: new Date().toISOString(),
      completed: true,
    });
    if (activeTimer === contact.id) stopTimer();
    setActioned(prev => new Set([...prev, contact.id]));
    await reload();
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '5px 8px', borderRadius: 6,
    border: '1px solid var(--glass-border)',
    background: 'var(--glass-bg)',
    color: 'var(--text-primary)', fontSize: 11, outline: 'none',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Session d&apos;appels
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '3px 0 0', fontSize: 12 }}>
            {actionedCount}/{sessionContacts.length} appelés
            {actionedCount > 0 && ` · ${positifs} positif${positifs > 1 ? 's' : ''} · ${negatifs} négatif${negatifs > 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={batch}
            onChange={e => setBatch(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--input-border)', background: 'var(--glass-bg-medium)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Tous les lots</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button
            onClick={() => setActioned(new Set())}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'var(--border-light)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {sessionContacts.length > 0 && (
        <div style={{ marginBottom: 16, background: 'var(--glass-bg-light)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{actionedCount} appelé{actionedCount > 1 ? 's' : ''}</span>
            <span>{sessionContacts.length - actionedCount} restant{sessionContacts.length - actionedCount > 1 ? 's' : ''}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${(actionedCount / sessionContacts.length) * 100}%`,
              background: 'linear-gradient(90deg, #10b981, #6366f1)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12, overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--section-bg)' }}>
              {[
                { label: 'Dirigeant', w: 200 },
                { label: 'Téléphone', w: 140 },
                { label: 'Site', w: 90 },
                { label: 'Statut', w: 115 },
                { label: 'Chrono', w: 90 },
                { label: 'Note rapide', w: undefined },
                { label: 'Résultat', w: 260 },
              ].map(({ label, w }) => (
                <th key={label} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: w }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessionContacts.map((contact, i) => {
              const isActioned = actioned.has(contact.id);
              const statusColor = PROSPECT_STATUS_COLORS[contact.prospectStatus];
              const siteColor = SITE_COLORS[contact.siteStatus];
              return (
                <tr
                  key={contact.id}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    background: isActioned ? 'rgba(16,185,129,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--row-alt-bg)',
                    opacity: isActioned ? 0.60 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Dirigeant */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: isActioned ? '50%' : 7, flexShrink: 0,
                        background: isActioned ? '#10b98120' : `${statusColor}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isActioned ? 12 : 14,
                      }}>
                        {isActioned ? <Check size={13} color="#10b981" /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'block' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contact.company}</div>
                      </div>
                    </div>
                  </td>

                  {/* Téléphone */}
                  <td style={{ padding: '10px 12px' }}>
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6366f1', textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>
                        <Phone size={11} /> {contact.phone}
                      </a>
                    ) : <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>}
                    {contact.city && <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 2 }}>{contact.city}</div>}
                  </td>

                  {/* Site */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${siteColor}15`, color: siteColor }}>
                      {SITE_STATUS_LABELS[contact.siteStatus]}
                    </span>
                  </td>

                  {/* Statut actuel */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                      background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35`, whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                      {PROSPECT_STATUS_LABELS[contact.prospectStatus]}
                    </span>
                    {contact.callNotes && (
                      <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 3, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.callNotes}
                      </div>
                    )}
                  </td>

                  {/* Chrono */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {activeTimer === contact.id ? (
                        <>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: '#6366f1', minWidth: 42 }}>
                            {formatTimer(timers[contact.id] || 0)}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); stopTimer(); }}
                            title="Arrêter"
                            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Square size={10} fill="currentColor" />
                          </button>
                        </>
                      ) : (
                        <>
                          {timers[contact.id] ? (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)', minWidth: 36 }}>
                              {formatTimer(timers[contact.id])}
                            </span>
                          ) : null}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (activeTimer && activeTimer !== contact.id) stopTimer();
                              startTimer(contact.id);
                            }}
                            title="Démarrer chrono"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)', color: '#6366f1', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Timer size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Note rapide */}
                  <td style={{ padding: '8px 12px' }}>
                    <input
                      type="text"
                      value={notes[contact.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [contact.id]: e.target.value }))}
                      onBlur={async e => {
                        const val = e.target.value.trim();
                        if (val && val !== contact.callNotes) {
                          await updateContact(contact.id, { callNotes: val });
                          await reload();
                        }
                      }}
                      placeholder={contact.callNotes ? contact.callNotes.slice(0, 30) + '…' : 'Résumé appel...'}
                      onClick={e => e.stopPropagation()}
                      style={inp}
                    />
                  </td>

                  {/* Résultat - action buttons */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {QUICK_ACTIONS.map(action => {
                        const isCurrent = contact.prospectStatus === action.status;
                        return (
                          <button
                            key={action.status}
                            onClick={e => handleAction(contact, action.status, e)}
                            title={PROSPECT_STATUS_LABELS[action.status]}
                            style={{
                              padding: '5px 8px', borderRadius: 6,
                              border: `1px solid ${action.color}${isCurrent ? '60' : '25'}`,
                              background: isCurrent ? `${action.color}20` : 'var(--glass-bg-light)',
                              color: action.color, cursor: 'pointer', fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                              whiteSpace: 'nowrap', transition: 'all 0.1s',
                            }}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sessionContacts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>
            <Phone size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>Tous les prospects ont été traités !</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Ajoutez un nouveau lot ou changez le filtre.</div>
          </div>
        )}
      </div>
    </div>
  );
}
