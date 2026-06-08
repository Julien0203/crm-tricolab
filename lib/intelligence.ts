import { Contact, Deal, Activity, DealStage } from './types';
import { differenceInDays, differenceInCalendarDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Alert types ─────────────────────────────────────────────────────────────

export type AlertLevel = 'danger' | 'warning' | 'info' | 'success';

export interface SmartAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  action?: string;
  contactId?: string;
  dealId?: string;
}

// ─── Contact score ────────────────────────────────────────────────────────────

export interface ContactScore {
  score: number;       // 0-100
  label: string;       // 'Froid' | 'Tiède' | 'Chaud' | 'Très chaud'
  color: string;
  details: string[];
}

export function scoreContact(contact: Contact, deals: Deal[], activities: Activity[]): ContactScore {
  const contactDeals = deals.filter(d => d.contactId === contact.id);
  const contactActivities = activities.filter(a => a.contactId === contact.id);
  let score = 0;
  const details: string[] = [];

  // Prospect status bonus
  if (contact.prospectStatus === 'chaud') { score += 30; details.push('Prospect chaud'); }
  else if (contact.prospectStatus === 'interesse') { score += 20; details.push('Prospect intéressé'); }
  else if (contact.prospectStatus === 'r2-planifie') { score += 25; details.push('R2 planifié'); }
  else if (contact.prospectStatus === 'injoignable') { score -= 5; }
  else if (contact.prospectStatus === 'non-interesse') { score -= 20; details.push('Non intéressé'); }

  // Has active deals
  const activeDeals = contactDeals.filter(d => d.stage !== 'perdu');
  if (activeDeals.length > 0) { score += 15; details.push(`${activeDeals.length} deal(s) actif(s)`); }

  // Deal stage bonus
  const bestStage = getBestStage(activeDeals.map(d => d.stage));
  if (bestStage === 'signe') { score += 30; details.push('Deal signé'); }
  else if (bestStage === 'devis-envoye') { score += 20; details.push('Devis envoyé'); }
  else if (bestStage === 'r2') { score += 15; details.push('R2 en cours'); }
  else if (bestStage === 'r1') { score += 8; details.push('R1 effectué'); }

  // Recent activities
  const recentActivities = contactActivities.filter(
    a => differenceInDays(new Date(), new Date(a.date)) <= 14
  );
  if (recentActivities.length >= 3) { score += 15; details.push(`${recentActivities.length} activités récentes`); }
  else if (recentActivities.length > 0) { score += 8; details.push(`${recentActivities.length} activité(s) récente(s)`); }

  // Completed activities
  const completedActivities = contactActivities.filter(a => a.completed);
  if (completedActivities.length >= 3) { score += 10; details.push('Suivi actif'); }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;
  if (score >= 75) { label = 'Très chaud'; color = '#22c55e'; }
  else if (score >= 50) { label = 'Chaud'; color = '#f59e0b'; }
  else if (score >= 25) { label = 'Tiède'; color = '#3b82f6'; }
  else { label = 'Froid'; color = '#64748b'; }

  return { score, label, color, details };
}

function getBestStage(stages: DealStage[]): DealStage | null {
  const order: DealStage[] = ['signe', 'devis-envoye', 'r2', 'r1', 'perdu'];
  for (const s of order) {
    if (stages.includes(s)) return s;
  }
  return null;
}

// ─── Next action recommendation ──────────────────────────────────────────────

