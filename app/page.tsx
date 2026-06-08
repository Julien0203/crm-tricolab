'use client';

import { useEffect, useState } from 'react';
import { getContacts, getDeals, getActivities, getSettings } from '@/lib/store';
import { Contact, Deal, Activity, PROSPECT_STATUS_COLORS, DEFAULT_SETTINGS, CRMSettings } from '@/lib/types';
import { generateSmartAlerts, SmartAlert, getWeeklyStats } from '@/lib/intelligence';
import {
  Euro, TrendingUp, Target, Phone,
  Mail, Calendar, CheckCircle2, Clock, ArrowUpRight,
  AlertTriangle, AlertCircle, Info, CheckCircle, X, Users,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { format, startOfWeek, endOfWeek, differenceInDays, differenceInWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

const STAGE_COLORS: Record<string, string> = {
  r1: 'var(--text-muted)',
  r2: '#3b82f6',
  'devis-envoye': '#f59e0b',
  signe: '#10b981',
  perdu: '#ef4444',
};

const STAGE_LABELS: Record<string, string> = {
  r1: 'R1',
  r2: 'R2',
  'devis-envoye': 'Devis',
  signe: 'Signé',
  perdu: 'Perdu',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  appel: <Phone size={14} />,
  email: <Mail size={14} />,
  rdv: <Calendar size={14} />,
  tache: <CheckCircle2 size={14} />,
  note: <Clock size={14} />,
};

const glass: React.CSSProperties = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
};

function KPICard({ label, value, sub, icon, color, progress }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string; progress?: number;
}) {
  return (
    <div style={{ ...glass, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}22`, boxShadow: `0 0 16px ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, letterSpacing: '0.01em' }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.025em' }}>{value}</div>
        </div>
      </div>
      {progress !== undefined && (
        <div>
          <div style={{ height: 5, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: progress >= 100 ? '#10b981' : color, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>{sub}</div>}
    </div>
  );
}

const ALERT_CONFIG: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  danger:  { icon: <AlertCircle size={14} />,  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  text: '#f87171' },
  warning: { icon: <AlertTriangle size={14} />, bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
  info:    { icon: <Info size={14} />,          bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)', text: '#818cf8' },
  success: { icon: <CheckCircle size={14} />,   bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', text: '#34d399' },
};

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<CRMSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const s = getSettings();
    const c = getContacts();
    const d = getDeals();
    const a = getActivities();
    setSettings(s);
    setContacts(c);
    setDeals(d);
    setActivities(a);
    setAlerts(generateSmartAlerts(c, d, a, s.weeklyTargetCommission));
  }, []);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const signedDeals = deals.filter(d => d.stage === 'signe');
  const signedThisWeek = signedDeals.filter(d => {
    const date = new Date(d.updatedAt);
    return date >= weekStart && date <= weekEnd;
  });

  const commissionThisWeek = signedThisWeek.reduce((s, d) => s + d.commission, 0);
  const totalCommission = signedDeals.reduce((s, d) => s + d.commission, 0);
  const activeDeals = deals.filter(d => d.stage !== 'signe' && d.stage !== 'perdu');
  const hotProspects = contacts.filter(c => c.prospectStatus === 'interesse' || c.prospectStatus === 'chaud' || c.prospectStatus === 'r2-planifie');

  const weeklyProgress = settings.weeklyTargetDeals > 0 ? (signedThisWeek.length / settings.weeklyTargetDeals) * 100 : 0;
  const commissionProgress = settings.weeklyTargetCommission > 0 ? (commissionThisWeek / settings.weeklyTargetCommission) * 100 : 0;

  // Contract countdown
  const contractStart = new Date(settings.contractStart);
  const contractEnd = new Date(settings.contractEnd);
  const totalContractDays = differenceInDays(contractEnd, contractStart);
  const daysElapsed = Math.max(0, Math.min(totalContractDays, differenceInDays(now, contractStart)));
  const daysRemaining = Math.max(0, differenceInDays(contractEnd, now));
  const weeksRemaining = Math.max(0, differenceInWeeks(contractEnd, now));
  const contractProgress = Math.min(100, Math.round((totalCommission / settings.contractTarget) * 100));
  const commissionLeft = Math.max(0, settings.contractTarget - totalCommission);
  const commissionPerWeekNeeded = weeksRemaining > 0 ? Math.round(commissionLeft / weeksRemaining) : commissionLeft;

  const weeklyStats = getWeeklyStats(deals, 8);

  const upcomingActivities = activities
    .filter(a => !a.completed && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Status breakdown chart
  const statusData = [
    { name: 'À appeler', value: contacts.filter(c => c.prospectStatus === 'a-appeler').length, color: 'var(--text-subtle)' },
    { name: 'Intéressé', value: contacts.filter(c => c.prospectStatus === 'interesse').length, color: '#10b981' },
    { name: 'R2 planifié', value: contacts.filter(c => c.prospectStatus === 'r2-planifie').length, color: '#6366f1' },
    { name: 'Chaud', value: contacts.filter(c => c.prospectStatus === 'chaud').length, color: '#f97316' },
    { name: 'Injoignable', value: contacts.filter(c => c.prospectStatus === 'injoignable').length, color: '#f59e0b' },
    { name: 'Non intéressé', value: contacts.filter(c => c.prospectStatus === 'non-interesse').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em' }}>Bonjour {settings.userName}</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
          {format(now, "EEEE d MMMM yyyy", { locale: fr })} · Objectif semaine : {settings.weeklyTargetDeals} vente{settings.weeklyTargetDeals > 1 ? 's' : ''} = {settings.weeklyTargetCommission}€
        </p>
      </div>

      {/* KPI cards — commission focused */}
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        <KPICard
          label="Commission cette semaine"
          value={`${commissionThisWeek}€`}
          sub={`${signedThisWeek.length}/${settings.weeklyTargetDeals} ventes · objectif ${settings.weeklyTargetCommission}€`}
          icon={<Euro size={20} />}
          color="#10b981"
          progress={commissionProgress}
        />
        <KPICard
          label="Commission totale"
          value={`${totalCommission}€`}
          sub={`${signedDeals.length} deals signés`}
          icon={<TrendingUp size={20} />}
          color="#6366f1"
        />
        <KPICard
          label="Prospects chauds"
          value={hotProspects.length.toString()}
          sub={`${contacts.length} prospects total · ${activeDeals.length} deals en cours`}
          icon={<Users size={20} />}
          color="#f97316"
        />
        <KPICard
          label="Devis en attente"
          value={deals.filter(d => d.stage === 'devis-envoye').length.toString()}
          sub={`R1: ${deals.filter(d => d.stage === 'r1').length} · R2: ${deals.filter(d => d.stage === 'r2').length}`}
          icon={<Target size={20} />}
          color="#f59e0b"
        />
      </div>

      {/* Charts row — pie + pipeline */}
      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20 }}>
        {/* Prospect statuses — donut */}
        <div style={{ ...glass, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>Statuts prospects</div>
          {statusData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucun prospect</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={42} outerRadius={66} dataKey="value" paddingAngle={2} stroke="none">
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--glass-bg-solid)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v: number, name: string) => [v, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                {statusData.map(({ name, value, color }) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pipeline funnel */}
        <div style={{ ...glass, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.01em' }}>Pipeline Tricolab</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['r1', 'r2', 'devis-envoye', 'signe'] as const).map(stage => {
              const count = deals.filter(d => d.stage === stage).length;
              const commission = deals.filter(d => d.stage === stage).reduce((s, d) => s + d.commission, 0);
              const maxCount = Math.max(...(['r1', 'r2', 'devis-envoye', 'signe'] as const).map(s => deals.filter(d => d.stage === s).length), 1);
              const width = Math.max(8, (count / maxCount) * 100);
              return (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{STAGE_LABELS[stage]}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} deal{count !== 1 ? 's' : ''}{commission > 0 ? ` · ${commission}€` : ''}</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--hover-bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${width}%`, background: STAGE_COLORS[stage], borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contract countdown */}
      <div style={{ ...glass, borderRadius: 16, padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: contractProgress >= 100 ? '#10b98120' : '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center', color: contractProgress >= 100 ? '#10b981' : '#ef4444', flexShrink: 0 }}>
            <Target size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Contrat Tricolab
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {daysRemaining > 0 ? `${weeksRemaining}S restantes (${daysRemaining}j)` : 'Contrat terminé'}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: contractProgress >= 100 ? '#10b981' : 'var(--text-primary)' }}>
                {totalCommission}€ <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>/ {settings.contractTarget}€</span>
              </div>
            </div>
            <div style={{ height: 7, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${contractProgress}%`, background: contractProgress >= 100 ? '#10b981' : '#ef4444', borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
              <span>Début {format(contractStart, 'd MMM', { locale: fr })}</span>
              <span style={{ color: commissionPerWeekNeeded > settings.weeklyTargetCommission ? '#f59e0b' : 'var(--text-muted)' }}>
                {contractProgress < 100 ? `${commissionPerWeekNeeded}€/semaine nécessaires` : `Objectif atteint !`}
              </span>
              <span>Fin {format(contractEnd, 'd MMM', { locale: fr })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Alerts */}
      {alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Alertes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {alerts.filter(a => !dismissedAlerts.has(a.id)).map(alert => {
              const cfg = ALERT_CONFIG[alert.level];
              return (
                <div key={alert.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                }}>
                  <div style={{ color: cfg.text, flexShrink: 0 }}>{cfg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: cfg.text }}>{alert.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 7 }}>{alert.description}</span>
                  </div>
                  {alert.action && (
                    <Link href={alert.dealId ? '/pipeline' : alert.contactId ? '/contacts' : '/rapports'} style={{ fontSize: 11, color: cfg.text, textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {alert.action} →
                    </Link>
                  )}
                  <button onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: 2, flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commission trend */}
      {weeklyStats.length > 0 && (
        <div style={{ ...glass, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.01em' }}>Tendance commissions — 8 semaines</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={weeklyStats} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-bg)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--glass-bg-solid)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(v: number) => [`${v}€`, 'Commission']}
              />
              <Area type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2} fill="url(#commGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activities + Deals */}
      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...glass, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Prochains appels</div>
            <Link href="/activites" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Tout voir <ArrowUpRight size={12} />
            </Link>
          </div>
          {upcomingActivities.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune activité planifiée</p>}
          {upcomingActivities.map(activity => {
            const contact = contacts.find(c => c.id === activity.contactId);
            return (
              <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                  {ACTIVITY_ICONS[activity.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{contact ? `${contact.firstName} ${contact.lastName}` : ''}</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{format(new Date(activity.date), 'd MMM', { locale: fr })}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...glass, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Deals actifs</div>
            <Link href="/pipeline" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Pipeline <ArrowUpRight size={12} />
            </Link>
          </div>
          {activeDeals.slice(0, 5).map(deal => {
            const contact = contacts.find(c => c.id === deal.contactId);
            return (
              <div key={deal.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deal.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{contact ? contact.company : ''}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>+{deal.commission}€</div>
                  <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: `${STAGE_COLORS[deal.stage]}20`, color: STAGE_COLORS[deal.stage], marginTop: 2 }}>
                    {STAGE_LABELS[deal.stage]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
