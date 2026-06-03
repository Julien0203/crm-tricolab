'use client';

import { useEffect, useState } from 'react';
import { getContacts, getDeals, getActivities } from '@/lib/store';
import { Contact, Deal, Activity } from '@/lib/types';
import {
  Users, TrendingUp, DollarSign, Target,
  Phone, Mail, Calendar, CheckCircle2, Clock, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  qualification: 'Qualification',
  proposition: 'Proposition',
  negociation: 'Négociation',
  gagne: 'Gagné',
  perdu: 'Perdu',
};

const STAGE_COLORS: Record<string, string> = {
  prospect: '#64748b',
  qualification: '#3b82f6',
  proposition: '#f59e0b',
  negociation: '#8b5cf6',
  gagne: '#22c55e',
  perdu: '#ef4444',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  appel: <Phone size={14} />,
  email: <Mail size={14} />,
  rdv: <Calendar size={14} />,
  tache: <CheckCircle2 size={14} />,
  note: <Clock size={14} />,
};

function KPICard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      background: '#13161f',
      border: '1px solid #1e2740',
      borderRadius: 14,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 11,
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setContacts(getContacts());
    setDeals(getDeals());
    setActivities(getActivities());
  }, []);

  const activeDeals = deals.filter(d => d.stage !== 'gagne' && d.stage !== 'perdu');
  const wonDeals = deals.filter(d => d.stage === 'gagne');
  const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
  const weightedPipeline = activeDeals.reduce((s, d) => s + d.value * d.probability / 100, 0);
  const totalWon = wonDeals.reduce((s, d) => s + d.value, 0);
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

  const stageData = ['prospect', 'qualification', 'proposition', 'negociation', 'gagne'].map(stage => ({
    name: STAGE_LABELS[stage],
    value: deals.filter(d => d.stage === stage).length,
    color: STAGE_COLORS[stage],
  })).filter(d => d.value > 0);

  const areaData = Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), 6 - i), 'EEE', { locale: fr }),
    pipeline: Math.floor(totalPipeline * (0.6 + i * 0.06)),
    gagne: Math.floor(totalWon * (0.3 + i * 0.1)),
  }));

  const upcomingActivities = activities
    .filter(a => !a.completed && new Date(a.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Pipeline total" value={formatCurrency(totalPipeline)} sub={`${activeDeals.length} deals actifs`} icon={<TrendingUp size={22} />} color="#6366f1" />
        <KPICard label="CA gagné" value={formatCurrency(totalWon)} sub={`${wonDeals.length} deals signés`} icon={<DollarSign size={22} />} color="#22c55e" />
        <KPICard label="Contacts" value={contacts.length.toString()} sub={`${contacts.filter(c => c.tags.includes('prospect')).length} prospects`} icon={<Users size={22} />} color="#3b82f6" />
        <KPICard label="Taux de conversion" value={`${conversionRate}%`} sub={`Pipeline pondéré : ${formatCurrency(weightedPipeline)}`} icon={<Target size={22} />} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#13161f', border: '1px solid #1e2740', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Évolution pipeline</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGagne" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1e2740', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="pipeline" stroke="#6366f1" fill="url(#gradPipeline)" strokeWidth={2} name="Pipeline" />
              <Area type="monotone" dataKey="gagne" stroke="#22c55e" fill="url(#gradGagne)" strokeWidth={2} name="Gagné" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#13161f', border: '1px solid #1e2740', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Répartition pipeline</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stageData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {stageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>} />
              <Tooltip contentStyle={{ background: '#1e2740', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#13161f', border: '1px solid #1e2740', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Prochaines activités</div>
            <Link href="/activites" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Voir tout <ArrowUpRight size={13} />
            </Link>
          </div>
          {upcomingActivities.length === 0 && <p style={{ color: '#475569', fontSize: 14 }}>Aucune activité planifiée</p>}
          {upcomingActivities.map(activity => {
            const contact = contacts.find(c => c.id === activity.contactId);
            return (
              <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e2740' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e2740', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0 }}>
                  {ACTIVITY_ICONS[activity.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{contact ? `${contact.firstName} ${contact.lastName}` : ''}</div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{format(new Date(activity.date), 'd MMM', { locale: fr })}</div>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#13161f', border: '1px solid #1e2740', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Deals récents</div>
            <Link href="/pipeline" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Pipeline <ArrowUpRight size={13} />
            </Link>
          </div>
          {deals.slice(0, 5).map(deal => {
            const contact = contacts.find(c => c.id === deal.contactId);
            return (
              <div key={deal.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e2740' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deal.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{contact ? contact.company : ''}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{formatCurrency(deal.value)}</div>
                  <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: `${STAGE_COLORS[deal.stage]}25`, color: STAGE_COLORS[deal.stage], marginTop: 2 }}>
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