export interface NextAction {
  action: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

export function getNextAction(contact: Contact, deals: Deal[], activities: Activity[]): NextAction {
  const contactDeals = deals.filter(d => d.contactId === contact.id && d.stage !== 'perdu' && d.stage !== 'signe');
  const contactActivities = activities.filter(a => a.contactId === contact.id);
  const pendingActivities = contactActivities.filter(a => !a.completed && new Date(a.date) >= new Date());
  const lastActivity = contactActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const daysSinceLastContact = lastActivity ? differenceInDays(new Date(), new Date(lastActivity.date)) : 999;

  if (contact.prospectStatus === 'non-interesse') {
    return { action: 'Prospect non intéressé', reason: 'Ne pas relancer pour le moment', urgency: 'low' };
  }

  if (contact.prospectStatus === 'injoignable') {
    return { action: 'Réessayer à une autre heure', reason: `Injoignable — tenter ${daysSinceLastContact > 2 ? 'maintenant' : 'dans 2 jours'}`, urgency: 'medium' };
  }

  if (contactDeals.length === 0) {
    if (contact.prospectStatus === 'interesse' || contact.prospectStatus === 'chaud' || contact.prospectStatus === 'r2-planifie') {
      return { action: 'Créer un deal dans le pipeline', reason: 'Prospect qualifié sans deal — à suivre', urgency: 'high' };
    }
    return { action: 'Appeler pour R1', reason: 'Premier appel à effectuer', urgency: 'medium' };
  }

  const bestDeal = contactDeals.sort((a, b) => {
    const order = ['devis-envoye', 'r2', 'r1'];
    return order.indexOf(a.stage) - order.indexOf(b.stage);
  })[0];

  if (bestDeal.stage === 'devis-envoye') {
    if (daysSinceLastContact > 5) return { action: 'Relancer sur le devis', reason: `Devis sans retour depuis ${daysSinceLastContact}j — ne pas laisser refroidir`, urgency: 'high' };
    return { action: 'Attendre retour sur le devis', reason: 'Devis envoyé récemment', urgency: 'low' };
  }

  if (bestDeal.stage === 'r2') {
    if (daysSinceLastContact > 7) return { action: 'Relancer par téléphone', reason: 'R2 — ne pas laisser refroidir', urgency: 'high' };
    return { action: 'Préparer les arguments de closing', reason: 'R2 en cours — être prêt à conclure', urgency: 'medium' };
  }

  if (bestDeal.stage === 'r1') {
    return { action: 'Envoyer le devis', reason: 'R1 effectué — passer au devis', urgency: 'medium' };
  }

  return { action: 'Suivre le prospect', reason: 'Deal en cours', urgency: 'low' };
}

// ─── Contact timeline ─────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'activity' | 'deal_created' | 'deal_stage' | 'contact_created';
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  completed?: boolean;
}

