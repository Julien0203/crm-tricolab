'use client';

import { useEffect, useState } from 'react';
import { getActivities, getContacts, updateActivity } from '@/lib/store';
import { Activity, Contact } from '@/lib/types';
import { ChevronLeft, ChevronRight, Phone, Mail, Calendar, CheckCircle2, Check, Plus } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, addMonths, subMonths, getDay, isPast,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  appel:  { icon: <Phone size={10} />,        color: '#3b82f6', label: 'Appel' },
  email:  { icon: <Mail size={10} />,         color: '#6366f1', label: 'Email' },
  rdv:    { icon: <Calendar size={10} />,     color: '#f59e0b', label: 'RDV' },
  tache:  { icon: <CheckCircle2 size={10} />, color: '#8b5cf6', label: 'Tâche' },
  note:   { icon: <NoteIcon size={10} />,     color: 'var(--text-muted)', label: 'Note' },
};

function NoteIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" /><path d="M15 3v6h6" />
    </svg>
  );
}

export default function CalendrierPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const reload = async () => { setActivities(await getActivities()); setContacts(await getContacts()); };
  useEffect(() => { reload(); }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Offset for Monday start
  const startOffset = (getDay(monthStart) + 6) % 7;
  const paddedDays: (Date | null)[] = [...Array(startOffset).fill(null), ...days];
  while (paddedDays.length % 7 !== 0) paddedDays.push(null);

  function getActivitiesForDay(day: Date) {
    return activities.filter(a => isSameDay(new Date(a.date), day));
  }

  const selectedActivities = selectedDay ? getActivitiesForDay(selectedDay).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];

  const totalThisMonth = activities.filter(a => {
    const d = new Date(a.date);
    return d >= monthStart && d <= monthEnd;
  });
  const doneThisMonth = totalThisMonth.filter(a => a.completed).length;

  return (
    <div className="flex-page" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 64px)' }}>
      {/* Calendar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Calendrier</h1>
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: 13 }}>
              {doneThisMonth}/{totalThisMonth.length} activités ce mois
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setCurrentMonth(new Date())} style={{ padding: '7px 12px', borderRadius: 7, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
              Aujourd'hui
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={{ padding: '7px 9px', borderRadius: 7, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} style={{ padding: '7px 9px', borderRadius: 7, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <ChevronRight size={15} />
              </button>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', minWidth: 140 }}>
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </div>
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, flex: 1 }}>
          {paddedDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const dayActivities = getActivitiesForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isTodayDay = isToday(day);
            const isPastDay = isPast(day) && !isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.20)' : 'var(--glass-bg)',
                  backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: `1px solid ${isSelected ? 'rgba(99,102,241,0.40)' : isTodayDay ? 'rgba(99,102,241,0.55)' : 'var(--glass-border)'}`,
                  borderRadius: 8, padding: '8px 6px', cursor: 'pointer',
                  minHeight: 80, transition: 'all 0.1s',
                  opacity: isPastDay && dayActivities.length === 0 ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 13, fontWeight: isTodayDay ? 800 : 500,
                    color: isTodayDay ? '#fff' : isPastDay ? 'var(--text-subtle)' : 'var(--text-muted)',
                    background: isTodayDay ? '#6366f1' : 'transparent',
                    borderRadius: '50%', width: isTodayDay ? 22 : 'auto',
                    height: isTodayDay ? 22 : 'auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {format(day, 'd')}
                  </span>
                  {dayActivities.length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{dayActivities.length}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayActivities.slice(0, 3).map(a => {
                    const cfg = TYPE_CONFIG[a.type];
                    return (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: `${cfg.color}20`, borderRadius: 4, padding: '2px 4px',
                        opacity: a.completed ? 0.5 : 1,
                      }}>
                        <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </span>
                      </div>
                    );
                  })}
                  {dayActivities.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', paddingLeft: 4 }}>+{dayActivities.length - 3} autres</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel — selected day */}
      <div className="side-panel" style={{ width: 300, background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid var(--glass-border-med)', boxShadow: 'var(--glass-shadow)', borderRadius: 16, padding: '20px 18px', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {selectedDay ? format(selectedDay, 'EEEE d MMMM', { locale: fr }) : 'Sélectionner un jour'}
          </div>
          {selectedDay && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {selectedActivities.length} activité{selectedActivities.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {selectedDay && selectedActivities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Aucune activité<br />
            <Link href="/activites" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
              + Planifier une activité
            </Link>
          </div>
        )}

        {selectedActivities.map(activity => {
          const contact = contacts.find(c => c.id === activity.contactId);
          const cfg = TYPE_CONFIG[activity.type];
          return (
            <div key={activity.id} style={{
              background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 8, border: `1px solid ${activity.completed ? 'var(--border-subtle)' : cfg.color + '35'}`,
              opacity: activity.completed ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <button
                  onClick={async () => { await updateActivity(activity.id, { completed: !activity.completed }); await reload(); }}
                  style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                    border: `2px solid ${activity.completed ? '#34d399' : 'rgba(255,255,255,0.25)'}`,
                    background: activity.completed ? '#22c55e' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}
                >
                  {activity.completed && <Check size={10} strokeWidth={3} />}
                </button>
                <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{format(new Date(activity.date), 'HH:mm')}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: activity.completed ? 'var(--text-subtle)' : 'var(--text-primary)', textDecoration: activity.completed ? 'line-through' : 'none' }}>
                {activity.title}
              </div>
              {contact && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {contact.firstName} {contact.lastName} · {contact.company}
                </div>
              )}
              {activity.notes && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{activity.notes}</div>
              )}
            </div>
          );
        })}

        {/* This month summary */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Ce mois
          </div>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const count = totalThisMonth.filter(a => a.type === type).length;
            if (count === 0) return null;
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ color: cfg.color }}>{cfg.icon}</div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{cfg.label}s</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
