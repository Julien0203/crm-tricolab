// Statut du prospect (workflow cold call Thomas)
export type ProspectStatus =
  | 'a-appeler'
  | 'interesse'
  | 'r2-planifie'
  | 'non-interesse'
  | 'injoignable'
  | 'chaud';

// État du site existant du prospect
export type SiteStatus = 'aucun' | 'existant' | 'vieux' | 'inconnu';

// Secteur d'activité cible Tricolab
export type BusinessSector =
  | 'batiment'
  | 'profession-liberale'
  | 'restauration'
  | 'commerce'
  | 'coach-consultant'
  | 'entrepreneur'
  | 'autre';

export type LeadSource = 'linkedin' | 'site_web' | 'bouche_a_oreille' | 'email_entrant' | 'appel_froid' | 'evenement' | 'autre';

export interface Contact {
  id: string;
  firstName: string;       // prénom dirigeant
  lastName: string;
  company: string;
  sector: BusinessSector;
  city: string;
  email: string;
  phone: string;
  siteStatus: SiteStatus;
  prospectStatus: ProspectStatus;
  weekBatch?: string;      // ex: "S22-2026" (semaine de réception de la liste Clara)
  callNotes: string;
  notes: string;
  source?: LeadSource;
  createdAt: string;
  updatedAt: string;
}

// Pipeline Tricolab: R1 → R2 → Devis → Signé → Perdu
export type DealStage = 'r1' | 'r2' | 'devis-envoye' | 'signe' | 'perdu';

export type LostReason = 'prix' | 'concurrent' | 'pas_de_budget' | 'pas_de_decision' | 'timing' | 'besoin_non_confirme' | 'autre';

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  stage: DealStage;
  value: number;          // valeur deal = 1920€ pack complet (780 création + 190×6 mois)
  commission: number;     // 156€ = 20% × 780€ création
  probability: number;
  notes: string;
  expectedCloseDate: string;
  lostReason?: LostReason;
  lostNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'appel' | 'email' | 'rdv' | 'tache' | 'note';

export interface Activity {
  id: string;
  type: ActivityType;
  contactId: string;
  dealId?: string;
  title: string;
  notes: string;
  date: string;
  completed: boolean;
  createdAt: string;
}

export interface CRMStore {
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
}

// Labels affichage
export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  'a-appeler': 'À appeler',
  'interesse': 'Intéressé',
  'r2-planifie': 'R2 planifié',
  'non-interesse': 'Non intéressé',
  'injoignable': 'Injoignable',
  'chaud': 'Chaud',
};

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, string> = {
  'a-appeler': 'rgba(60,60,67,0.40)',
  'interesse': '#10b981',
  'r2-planifie': '#6366f1',
  'non-interesse': '#ef4444',
  'injoignable': '#f59e0b',
  'chaud': '#f97316',
};

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  aucun: 'Aucun site',
  existant: 'Site OK',
  vieux: 'Site vieux',
  inconnu: 'Inconnu',
};

export const SECTOR_LABELS: Record<BusinessSector, string> = {
  batiment: 'Bâtiment',
  'profession-liberale': 'Profession libérale',
  restauration: 'Restauration',
  commerce: 'Commerce',
  'coach-consultant': 'Coach / Consultant',
  entrepreneur: 'Entrepreneur',
  autre: 'Autre',
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  r1: 'R1 — 1er appel',
  r2: 'R2 — Relance',
  'devis-envoye': 'Devis envoyé',
  signe: 'Signé ✓',
  perdu: 'Perdu',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  linkedin: 'LinkedIn',
  site_web: 'Site web',
  bouche_a_oreille: 'Bouche-à-oreille',
  email_entrant: 'Email entrant',
  appel_froid: 'Appel froid',
  evenement: 'Événement',
  autre: 'Autre',
};

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  prix: 'Prix trop élevé',
  concurrent: 'Concurrent choisi',
  pas_de_budget: 'Pas de budget',
  pas_de_decision: 'Pas de décision',
  timing: 'Mauvais timing',
  besoin_non_confirme: 'Besoin non confirmé',
  autre: 'Autre raison',
};

export const ALL_SECTORS: BusinessSector[] = ['batiment', 'profession-liberale', 'restauration', 'commerce', 'coach-consultant', 'entrepreneur', 'autre'];
export const ALL_SITE_STATUSES: SiteStatus[] = ['aucun', 'existant', 'vieux', 'inconnu'];
export const ALL_PROSPECT_STATUSES: ProspectStatus[] = ['a-appeler', 'interesse', 'r2-planifie', 'non-interesse', 'injoignable', 'chaud'];
export const ALL_DEAL_STAGES: DealStage[] = ['r1', 'r2', 'devis-envoye', 'signe', 'perdu'];
export const ALL_LEAD_SOURCES: LeadSource[] = ['linkedin', 'site_web', 'bouche_a_oreille', 'email_entrant', 'appel_froid', 'evenement', 'autre'];
export const ALL_LOST_REASONS: LostReason[] = ['prix', 'concurrent', 'pas_de_budget', 'pas_de_decision', 'timing', 'besoin_non_confirme', 'autre'];

// Constantes business Tricolab
export const COMMISSION_PER_DEAL = 156;       // 20% × 780€ création
export const DEAL_FULL_VALUE = 1920;          // 780€ + 190€ × 6 mois
export const WEEKLY_TARGET_DEALS = 2;
export const WEEKLY_TARGET_COMMISSION = 312;  // 2 × 156€
export const MONTHLY_TARGET_COMMISSION = 1248;
export const CONTRACT_TARGET_COMMISSION = 4992; // 4 mois
export const CONTRACT_START_DATE = '2026-05-26'; // 1er jour du contrat
export const CONTRACT_END_DATE   = '2026-09-26'; // fin du contrat (4 mois)

// Paramètres persistés (localStorage)
export interface CRMSettings {
  userName: string;
  userTitle: string;
  contractStart: string;
  contractEnd: string;
  contractTarget: number;
  commissionPerDeal: number;
  weeklyTargetDeals: number;
  weeklyTargetCommission: number;
}

export const DEFAULT_SETTINGS: CRMSettings = {
  userName: 'Thomas',
  userTitle: 'Commercial',
  contractStart: CONTRACT_START_DATE,
  contractEnd: CONTRACT_END_DATE,
  contractTarget: CONTRACT_TARGET_COMMISSION,
  commissionPerDeal: COMMISSION_PER_DEAL,
  weeklyTargetDeals: WEEKLY_TARGET_DEALS,
  weeklyTargetCommission: WEEKLY_TARGET_COMMISSION,
};

// Tâches personnelles
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// Scripts de vente persistés
export interface ScriptBlock {
  id: string;
  title: string;
  content: string;
}

export interface CRMScripts {
  r1: ScriptBlock[];
  r2: ScriptBlock[];
  objections: ScriptBlock[];
  emails: ScriptBlock[];
}