export function buildTimeline(contact: Contact, deals: Deal[], activities: Activity[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `contact-${contact.id}`,
    date: contact.createdAt,
    type: 'contact_created',
    title: 'Prospect ajouté',
    subtitle: contact.company,
    icon: 'user',
    color: '#6366f1',
  });

  const contactDeals = deals.filter(d => d.contactId === contact.id);
  contactDeals.forEach(deal => {
    events.push({
      id: `deal-${deal.id}`,
      date: deal.createdAt,
      type: 'deal_created',
      title: `Deal créé : ${deal.title}`,
      subtitle: `${formatCurrency(deal.value)} · commission ${deal.commission}€`,
      icon: 'trending-up',
      color: '#3b82f6',
    });
  });

  const contactActivities = activities.filter(a => a.contactId === contact.id);
  contactActivities.forEach(activity => {
    const typeColors: Record<string, string> = {
      appel: '#3b82f6', email: '#6366f1', rdv: '#f59e0b', tache: '#8b5cf6', note: '#64748b',
    };
    const typeLabels: Record<string, string> = {
      appel: 'Appel', email: 'Email', rdv: 'RDV', tache: 'Tâche', note: 'Note',
    };
    events.push({
      id: `activity-${activity.id}`,
      date: activity.date,
      type: 'activity',
      title: activity.title,
      subtitle: typeLabels[activity.type] || activity.type,
      icon: activity.type,
      color: typeColors[activity.type] || '#64748b',
      completed: activity.completed,
    });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Smart Alerts ─────────────────────────────────────────────────────────────

export function generateSmartAlerts(contacts: Contact[], deals: Deal[], activities: Activity[], weeklyCommissionGoal: number = 312): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date();

  // Deals stagnating (no activity in >7 days, not won/lost)
  const activeDeals = deals.filter(d => d.stage !== 'signe' && d.stage !== 'perdu');
  activeDeals.forEach(deal => {
    const dealActivities = activities.filter(a => a.dealId === deal.id || a.contactId === deal.contactId);
    const lastActivity = dealActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const daysSince = lastActivity ? differenceInDays(now, new Date(lastActivity.date)) : 999;

    if (daysSince >= 14) {
      alerts.push({
        id: `stale-${deal.id}`,
        level: 'danger',
        title: `Deal inactif depuis ${daysSince}j`,
        description: `"${deal.title}" — aucune activité depuis plus de 2 semaines`,
        action: 'Relancer maintenant',
        dealId: deal.id,
        contactId: deal.contactId,
      });
    } else if (daysSince >= 7) {
      alerts.push({
        id: `warn-${deal.id}`,
        level: 'warning',
        title: `Relance recommandée`,
        description: `"${deal.title}" — pas de contact depuis ${daysSince} jours`,
        action: 'Planifier une activité',
        dealId: deal.id,
        contactId: deal.contactId,
      });
    }
  });

  // Deals close to expected close date
  activeDeals.forEach(deal => {
    if (!deal.expectedCloseDate) return;
    const daysLeft = differenceInCalendarDays(new Date(deal.expectedCloseDate), now);
    if (daysLeft >= 0 && daysLeft <= 7) {
      alerts.push({
        id: `closing-${deal.id}`,
        level: daysLeft <= 3 ? 'danger' : 'warning',
        title: daysLeft === 0 ? 'Date de clôture aujourd\'hui !' : `Clôture dans ${daysLeft}j`,
        description: `"${deal.title}" — commission ${deal.commission}€ à décrocher`,
        action: 'Agir maintenant',
        dealId: deal.id,
        contactId: deal.contactId,
      });
    }
  });

  // Weekly commission goal tracking
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
  startWeek.setHours(0, 0, 0, 0);
  const wonThisWeek = deals.filter(d =>
    d.stage === 'signe' &&
    new Date(d.updatedAt) >= startWeek
  );
  const commissionThisWeek = wonThisWeek.reduce((s, d) => s + d.commission, 0);
  const weeklyProgress = weeklyCommissionGoal > 0 ? (commissionThisWeek / weeklyCommissionGoal) * 100 : 0;

  if (weeklyCommissionGoal > 0 && wonThisWeek.length >= 2) {
    alerts.push({
      id: 'weekly-goal-success',
      level: 'success',
      title: `Objectif semaine atteint ! 🎯`,
      description: `${wonThisWeek.length} ventes · ${commissionThisWeek}€ de commission cette semaine`,
      action: 'Voir les rapports',
    });
  } else if (weeklyCommissionGoal > 0) {
    const remaining = 2 - wonThisWeek.length;
    alerts.push({
      id: 'weekly-goal-progress',
      level: wonThisWeek.length === 0 ? 'warning' : 'info',
      title: `Objectif semaine : ${wonThisWeek.length}/2 ventes`,
      description: `${remaining} vente${remaining > 1 ? 's' : ''} pour atteindre 312€ de commission — ${deals.filter(d => d.stage === 'devis-envoye').length} devis en attente`,
      action: 'Voir le pipeline',
    });
  }

  // Prospects injoignable > 3 days without retry
  const injoignableProspects = contacts.filter(c => c.prospectStatus === 'injoignable');
  if (injoignableProspects.length > 0) {
    alerts.push({
      id: 'injoignable-prospects',
      level: 'info',
      title: `${injoignableProspects.length} prospect(s) injoignable(s)`,
      description: injoignableProspects.slice(0, 3).map(c => `${c.firstName} ${c.lastName}`).join(', ') + (injoignableProspects.length > 3 ? '...' : '') + ' — réessayer à une autre heure',
      action: 'Voir les contacts',
    });
  }

  // Pending activities overdue
  const overdueActivities = activities.filter(a => !a.completed && new Date(a.date) < now);
  if (overdueActivities.length > 0) {
    alerts.push({
      id: 'overdue-activities',
      level: 'warning',
      title: `${overdueActivities.length} activité(s) en retard`,
      description: overdueActivities.slice(0, 2).map(a => `"${a.title}"`).join(', ') + (overdueActivities.length > 2 ? ` et ${overdueActivities.length - 2} autres` : ''),
      action: 'Voir les activités',
    });
  }

  return alerts.sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2, success: 3 };
    return order[a.level] - order[b.level];
  });
}

// ─── Monthly stats for reports ────────────────────────────────────────────────

export interface MonthlyStats {
  month: string;
  won: number;
  lost: number;
  created: number;
  revenue: number;
  commission: number;
}

export function getMonthlyStats(deals: Deal[], months = 6): MonthlyStats[] {
  const result: MonthlyStats[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = subDays(new Date(), i * 30);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthDeals = deals.filter(d => new Date(d.createdAt) >= start && new Date(d.createdAt) <= end);
    const wonDeals = deals.filter(d => d.stage === 'signe' && new Date(d.updatedAt) >= start && new Date(d.updatedAt) <= end);
    const lostDeals = deals.filter(d => d.stage === 'perdu' && new Date(d.updatedAt) >= start && new Date(d.updatedAt) <= end);
    result.push({
      month: format(date, 'MMM yy', { locale: fr }),
      won: wonDeals.length,
      lost: lostDeals.length,
      created: monthDeals.length,
      revenue: wonDeals.reduce((s, d) => s + d.value, 0),
      commission: wonDeals.reduce((s, d) => s + d.commission, 0),
    });
  }
  return result;
}

