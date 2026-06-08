'use client';

import { useEffect, useRef, useState } from 'react';
import { getDeals, getContacts, getActivities } from '@/lib/store';
import { Deal, Contact, Activity, COMMISSION_PER_DEAL, WEEKLY_TARGET_COMMISSION, MONTHLY_TARGET_COMMISSION, CONTRACT_TARGET_COMMISSION, WEEKLY_TARGET_DEALS, LOST_REASON_LABELS, SECTOR_LABELS } from '@/lib/types';
import { getMonthlyStats, getConversionFunnel, getAvgSaleCycle, getWeeklyStats, getConversionBySector, getConversionByBatch, getBestCallHours, formatCurrency } from '@/lib/intelligence';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { FileDown, Target, TrendingUp, Award, Clock, CheckCircle2, BarChart2, Euro } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export function getMonthlyGoal(): number {
  if (typeof window === 'undefined') return MONTHLY_TARGET_COMMISSION;
  return Number(localStorage.getItem('thomas-crm-monthly-goal') || MONTHLY_TARGET_COMMISSION);
}

export default function RapportsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setDeals(await getDeals());
      setContacts(await getContacts());
      setActivities(await getActivities());
    }
    load();
  }, []);

  const monthlyStats = getMonthlyStats(deals, 6);
  const weeklyStats = getWeeklyStats(deals, 8);
  const funnel = getConversionFunnel(deals);
  const avgCycle = getAvgSaleCycle(deals);
  const sectorConv = getConversionBySector(contacts, deals);
  const batchConv = getConversionByBatch(contacts, deals);
  const callHours = getBestCallHours(activities);

  const now = new Date();

  // Weekly stats
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const signedThisWeek = deals.filter(d =>
    d.stage === 'signe' && new Date(d.updatedAt) >= weekStart && new Date(d.updatedAt) <= weekEnd
  );
  const commissionThisWeek = signedThisWeek.reduce((s, d) => s + d.commission, 0);
  const weeklyProgress = Math.min(100, Math.round((signedThisWeek.length / WEEKLY_TARGET_DEALS) * 100));

  // Monthly stats
  const startMonth = startOfMonth(now);
  const endMonth = endOfMonth(now);
  const signedThisMonth = deals.filter(d =>
    d.stage === 'signe' && new Date(d.updatedAt) >= startMonth && new Date(d.updatedAt) <= endMonth
  );
  const commissionThisMonth = signedThisMonth.reduce((s, d) => s + d.commission, 0);
  const monthlyProgress = Math.min(100, Math.round((commissionThisMonth / MONTHLY_TARGET_COMMISSION) * 100));

  // Total commission
  const totalCommission = deals.filter(d => d.stage === 'signe').reduce((s, d) => s + d.commission, 0);
  const contractProgress = Math.min(100, Math.round((totalCommission / CONTRACT_TARGET_COMMISSION) * 100));

  // Active pipeline
  const activeDeals = deals.filter(d => d.stage !== 'signe' && d.stage !== 'perdu');
  const conversionRate = deals.length > 0 ? Math.round((deals.filter(d => d.stage === 'signe').length / deals.length) * 100) : 0;

  // Activities
  const completedActivities = activities.filter(a => a.completed).length;
  const activitiesThisWeek = activities.filter(a => {
    const d = new Date(a.date);
    return d >= weekStart && d <= weekEnd;
  });
  const completedThisWeek = activitiesThisWeek.filter(a => a.completed).length;

  // Lost reasons breakdown
  const lostDeals = deals.filter(d => d.stage === 'perdu' && d.lostReason);

  const FUNNEL_COLORS = ['var(--text-subtle)', '#3b82f6', '#f59e0b', '#10b981'];

  async function handleExportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#f2f2f7', useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let y = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      while (y < imgHeight) {
        pdf.addImage(imgData, 'JPEG', 0, -y, pdfWidth, imgHeight);
        y += pageHeight;
        if (y < imgHeight) pdf.addPage();
      }
      pdf.save(`rapport-tricolab-${format(now, 'yyyy-MM')}.pdf`);
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    borderRadius: 14,
    padding: '18px 20px',
  };

  function ProgressBar({ value, color, height = 10 }: { value: number; color: string; height?: number }) {
    return (
      <div style={{ height, background: 'var(--hover-bg)', borderRadius: height / 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: height / 2, transition: 'width 0.6s ease' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Rapports</h1>
          <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: 12 }}>{format(now, 'MMMM yyyy', { locale: fr })} · Tricolab Commission Tracker</p>
        </div>
        <button onClick={handleExportPDF} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--border-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: exporting ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13 }}>
          <FileDown size={15} /> {exporting ? 'Export…' : 'Exporter PDF'}
        </button>
      </div>

      <div ref={reportRef}>
        {/* Objectifs Tricolab */}
        <div style={{ ...cardStyle, marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Objectifs Tricolab</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {/* Semaine */}
            <div style={{ background: weeklyProgress >= 100 ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.06)', border: `1px solid ${weeklyProgress >= 100 ? 'rgba(16,185,129,0.30)' : 'rgba(99,102,241,0.20)'}`, borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Cette semaine</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: weeklyProgress >= 100 ? '#10b981' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>{commissionThisWeek}€</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{signedThisWeek.length}/{WEEKLY_TARGET_DEALS} ventes</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-subtle)' }}>{WEEKLY_TARGET_COMMISSION}€</div>
              </div>
              <ProgressBar value={weeklyProgress} color={weeklyProgress >= 100 ? '#10b981' : '#6366f1'} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{weeklyProgress}% · objectif 312€</div>
            </div>

            {/* Mois */}
            <div style={{ background: monthlyProgress >= 100 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.06)', border: `1px solid ${monthlyProgress >= 100 ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Ce mois</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: monthlyProgress >= 100 ? '#10b981' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>{commissionThisMonth}€</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{signedThisMonth.length} ventes ce mois</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-subtle)' }}>{MONTHLY_TARGET_COMMISSION}€</div>
              </div>
              <ProgressBar value={monthlyProgress} color={monthlyProgress >= 100 ? '#10b981' : '#f59e0b'} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{monthlyProgress}% · objectif 1 248€</div>
            </div>

            {/* Contrat 4 mois */}
            <div style={{ background: contractProgress >= 100 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.04)', border: `1px solid ${contractProgress >= 100 ? 'rgba(16,185,129,0.30)' : 'var(--glass-border)'}`, borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Contrat 4 mois</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{totalCommission}€</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deals.filter(d => d.stage === 'signe').length} ventes signées</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-subtle)' }}>{CONTRACT_TARGET_COMMISSION}€</div>
              </div>
              <ProgressBar value={contractProgress} color={contractProgress >= 100 ? '#10b981' : '#ef4444'} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{contractProgress}% · objectif 4 992€</div>
            </div>
          </div>

          {/* Context Tricolab */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--input-bg)', borderRadius: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Commission / vente', value: `${COMMISSION_PER_DEAL}€`, color: '#10b981' },
              { label: 'Pack Tricolab', value: '1 920€', color: 'var(--text-secondary)' },
              { label: 'Objectif hebdo', value: '2 ventes', color: '#6366f1' },
              { label: 'Prospects / semaine', value: '30 (Clara)', color: 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Commission totale', value: `${totalCommission}€`, icon: <Award size={18} />, color: '#10b981' },
            { label: 'Deals en pipeline', value: activeDeals.length.toString(), icon: <TrendingUp size={18} />, color: '#6366f1' },
            { label: 'Taux de conversion', value: `${conversionRate}%`, icon: <BarChart2 size={18} />, color: '#f59e0b' },
            { label: 'Cycle de vente moyen', value: avgCycle > 0 ? `${avgCycle}j` : '—', icon: <Clock size={18} />, color: '#3b82f6' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>
          {/* Commission par mois */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Commission signée par mois</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyStats} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-bg)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(0,0,0,0.15)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(0,0,0,0.15)" tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
                <Tooltip
                  contentStyle={{ background: 'var(--glass-bg-solid)', border: '1px solid var(--glass-border-med)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }}
                  formatter={(v) => [`${v}€`, 'Commission']}
                />
                <Bar dataKey="commission" radius={[8, 8, 0, 0]}>
                  {monthlyStats.map((entry, i) => (
                    <Cell key={i} fill={i === monthlyStats.length - 1 ? '#10b981' : 'rgba(16,185,129,0.25)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Won vs Lost */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Deals signés vs perdus</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyStats} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-bg)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(0,0,0,0.15)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(0,0,0,0.15)" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--glass-bg-solid)', border: '1px solid var(--glass-border-med)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }} />
                <Bar dataKey="won" name="Signés" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lost" name="Perdus" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel + Activities + Lost reasons */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Funnel */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Entonnoir de conversion</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {funnel.map((step, i) => {
                const maxCount = Math.max(...funnel.map(s => s.count), 1);
                const width = Math.max(8, (step.count / maxCount) * 100);
                return (
                  <div key={step.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{step.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{step.count} deals{step.commission > 0 ? ` · ${step.commission}€` : ''}</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${width}%`, background: FUNNEL_COLORS[i], borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity stats */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Appels & activités</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Total activités', value: activities.length, color: '#6366f1' },
                { label: 'Terminées', value: completedActivities, color: '#10b981' },
                { label: 'Cette semaine', value: completedThisWeek, color: '#3b82f6' },
                { label: 'En retard', value: activities.filter(a => !a.completed && new Date(a.date) < now).length, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raisons de perte */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Objections perdues</div>
            {lostDeals.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucun deal perdu qualifié</p>
            ) : (() => {
              const grouped = lostDeals.reduce<Record<string, number>>((acc, d) => {
                if (d.lostReason) acc[d.lostReason] = (acc[d.lostReason] || 0) + 1;
                return acc;
              }, {});
              const maxCount = Math.max(...Object.values(grouped), 1);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                    <div key={reason}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{LOST_REASON_LABELS[reason] || reason}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: '#ef4444', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Weekly commission + Best call hours */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>
          {/* Commission par semaine */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Commission par semaine (8 dernières)</div>
            {weeklyStats.every(w => w.commission === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune vente enregistrée</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyStats} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-bg)" vertical={false} />
                  <XAxis dataKey="week" stroke="rgba(0,0,0,0.15)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="rgba(0,0,0,0.15)" tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
                  <Tooltip contentStyle={{ background: 'var(--glass-bg-solid)', border: '1px solid var(--glass-border-med)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }} formatter={(v) => [`${v}€`, 'Commission']} />
                  <Bar dataKey="commission" radius={[8, 8, 0, 0]}>
                    {weeklyStats.map((entry, i) => (
                      <Cell key={i} fill={entry.commission >= 312 ? '#10b981' : entry.commission > 0 ? '#6366f1' : 'var(--glass-border)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[{ color: '#10b981', label: '≥ objectif (312€)' }, { color: '#6366f1', label: 'Partiel' }, { color: 'rgba(0,0,0,0.15)', label: 'Aucune vente' }].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Meilleurs créneaux d'appel */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Meilleurs créneaux d'appel</div>
            {callHours.every(h => h.count === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pas assez de données (appels complétés)</p>
            ) : (() => {
              const maxCount = Math.max(...callHours.map(h => h.count), 1);
              const bestHour = callHours.reduce((best, h) => h.count > best.count ? h : best, callHours[0]);
              return (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Meilleure heure : <span style={{ color: '#10b981', fontWeight: 700 }}>{bestHour.label}</span>
                    <span style={{ marginLeft: 6 }}>({bestHour.count} appel{bestHour.count > 1 ? 's' : ''} réussi{bestHour.count > 1 ? 's' : ''})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {callHours.filter(h => h.count > 0 || [9, 10, 11, 14, 15, 16].includes(h.hour)).map(h => (
                      <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 26, flexShrink: 0 }}>{h.label}</span>
                        <div style={{ flex: 1, height: 12, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(h.count / maxCount) * 100}%`, background: h.count === bestHour.count ? '#10b981' : '#6366f1', borderRadius: 3, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: h.count > 0 ? 700 : 400, color: h.count > 0 ? 'var(--text-primary)' : 'var(--text-subtle)', width: 16, textAlign: 'right', flexShrink: 0 }}>{h.count || ''}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Conversion par secteur + par lot */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Par secteur */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Conversion par secteur</div>
            {sectorConv.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pas de données secteur</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {sectorConv.map(s => (
                  <div key={s.sector}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{SECTOR_LABELS[s.sector as keyof typeof SECTOR_LABELS] || s.sector}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.signed}/{s.contacted} · <span style={{ fontWeight: 700, color: s.rate > 0 ? '#10b981' : 'var(--text-subtle)' }}>{s.rate}%</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.rate}%`, background: s.rate >= 10 ? '#10b981' : s.rate > 0 ? '#6366f1' : 'var(--glass-border)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Par lot semaine */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Conversion par lot Clara</div>
            {batchConv.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucun lot semaine enregistré</p>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Lot', 'Contacts', 'Intéressés', 'Signés', 'Taux'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, padding: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchConv.map(b => (
                      <tr key={b.batch} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '7px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{b.batch}</td>
                        <td style={{ padding: '7px 0', fontSize: 12, color: 'var(--text-secondary)' }}>{b.contacted}</td>
                        <td style={{ padding: '7px 0', fontSize: 12, color: '#6366f1' }}>{b.interested}</td>
                        <td style={{ padding: '7px 0', fontSize: 12, color: '#10b981', fontWeight: 600 }}>{b.signed}</td>
                        <td style={{ padding: '7px 0' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: b.rate >= 10 ? '#10b981' : b.rate > 0 ? '#f59e0b' : 'var(--text-subtle)', background: b.rate >= 10 ? 'rgba(16,185,129,0.10)' : 'var(--border-light)', padding: '2px 6px', borderRadius: 4 }}>
                            {b.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Deals signés table */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Deals signés</div>
          {deals.filter(d => d.stage === 'signe').length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucun deal signé pour le moment</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Prospect', 'Entreprise', 'Pack', 'Commission', 'Date signature'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deals.filter(d => d.stage === 'signe').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(deal => {
                  const contact = contacts.find(c => c.id === deal.contactId);
                  return (
                    <tr key={deal.id} style={{ borderTop: '1px solid var(--hover-bg)' }}>
                      <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{contact ? `${contact.firstName} ${contact.lastName}` : '—'}</td>
                      <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--text-muted)' }}>{contact ? contact.company : '—'}</td>
                      <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(deal.value)}</td>
                      <td style={{ padding: '10px 0', fontSize: 13, fontWeight: 700, color: '#10b981' }}>+{deal.commission}€</td>
                      <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--text-muted)' }}>{format(new Date(deal.updatedAt), 'd MMM yyyy', { locale: fr })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
