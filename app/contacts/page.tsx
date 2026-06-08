'use client';

import { useEffect, useRef, useState } from 'react';
import { getContacts, saveContact, saveContacts, updateContact, deleteContact, getDeals, getActivities } from '@/lib/store';
import {
  Contact, Deal, Activity,
  ProspectStatus, SiteStatus, BusinessSector,
  PROSPECT_STATUS_LABELS, PROSPECT_STATUS_COLORS,
  SITE_STATUS_LABELS, SECTOR_LABELS,
  ALL_SECTORS, ALL_SITE_STATUSES, ALL_PROSPECT_STATUSES,
  DEAL_STAGE_LABELS,
} from '@/lib/types';
import { buildTimeline, formatCurrency } from '@/lib/intelligence';
import {
  Plus, Search, Phone, Mail, Pencil, Trash2, X,
  Users, ChevronRight, TrendingUp, Clock, Check,
  MapPin, Globe, ChevronDown, ChevronUp, Upload,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Helpers CSV ────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ['prenom', 'first name', 'firstname', 'first_name', 'dirigeant', 'contact', 'interlocuteur', 'nom prenom', 'nom complet', 'nom/prenom'],
  lastName: ['nom', 'last name', 'lastname', 'last_name', 'nom de famille'],
  company: ['entreprise', 'societe', 'company', 'raison sociale', 'nom entreprise', 'enseigne', 'commerce', 'etablissement'],
  phone: ['telephone', 'tel', 'phone', 'mobile', 'portable', 'gsm', 'numero', 'num tel'],
  city: ['ville', 'city', 'commune', 'localite'],
  email: ['email', 'mail', 'e-mail', 'courriel', 'adresse email', 'adresse mail'],
};

function autoDetectMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = headers.findIndex(h => aliases.some(a => norm(h) === a || norm(h).includes(a)));
    mapping[field] = idx >= 0 ? idx : -1;
  }
  return mapping;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const semiCount = (text.match(/;/g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;
  const sep = semiCount > commaCount ? ';' : ',';
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(l => l.trim());
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === sep && !inQuote) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };
  return { headers: splitLine(lines[0]), rows: lines.slice(1).map(splitLine) };
}

function currentWeekBatch(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `S${week}-${now.getFullYear()}`;
}

// ─── Components ─────────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      background: `${color}22`, color, fontWeight: 700,
      fontSize: size * 0.36, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, border: `1px solid ${color}35`,
      letterSpacing: '-0.01em',
    }}>
      {initials}
    </div>
  );
}

