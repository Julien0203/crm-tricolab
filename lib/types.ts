export type ContactTag = 'client' | 'prospect' | 'partenaire' | 'fournisseur' | 'perdu';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  tags: ContactTag[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'prospect' | 'qualification' | 'proposition' | 'negociation' | 'gagne' | 'perdu';

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  stage: DealStage;
  value: number;
  probability: number;
  notes: string;
  expectedCloseDate: string;
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