export function getConversionFunnel(deals: Deal[]) {
  const stages = ['r1', 'r2', 'devis-envoye', 'signe'] as const;
  const labels = ['R1 — 1er appel', 'R2 — Relance', 'Devis envoyé', 'Signé'];
  return stages.map((stage, i) => ({
    stage,
    label: labels[i],
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0),
    commission: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.commission, 0),
  }));
}

export function getAvgSaleCycle(deals: Deal[]): number {
  const wonDeals = deals.filter(d => d.stage === 'signe');
  if (wonDeals.length === 0) return 0;
  const total = wonDeals.reduce((s, d) => s + differenceInDays(new Date(d.updatedAt), new Date(d.createdAt)), 0);
  return Math.round(total / wonDeals.length);
}

// ─── Weekly stats ─────────────────────────────────────────────────────────────

export interface WeeklyStats {
  week: string;
  signed: number;
  commission: number;
}

export function getWeeklyStats(deals: Deal[], weeks = 8): WeeklyStats[] {
  const result: WeeklyStats[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const ref = subDays(now, i * 7);
    const wStart = startOfWeek(ref, { weekStartsOn: 1 });
    const wEnd = endOfWeek(ref, { weekStartsOn: 1 });
    const weekDeals = deals.filter(d => d.stage === 'signe' && new Date(d.updatedAt) >= wStart && new Date(d.updatedAt) <= wEnd);
    result.push({
      week: `S${format(ref, 'w')}`,
      signed: weekDeals.length,
      commission: weekDeals.reduce((s, d) => s + d.commission, 0),
    });
  }
  return result;
}

// ─── Conversion by sector ────────────────────────────────────────────────────

export interface SectorConversion {
  sector: string;
  contacted: number;
  signed: number;
  rate: number;
}

export function getConversionBySector(contacts: Contact[], deals: Deal[]): SectorConversion[] {
  const sectors = [...new Set(contacts.map(c => c.sector))];
  return sectors.map(sector => {
    const sectorContacts = contacts.filter(c => c.sector === sector);
    const signed = deals.filter(d => d.stage === 'signe' && sectorContacts.some(c => c.id === d.contactId)).length;
    const rate = sectorContacts.length > 0 ? Math.round((signed / sectorContacts.length) * 100) : 0;
    return { sector, contacted: sectorContacts.length, signed, rate };
  }).filter(s => s.contacted > 0).sort((a, b) => b.rate - a.rate || b.contacted - a.contacted);
}

// ─── Conversion by batch ──────────────────────────────────────────────────────

export interface BatchConversion {
  batch: string;
  contacted: number;
  interested: number;
  signed: number;
  rate: number;
}

export function getConversionByBatch(contacts: Contact[], deals: Deal[]): BatchConversion[] {
  const batches = [...new Set(contacts.filter(c => c.weekBatch).map(c => c.weekBatch!))].sort().reverse();
  return batches.slice(0, 10).map(batch => {
    const batchContacts = contacts.filter(c => c.weekBatch === batch);
    const interested = batchContacts.filter(c => ['interesse', 'r2-planifie', 'chaud'].includes(c.prospectStatus)).length;
    const signed = deals.filter(d => d.stage === 'signe' && batchContacts.some(c => c.id === d.contactId)).length;
    const rate = batchContacts.length > 0 ? Math.round((signed / batchContacts.length) * 100) : 0;
    return { batch, contacted: batchContacts.length, interested, signed, rate };
  });
}

// ─── Best call hours ─────────────────────────────────────────────────────────

export interface CallHourStat {
  hour: number;
  label: string;
  count: number;
}

export function getBestCallHours(activities: Activity[]): CallHourStat[] {
  const completedCalls = activities.filter(a => a.completed && a.type === 'appel');
  const counts: Record<number, number> = {};
  completedCalls.forEach(a => {
    const h = new Date(a.date).getHours();
    counts[h] = (counts[h] || 0) + 1;
  });
  return Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    return { hour, label: `${hour}h`, count: counts[hour] || 0 };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export { formatCurrency };