function StatusPill({ status }: { status: ProspectStatus }) {
  const label = PROSPECT_STATUS_LABELS[status];
  const color = PROSPECT_STATUS_COLORS[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}35`,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function SitePill({ status }: { status: SiteStatus }) {
  const colors: Record<SiteStatus, string> = {
    aucun: '#ef4444', existant: '#10b981', vieux: '#f59e0b', inconnu: 'rgba(60,60,67,0.40)',
  };
  const color = colors[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 20,
      background: `${color}15`, color,
      fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Globe size={9} style={{ flexShrink: 0 }} />
      {SITE_STATUS_LABELS[status]}
    </span>
  );
}

type SortKey = 'name' | 'company' | 'status' | 'city' | 'batch';
type SortDir = 'asc' | 'desc';

type FormData = {
  firstName: string; lastName: string;
  company: string; sector: BusinessSector;
  city: string; email: string; phone: string;
  siteStatus: SiteStatus; prospectStatus: ProspectStatus;
  weekBatch: string; callNotes: string; notes: string;
};

const emptyForm: FormData = {
  firstName: '', lastName: '',
  company: '', sector: 'batiment',
  city: '', email: '', phone: '',
  siteStatus: 'inconnu', prospectStatus: 'a-appeler',
  weekBatch: '', callNotes: '', notes: '',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 7,
  border: '1px solid var(--input-border)',
  background: 'var(--glass-bg-medium)', color: 'var(--text-primary)',
  fontSize: 13, outline: 'none',
};

const COL_WIDTHS = { name: 190, company: 180, city: 110, phone: 130, site: 100, status: 130, batch: 80, actions: 60 };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('batch');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'script'>('info');
  const [scriptOpen, setScriptOpen] = useState<'r1' | 'r2' | null>('r1');

  // Inline status picker
  const [inlineStatusId, setInlineStatusId] = useState<string | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // CSV import
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, number>>({});
  const [csvBatch, setCsvBatch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setContacts(getContacts());
    setAllDeals(getDeals());
    setAllActivities(getActivities());
  };
  useEffect(() => { reload(); }, []);

  // Close inline status on outside click
  useEffect(() => {
    if (!inlineStatusId) return;
    const close = () => setInlineStatusId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [inlineStatusId]);

  // ── CSV handlers ──────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvMapping(autoDetectMapping(headers));
      setCsvBatch(currentWeekBatch());
      setShowCsvModal(true);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  function handleImport() {
    const get = (row: string[], field: string) => {
      const idx = csvMapping[field];
      return (idx !== undefined && idx >= 0 ? row[idx] ?? '' : '').trim();
    };

    const toImport = csvRows
      .filter(row => row.some(c => c.trim()))
      .map(row => {
        const firstNameRaw = get(row, 'firstName');
        const lastNameRaw = get(row, 'lastName');
        // If only first-name column detected, treat as full name
        let firstName = firstNameRaw;
        let lastName = lastNameRaw;
        if (firstNameRaw && !lastNameRaw && firstNameRaw.includes(' ')) {
          const parts = firstNameRaw.split(' ');
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }
        return {
          firstName: firstName || 'Inconnu',
          lastName,
          company: get(row, 'company'),
          phone: get(row, 'phone'),
          city: get(row, 'city'),
          email: get(row, 'email'),
          sector: 'autre' as BusinessSector,
          siteStatus: 'inconnu' as SiteStatus,
          prospectStatus: 'a-appeler' as ProspectStatus,
          weekBatch: csvBatch || undefined,
          callNotes: '',
          notes: '',
          source: 'appel_froid' as const,
        };
      })
      .filter(c => c.firstName !== 'Inconnu' || c.company);

    saveContacts(toImport);
    reload();
    setShowCsvModal(false);
  }

  // ── Sorting / filtering ───────────────────────────────────────────────────

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      const match = !q || `${c.firstName} ${c.lastName} ${c.company} ${c.city} ${c.phone}`.toLowerCase().includes(q);
      const status = filterStatus === 'all' || c.prospectStatus === filterStatus;
      return match && status;
    })
    .sort((a, b) => {
      let va = '', vb = '';
      if (sortKey === 'name') { va = `${a.firstName} ${a.lastName}`; vb = `${b.firstName} ${b.lastName}`; }
      if (sortKey === 'company') { va = a.company; vb = b.company; }
      if (sortKey === 'status') { va = a.prospectStatus; vb = b.prospectStatus; }
      if (sortKey === 'city') { va = a.city; vb = b.city; }
      if (sortKey === 'batch') { va = a.weekBatch || ''; vb = b.weekBatch || ''; }
      const cmp = va.localeCompare(vb, 'fr');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  // ── Contact CRUD ──────────────────────────────────────────────────────────

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(c: Contact, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(c);
    setForm({
      firstName: c.firstName, lastName: c.lastName,
      company: c.company, sector: c.sector,
      city: c.city, email: c.email, phone: c.phone,
      siteStatus: c.siteStatus, prospectStatus: c.prospectStatus,
      weekBatch: c.weekBatch || '', callNotes: c.callNotes, notes: c.notes,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.firstName.trim()) return;
    const data = {
      firstName: form.firstName, lastName: form.lastName,
      company: form.company, sector: form.sector,
      city: form.city, email: form.email, phone: form.phone,
      siteStatus: form.siteStatus, prospectStatus: form.prospectStatus,
      weekBatch: form.weekBatch || undefined,
      callNotes: form.callNotes, notes: form.notes,
    };
    if (editing) {
      updateContact(editing.id, data);
      if (selected?.id === editing.id) setSelected({ ...selected, ...data });
    } else {
      saveContact(data);
    }
    reload();
    setShowModal(false);
  }

  function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    deleteContact(id);
    reload();
    if (selected?.id === id) setSelected(null);
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={10} style={{ color: '#6366f1' }} /> : <ChevronDown size={10} style={{ color: '#6366f1' }} />;
  }

  function ColHeader({ label, k, style }: { label: string; k: SortKey; style?: React.CSSProperties }) {
    return (
      <th onClick={() => toggleSort(k)} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: sortKey === k ? '#6366f1' : 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '1px solid var(--border-light)', ...style }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {label} <SortIcon k={k} />
        </span>
      </th>
    );
  }

  // Inline status picker — click on pill → dropdown
  function StatusPicker({ contact }: { contact: Contact }) {
    const isOpen = inlineStatusId === contact.id;
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={e => { e.stopPropagation(); setInlineStatusId(isOpen ? null : contact.id); }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
        >
          <StatusPill status={contact.prospectStatus} />
          <ChevronDown size={10} style={{ color: 'var(--text-subtle)', marginTop: 1 }} />
        </button>
        {isOpen && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
              background: 'var(--glass-bg-solid)',
              backdropFilter: 'blur(20px) saturate(200%)',
              WebkitBackdropFilter: 'blur(20px) saturate(200%)',
              border: '1px solid var(--glass-border-med)',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
              padding: 4, minWidth: 168,
            }}
          >
            {ALL_PROSPECT_STATUSES.map(s => {
              const color = PROSPECT_STATUS_COLORS[s];
              const isCurrent = s === contact.prospectStatus;
              return (
                <button key={s} onClick={() => {
                  updateContact(contact.id, { prospectStatus: s });
                  if (selected?.id === contact.id) setSelected(prev => prev ? { ...prev, prospectStatus: s } : null);
                  setInlineStatusId(null);
                  reload();
                }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 7, border: 'none', background: isCurrent ? `${color}12` : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, flex: 1 }}>
                    {PROSPECT_STATUS_LABELS[s]}
                  </span>
                  {isCurrent && <Check size={10} style={{ color, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const statusCounts = ALL_PROSPECT_STATUSES.reduce((acc, s) => {
    acc[s] = contacts.filter(c => c.prospectStatus === s).length;
    return acc;
  }, {} as Record<ProspectStatus, number>);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-page" style={{ display: 'flex', gap: 0, height: 'calc(100vh - 64px)', minHeight: 0 }}>
      {/* Main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Prospects</h1>
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: 12 }}>
              {filtered.length} prospect{filtered.length !== 1 ? 's' : ''} · Semaine en cours
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border-med)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 500, fontSize: 13,
            }}>
              <Upload size={14} /> Importer CSV
            </button>
            <button onClick={openNew} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>
              <Plus size={15} /> Ajouter
            </button>
          </div>
        </div>

        {/* Search + status filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher prospect, ville..." style={{ ...inp, paddingLeft: 30, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterStatus('all')} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid', borderColor: filterStatus === 'all' ? '#6366f1' : 'var(--glass-border)', background: filterStatus === 'all' ? 'rgba(99,102,241,0.12)' : 'var(--glass-bg)', color: filterStatus === 'all' ? '#6366f1' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
              Tous ({contacts.length})
            </button>
            {ALL_PROSPECT_STATUSES.map(s => {
              const color = PROSPECT_STATUS_COLORS[s];
              const active = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid', borderColor: active ? color : 'var(--glass-border)', background: active ? `${color}18` : 'var(--glass-bg)', color: active ? color : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {PROSPECT_STATUS_LABELS[s]} ({statusCounts[s]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid var(--glass-border)', borderRadius: 12, minWidth: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--section-bg)' }}>
                <ColHeader label="Dirigeant" k="name" style={{ width: COL_WIDTHS.name }} />
                <ColHeader label="Entreprise" k="company" style={{ width: COL_WIDTHS.company }} />
                <ColHeader label="Ville" k="city" style={{ width: COL_WIDTHS.city }} />
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '1px solid var(--border-light)', width: COL_WIDTHS.phone }}>Téléphone</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '1px solid var(--border-light)', width: COL_WIDTHS.site }}>Site</th>
                <ColHeader label="Statut" k="status" style={{ width: COL_WIDTHS.status }} />
                <ColHeader label="Lot" k="batch" style={{ width: COL_WIDTHS.batch }} />
                <th style={{ padding: '8px 12px', width: COL_WIDTHS.actions }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => {
                const isSelected = selected?.id === contact.id;
                const contactDeals = allDeals.filter(d => d.contactId === contact.id);

                return (
                  <tr
                    key={contact.id}
                    onClick={() => setSelected(isSelected ? null : contact)}
                    style={{ borderBottom: '1px solid var(--border-light)', background: isSelected ? 'rgba(99,102,241,0.08)' : i % 2 === 0 ? 'transparent' : 'var(--row-alt-bg)', cursor: 'pointer', transition: 'background 0.1s' }}
                  >
                    {/* Dirigeant */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={`${contact.firstName} ${contact.lastName}`} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{contact.firstName} {contact.lastName}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{SECTOR_LABELS[contact.sector]}</div>
                        </div>
                      </div>
                    </td>

                    {/* Entreprise */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{contact.company}</div>
                      {contactDeals.length > 0 && (
                        <div style={{ fontSize: 10, color: '#6366f1', marginTop: 2 }}>{contactDeals.length} deal{contactDeals.length > 1 ? 's' : ''}</div>
                      )}
                    </td>

                    {/* Ville */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <MapPin size={11} style={{ flexShrink: 0 }} />
                        {contact.city || '—'}
                      </div>
                    </td>

                    {/* Téléphone */}
                    <td style={{ padding: '10px 12px' }}>
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
                          <Phone size={11} />{contact.phone}
                        </a>
                      ) : <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>}
                    </td>

                    {/* Site */}
                    <td style={{ padding: '10px 12px' }}>
                      <SitePill status={contact.siteStatus} />
                    </td>

                    {/* Statut — inline picker */}
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <StatusPicker contact={contact} />
                      {contact.callNotes && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.callNotes}
                        </div>
                      )}
                    </td>

                    {/* Lot semaine */}
                    <td style={{ padding: '10px 12px' }}>
                      {contact.weekBatch ? (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--hover-bg)', padding: '2px 6px', borderRadius: 4 }}>
                          {contact.weekBatch}
                        </span>
                      ) : <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button onClick={e => openEdit(contact, e)} style={{ padding: 5, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }} title="Modifier"><Pencil size={12} /></button>
                        <button onClick={e => handleDelete(contact.id, e)} style={{ padding: 5, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.50)' }} title="Supprimer"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>
              <Users size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>Aucun prospect trouvé</div>
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {selected && isMobile && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 50 }} />
      )}
      {selected && (
        <div
          className={isMobile ? undefined : 'side-panel'}
          style={isMobile ? {
            position: 'fixed', bottom: 0, left: 0, right: 0, height: '72vh',
            background: 'var(--glass-bg-solid)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: '1px solid var(--glass-border-med)', borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.25)', zIndex: 51,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          } : {
            width: 320, marginLeft: 16, background: 'var(--glass-bg-medium)',
            backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--glass-border-med)', boxShadow: 'var(--glass-shadow)',
            borderRadius: 14, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Mobile drag handle */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-subtle)' }} />
            </div>
          )}
          {/* Header */}
          <div style={{ padding: isMobile ? '12px 16px 12px' : '18px 16px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Avatar name={`${selected.firstName} ${selected.lastName}`} size={44} />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => openEdit(selected)} style={{ padding: 6, borderRadius: 6, background: 'rgba(99,102,241,0.10)', border: 'none', cursor: 'pointer', color: '#6366f1' }}><Pencil size={13} /></button>
                <button onClick={() => setSelected(null)} style={{ padding: 6, borderRadius: 6, background: 'var(--hover-bg)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13} /></button>
              </div>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1px', letterSpacing: '-0.02em' }}>{selected.firstName} {selected.lastName}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px' }}>{selected.company}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <StatusPill status={selected.prospectStatus} />
              <SitePill status={selected.siteStatus} />
              {selected.weekBatch && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--hover-bg)', padding: '3px 7px', borderRadius: 20 }}>{selected.weekBatch}</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
            {([['info', 'Fiche'], ['timeline', 'Timeline'], ['script', 'Script']] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '9px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? '#6366f1' : 'var(--text-muted)', borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {activeTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12 }}>
                      <Phone size={13} color="#6366f1" />{selected.phone}
                    </a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12 }}>
                      <Mail size={13} color="#6366f1" />{selected.email}
                    </a>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                    <MapPin size={13} color="#6366f1" />{selected.city || 'Ville non renseignée'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{ label: 'Secteur', value: SECTOR_LABELS[selected.sector] }, { label: 'Site existant', value: SITE_STATUS_LABELS[selected.siteStatus] }].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {selected.callNotes && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Notes appel</div>
                    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.callNotes}</div>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Notes</div>
                    <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.notes}</div>
                  </div>
                )}
                {(() => {
                  const deals = allDeals.filter(d => d.contactId === selected.id);
                  if (!deals.length) return null;
                  return (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Deals</div>
                      {deals.map(deal => (
                        <div key={deal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{deal.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{DEAL_STAGE_LABELS[deal.stage]}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: deal.stage === 'signe' ? '#10b981' : 'var(--text-primary)' }}>
                              {deal.stage === 'signe' ? `+${deal.commission}€` : `${deal.value}€`}
                            </div>
                            {deal.stage === 'signe' && <div style={{ fontSize: 9, color: '#10b981' }}>commission</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 4 }}>
                  Ajouté le {format(new Date(selected.createdAt), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>
            )}

            {activeTab === 'script' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  {
                    id: 'r1' as const,
                    label: 'Script R1 — 1er appel',
                    color: '#6366f1',
                    steps: [
                      { title: 'Accroche', text: `"Bonjour [Prénom], c'est Thomas de Tricolab. On aide les ${selected.sector === 'batiment' ? 'artisans du bâtiment' : selected.sector === 'restauration' ? 'restaurateurs' : selected.sector === 'commerce' ? 'commerçants' : 'professionnels'} à attirer plus de clients avec un site internet professionnel. Vous avez 2 minutes ?"` },
                      { title: 'Qualification', text: `"Vous avez actuellement un site internet ? Il est récent, il vous ramène des clients ?"` },
                      { title: 'Pitch', text: `"On propose un pack complet : création + 6 mois d'accompagnement pour 1 920€. On a déjà travaillé avec plusieurs ${selected.sector === 'batiment' ? 'artisans' : 'professionnels'} dans votre région."` },
                      { title: 'Closing R2', text: `"Je vous envoie quelques exemples de réalisations et je vous rappelle [jour] pour en discuter ?"` },
                    ],
                  },
                  {
                    id: 'r2' as const,
                    label: 'Script R2 — Relance / closing',
                    color: '#10b981',
                    steps: [
                      { title: 'Relance', text: `"Bonjour [Prénom], c'est Thomas de Tricolab — on s'était parlé [il y a X jours]. Vous avez eu le temps de regarder les exemples ?"` },
                      { title: 'Objection prix', text: `"Je comprends. Un seul nouveau client via le site couvre déjà l'investissement. Et avec l'accompagnement 6 mois, on est là pour que ça marche."` },
                      { title: 'Objection site existant', text: `"Est-ce qu'il vous ramène activement des clients en ce moment ? Un site qui convertit, c'est une vraie différence au quotidien."` },
                      { title: 'Closing', text: `"Si je vous montre un exemple sur votre secteur aujourd'hui, vous seriez prêt à prendre une décision cette semaine ?"` },
                    ],
                  },
                ] as { id: 'r1' | 'r2'; label: string; color: string; steps: { title: string; text: string }[] }[]).map(script => (
                  <div key={script.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      onClick={() => setScriptOpen(scriptOpen === script.id ? null : script.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: script.color }}>{script.label}</span>
                      <ChevronDown size={13} style={{ color: 'var(--text-subtle)', transform: scriptOpen === script.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {scriptOpen === script.id && (
                      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {script.steps.map((step, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: script.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{i + 1}. {step.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, background: 'var(--glass-bg-light)', borderRadius: 6, padding: '7px 9px', border: '1px solid var(--border-subtle)' }}>{step.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ fontSize: 10, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 4 }}>
                  Secteur détecté : {SECTOR_LABELS[selected.sector]}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (() => {
              const timeline = buildTimeline(selected, allDeals, allActivities);
              const ICONS: Record<string, React.ReactNode> = {
                user: <Users size={11} />, 'trending-up': <TrendingUp size={11} />,
                appel: <Phone size={11} />, email: <Mail size={11} />, rdv: <Clock size={11} />,
                tache: <Check size={11} />, note: <ChevronRight size={11} />,
              };
              if (!timeline.length) return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucun événement</p>;
              return (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 13, top: 0, bottom: 0, width: 1, background: 'var(--glass-border)' }} />
                  {timeline.map(event => (
                    <div key={event.id} style={{ display: 'flex', gap: 10, marginBottom: 14, position: 'relative' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${event.color}20`, border: `1px solid ${event.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: event.color, flexShrink: 0, zIndex: 1, opacity: event.completed === false ? 0.45 : 1 }}>
                        {ICONS[event.icon] || <ChevronRight size={11} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{event.title}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          {event.subtitle && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{event.subtitle}</span>}
                          <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>{formatDistanceToNow(new Date(event.date), { locale: fr, addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal — add/edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--glass-bg-solid)', backdropFilter: 'blur(40px)', border: '1px solid var(--glass-border-med)', boxShadow: 'var(--glass-shadow-lg)', borderRadius: 16, padding: 24, width: 500, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{editing ? 'Modifier le prospect' : 'Nouveau prospect'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--hover-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Prénom *</label><input style={inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jean" /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input style={inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Entreprise</label><input style={inp} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Entreprise SAS" /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ville</label><input style={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Lyon" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Téléphone direct</label><input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="06 XX XX XX XX" /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label><input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@entreprise.fr" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Secteur</label><select style={inp} value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value as BusinessSector }))}>{ALL_SECTORS.map(s => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Site existant</label><select style={inp} value={form.siteStatus} onChange={e => setForm(f => ({ ...f, siteStatus: e.target.value as SiteStatus }))}>{ALL_SITE_STATUSES.map(s => <option key={s} value={s}>{SITE_STATUS_LABELS[s]}</option>)}</select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Statut appel</label><select style={inp} value={form.prospectStatus} onChange={e => setForm(f => ({ ...f, prospectStatus: e.target.value as ProspectStatus }))}>{ALL_PROSPECT_STATUSES.map(s => <option key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Lot semaine</label><input style={inp} value={form.weekBatch} onChange={e => setForm(f => ({ ...f, weekBatch: e.target.value }))} placeholder="S23-2026" /></div>
            </div>
            <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes appel</label><textarea style={{ ...inp, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} value={form.callNotes} onChange={e => setForm(f => ({ ...f, callNotes: e.target.value }))} placeholder="Résumé de l'appel, objections..." /></div>
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes internes</label><textarea style={{ ...inp, resize: 'vertical', minHeight: 50, lineHeight: 1.5 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Autres infos..." /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={handleSave} style={{ padding: '8px 18px', borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{editing ? 'Sauvegarder' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — CSV import */}
      {showCsvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'var(--glass-bg-solid)', backdropFilter: 'blur(40px)', border: '1px solid var(--glass-border-med)', boxShadow: 'var(--glass-shadow-lg)', borderRadius: 16, padding: 24, width: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Importer des prospects CSV</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{csvRows.filter(r => r.some(c => c.trim())).length} lignes détectées · {csvHeaders.length} colonnes</p>
              </div>
              <button onClick={() => setShowCsvModal(false)} style={{ background: 'var(--hover-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}><X size={14} /></button>
            </div>

            {/* Column mapping */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Correspondance des colonnes</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { field: 'firstName', label: 'Prénom / Nom complet' },
                  { field: 'lastName', label: 'Nom (si séparé)' },
                  { field: 'company', label: 'Entreprise' },
                  { field: 'phone', label: 'Téléphone' },
                  { field: 'city', label: 'Ville' },
                  { field: 'email', label: 'Email' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
                    <select
                      value={csvMapping[field] ?? -1}
                      onChange={e => setCsvMapping(m => ({ ...m, [field]: Number(e.target.value) }))}
                      style={{ ...inp, padding: '6px 8px', fontSize: 12 }}
                    >
                      <option value={-1}>— Non importé</option>
                      {csvHeaders.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Lot semaine (optionnel)</label>
              <input style={{ ...inp, maxWidth: 200, padding: '7px 10px', fontSize: 12 }} value={csvBatch} onChange={e => setCsvBatch(e.target.value)} placeholder="S23-2026" />
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Aperçu (3 premières lignes)</div>
              <div style={{ background: 'var(--input-bg)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                {csvRows.slice(0, 3).map((row, i) => {
                  const preview = ['firstName', 'company', 'phone', 'city']
                    .map(f => { const idx = csvMapping[f]; return idx !== undefined && idx >= 0 ? row[idx] : null; })
                    .filter(Boolean);
                  return (
                    <div key={i} style={{ padding: '8px 12px', borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {preview.length > 0 ? preview.map((v, j) => <span key={j}>{v}</span>) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCsvModal(false)} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={handleImport} style={{ padding: '8px 18px', borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Importer {csvRows.filter(r => r.some(c => c.trim())).length} prospects →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
