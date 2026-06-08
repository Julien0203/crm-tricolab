'use client';

import { useEffect, useState } from 'react';
import { getActivities, getContacts, getDeals, saveActivity, updateActivity, deleteActivity } from '@/lib/store';
import { Activity, ActivityType, Contact, Deal } from '@/lib/types';
import { Plus, Phone, Mail, Calendar, CheckCircle2, StickyNote, Trash2, X, Check, Clock, Pencil } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTIVITY_CONFIG: Record<ActivityType, { label: string; icon: React.ReactNode; color: string }> = {
  appel:  { label: 'Appel',    icon: <Phone size={14} />,        color: '#3b82f6' },
  email:  { label: 'Email',    icon: <Mail size={14} />,         color: '#6366f1' },
  rdv:    { label: 'RDV',      icon: <Calendar size={14} />,     color: '#f59e0b' },
  tache:  { label: 'Tâche',    icon: <CheckCircle2 size={14} />, color: '#8b5cf6' },
  note:   { label: 'Note',     icon: <StickyNote size={14} />,   color: 'var(--text-muted)' },
};

const ALL_TYPES: ActivityType[] = ['appel', 'email', 'rdv', 'tache', 'note'];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Aujourd\'hui';
  if (isTomorrow(d)) return 'Demain';
  if (isPast(d)) return `Passé · ${format(d, 'd MMM', { locale: fr })}`;
  return format(d, 'EEE d MMM', { locale: fr });
}

type FormData = { type: ActivityType; contactId: string; dealId: string; title: string; notes: string; date: string; completed: boolean };
const emptyForm: FormData = { type: 'appel', contactId: '', dealId: '', title: '', notes: '', date: new Date().toISOString().slice(0, 16), completed: false };

export default function ActivitesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filter, setFilter] = useState<'all' | 'todo' | 'done' | ActivityType>('all');

  const reload = async () => { setActivities(await getActivities()); setContacts(await getContacts()); setDeals(await getDeals()); };
  useEffect(() => { reload(); }, []);

  const filtered = activities.filter(a => {
    if (filter === 'todo') return !a.completed;
    if (filter === 'done') return a.completed;
    if (ALL_TYPES.includes(filter as ActivityType)) return a.type === filter;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(a: Activity) {
    setEditing(a);
    setForm({ type: a.type, contactId: a.contactId, dealId: a.dealId || '', title: a.title, notes: a.notes, date: a.date.slice(0, 16), completed: a.completed });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    const data = { ...form, date: new Date(form.date).toISOString(), dealId: form.dealId || undefined };
    if (editing) await updateActivity(editing.id, data);
    else await saveActivity(data);
    await reload(); setShowModal(false);
  }

  async function toggleDone(id: string, completed: boolean) {
    await updateActivity(id, { completed: !completed });
    await reload();
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(180%)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' };

  const todoCount = activities.filter(a => !a.completed).length;
  const doneCount = activities.filter(a => a.completed).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Activités</h1>
          <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: 13 }}>
            {todoCount} à faire · {doneCount} terminées
          </p>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Plus size={16} /> Nouvelle activité
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `Toutes (${activities.length})` },
          { key: 'todo', label: `À faire (${todoCount})` },
          { key: 'done', label: `Terminées (${doneCount})` },
          ...ALL_TYPES.map(t => ({ key: t, label: ACTIVITY_CONFIG[t].label })),
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key as typeof filter)} style={{
            padding: '7px 13px', borderRadius: 8, border: '1px solid',
            borderColor: filter === key ? '#6366f1' : 'var(--border-subtle)',
            background: filter === key ? 'rgba(99,102,241,0.13)' : 'transparent',
            color: filter === key ? '#818cf8' : '#64748b',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(activity => {
          const contact = contacts.find(c => c.id === activity.contactId);
          const deal = deals.find(d => d.id === activity.dealId);
          const cfg = ACTIVITY_CONFIG[activity.type];
          const isPastDue = !activity.completed && isPast(new Date(activity.date));

          return (
            <div key={activity.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: `1px solid ${isPastDue ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)'}`,
              boxShadow: isPastDue ? '0 0 0 1px rgba(239,68,68,0.1)' : 'none',
              borderRadius: 10, padding: '14px 16px',
              opacity: activity.completed ? 0.6 : 1,
              transition: 'all 0.15s',
            }}>
              {/* Checkbox */}
              <button onClick={() => toggleDone(activity.id, activity.completed)} style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                border: `2px solid ${activity.completed ? '#34d399' : 'rgba(255,255,255,0.25)'}`,
                background: activity.completed ? '#22c55e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
                {activity.completed && <Check size={12} strokeWidth={3} />}
              </button>

              {/* Type icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 8, background: `${cfg.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: cfg.color, flexShrink: 0,
              }}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: activity.completed ? 'var(--text-subtle)' : 'var(--text-primary)', textDecoration: activity.completed ? 'line-through' : 'none' }}>
                  {activity.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  {contact && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contact.firstName} {contact.lastName}</span>}
                  {contact && deal && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>}
                  {deal && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.title}</span>}
                  {activity.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {activity.notes.slice(0, 60)}{activity.notes.length > 60 ? '…' : ''}</span>}
                </div>
              </div>

              {/* Date */}
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: isPastDue ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isPastDue && <Clock size={11} />}
                  {formatDateLabel(activity.date)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{format(new Date(activity.date), 'HH:mm')}</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => openEdit(activity)} style={{ padding: 6, borderRadius: 6, background: 'var(--hover-bg)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={13} /></button>
                <button onClick={async () => { await deleteActivity(activity.id); await reload(); }} style={{ padding: 6, borderRadius: 6, background: 'var(--hover-bg)', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Calendar size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            Aucune activité
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--glass-bg-solid)', backdropFilter: 'blur(60px) saturate(200%) brightness(110%)', WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(110%)', border: '1px solid var(--glass-border-med)', boxShadow: 'var(--glass-shadow-lg)', borderRadius: 18, padding: '28px', width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{editing ? 'Modifier' : 'Nouvelle activité'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--hover-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}><X size={15} /></button>
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ALL_TYPES.map(type => {
                  const cfg = ACTIVITY_CONFIG[type];
                  return (
                    <button key={type} onClick={() => setForm(f => ({ ...f, type }))} style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid',
                      borderColor: form.type === type ? cfg.color : 'var(--border-subtle)',
                      background: form.type === type ? `${cfg.color}20` : 'transparent',
                      color: form.type === type ? cfg.color : '#64748b',
                      cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Titre *</label>
              <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Appel de suivi" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Contact</label>
                <select style={{ ...inp }} value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Deal (optionnel)</label>
                <select style={{ ...inp }} value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Date & heure</label>
              <input style={inp} type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {editing ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

