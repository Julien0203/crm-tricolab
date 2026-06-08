import { Contact, Deal, Activity, CRMStore, COMMISSION_PER_DEAL, CRMSettings, DEFAULT_SETTINGS, CRMScripts, Task } from './types';

const STORAGE_KEY = 'thomas-crm-data-v2'; // v2: Tricolab data model

// Batch S22-2026 reçu de Clara le lundi 26 mai 2026
// Batch S23-2026 reçu de Clara le lundi 2 juin 2026
const defaultData: CRMStore = {
  contacts: [
    {
      id: '1',
      firstName: 'Karim',
      lastName: 'Benali',
      company: 'Benali Plomberie',
      sector: 'batiment',
      city: 'Lyon 7e',
      email: 'k.benali@benali-plomberie.fr',
      phone: '06 23 45 67 89',
      siteStatus: 'vieux',
      prospectStatus: 'interesse',
      weekBatch: 'S22-2026',
      callNotes: 'Très ouvert, veut moderniser son image. Site fait en 2018. Rappel R2 jeudi.',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-28').toISOString(),
    },
    {
      id: '2',
      firstName: 'Nathalie',
      lastName: 'Rousseau',
      company: 'Cabinet Rousseau',
      sector: 'profession-liberale',
      city: 'Grenoble',
      email: 'n.rousseau@cabinet-rousseau.fr',
      phone: '04 76 12 34 56',
      siteStatus: 'aucun',
      prospectStatus: 'r2-planifie',
      weekBatch: 'S22-2026',
      callNotes: 'Comptable indépendante, pas de site du tout. R2 planifié lundi 2 juin à 11h.',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-29').toISOString(),
    },
    {
      id: '3',
      firstName: 'Julien',
      lastName: 'Mercier',
      company: 'Le Refuge — Brasserie',
      sector: 'restauration',
      city: 'Annecy',
      email: 'contact@lerefuge-annecy.fr',
      phone: '04 50 23 11 98',
      siteStatus: 'vieux',
      prospectStatus: 'chaud',
      weekBatch: 'S22-2026',
      callNotes: 'Très motivé. Son site est honteux selon lui. Devis déjà évoqué, veut des exemples de réalisations.',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-30').toISOString(),
    },
    {
      id: '4',
      firstName: 'Patricia',
      lastName: 'Lévêque',
      company: 'Élec Pro 69',
      sector: 'batiment',
      city: 'Villeurbanne',
      email: 'patricia@elecpro69.fr',
      phone: '06 78 90 12 34',
      siteStatus: 'aucun',
      prospectStatus: 'injoignable',
      weekBatch: 'S22-2026',
      callNotes: 'Messagerie à chaque essai. 3 tentatives. Réessayer semaine prochaine.',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-27').toISOString(),
    },
    {
      id: '5',
      firstName: 'Sébastien',
      lastName: 'Fontaine',
      company: 'Coach Fontaine Performance',
      sector: 'coach-consultant',
      city: 'Chambéry',
      email: 's.fontaine@coachfontaine.fr',
      phone: '06 11 22 33 44',
      siteStatus: 'existant',
      prospectStatus: 'non-interesse',
      weekBatch: 'S22-2026',
      callNotes: 'Déjà un prestataire web, satisfait. Pas intéressé pour le moment.',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-26').toISOString(),
    },
    {
      id: '6',
      firstName: 'Ahmed',
      lastName: 'Ouali',
      company: 'Maçonnerie Ouali & Fils',
      sector: 'batiment',
      city: 'Saint-Étienne',
      email: 'contact@maconnerie-ouali.fr',
      phone: '07 55 66 77 88',
      siteStatus: 'vieux',
      prospectStatus: 'a-appeler',
      weekBatch: 'S23-2026',
      callNotes: '',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-06-02').toISOString(),
      updatedAt: new Date('2026-06-02').toISOString(),
    },
    {
      id: '7',
      firstName: 'Claire',
      lastName: 'Moreau',
      company: 'Ostéo Claire Moreau',
      sector: 'profession-liberale',
      city: 'Bourg-en-Bresse',
      email: 'claire.moreau.osteo@gmail.com',
      phone: '06 44 55 66 77',
      siteStatus: 'aucun',
      prospectStatus: 'a-appeler',
      weekBatch: 'S23-2026',
      callNotes: '',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-06-02').toISOString(),
      updatedAt: new Date('2026-06-02').toISOString(),
    },
    {
      id: '8',
      firstName: 'Thomas',
      lastName: 'Garnier',
      company: 'Boucherie Garnier',
      sector: 'commerce',
      city: 'Valence',
      email: 'boucherie.garnier@wanadoo.fr',
      phone: '04 75 43 21 09',
      siteStatus: 'vieux',
      prospectStatus: 'a-appeler',
      weekBatch: 'S23-2026',
      callNotes: '',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-06-02').toISOString(),
      updatedAt: new Date('2026-06-02').toISOString(),
    },
    {
      id: '9',
      firstName: 'Marie',
      lastName: 'Delacroix',
      company: 'Institut Beauté Marie D.',
      sector: 'commerce',
      city: 'Lyon 3e',
      email: 'marie.delacroix.beaute@gmail.com',
      phone: '06 87 65 43 21',
      siteStatus: 'aucun',
      prospectStatus: 'interesse',
      weekBatch: 'S23-2026',
      callNotes: 'Appelée ce matin. Très intéressée, veut un site vitrine + Google. Rappel jeudi 5 juin.',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-06-02').toISOString(),
      updatedAt: new Date('2026-06-03').toISOString(),
    },
    {
      id: '10',
      firstName: 'Pascal',
      lastName: 'Vidal',
      company: 'Menuiserie Vidal',
      sector: 'batiment',
      city: 'Clermont-Ferrand',
      email: 'pascal.vidal@menuiserie-vidal.fr',
      phone: '06 33 44 55 66',
      siteStatus: 'vieux',
      prospectStatus: 'a-appeler',
      weekBatch: 'S23-2026',
      callNotes: '',
      notes: '',
      source: 'appel_froid',
      createdAt: new Date('2026-06-02').toISOString(),
      updatedAt: new Date('2026-06-02').toISOString(),
    },
  ],
  deals: [
    {
      id: '1',
      title: 'Site vitrine — Le Refuge Brasserie',
      contactId: '3',
      stage: 'r2',
      value: 1920,
      commission: COMMISSION_PER_DEAL,
      probability: 75,
      notes: 'Très chaud. Envoyer exemples de réas restaurants avant R2.',
      expectedCloseDate: new Date('2026-06-10').toISOString(),
      createdAt: new Date('2026-05-28').toISOString(),
      updatedAt: new Date('2026-05-30').toISOString(),
    },
    {
      id: '2',
      title: 'Site vitrine — Cabinet Rousseau',
      contactId: '2',
      stage: 'r2',
      value: 1920,
      commission: COMMISSION_PER_DEAL,
      probability: 60,
      notes: 'Comptable sans site. R2 lundi 2 juin 11h.',
      expectedCloseDate: new Date('2026-06-13').toISOString(),
      createdAt: new Date('2026-05-27').toISOString(),
      updatedAt: new Date('2026-05-29').toISOString(),
    },
    {
      id: '3',
      title: 'Site vitrine — Benali Plomberie',
      contactId: '1',
      stage: 'devis-envoye',
      value: 1920,
      commission: COMMISSION_PER_DEAL,
      probability: 50,
      notes: 'Devis envoyé le 30 mai. Relance prévue vendredi.',
      expectedCloseDate: new Date('2026-06-07').toISOString(),
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-30').toISOString(),
    },
    {
      id: '4',
      title: 'Site vitrine — Institut Marie D.',
      contactId: '9',
      stage: 'r1',
      value: 1920,
      commission: COMMISSION_PER_DEAL,
      probability: 40,
      notes: 'Premier contact positif, rappel R2 jeudi.',
      expectedCloseDate: new Date('2026-06-20').toISOString(),
      createdAt: new Date('2026-06-03').toISOString(),
      updatedAt: new Date('2026-06-03').toISOString(),
    },
    {
      id: '5',
      title: 'Site vitrine — Fontaine Performance',
      contactId: '5',
      stage: 'perdu',
      value: 1920,
      commission: COMMISSION_PER_DEAL,
      probability: 0,
      notes: '',
      lostReason: 'concurrent',
      lostNote: 'Déjà prestataire web en place, satisfait.',
      expectedCloseDate: new Date('2026-05-30').toISOString(),
      createdAt: new Date('2026-05-26').toISOString(),
      updatedAt: new Date('2026-05-26').toISOString(),
    },
  ],
  activities: [
    {
      id: '1',
      type: 'appel',
      contactId: '3',
      dealId: '1',
      title: 'R2 — Le Refuge Brasserie',
      notes: 'Appel R2 avec Julien Mercier. Préparer exemples réalisations restaurants.',
      date: new Date('2026-06-04T10:00:00').toISOString(),
      completed: false,
      createdAt: new Date('2026-05-30').toISOString(),
    },
    {
      id: '2',
      type: 'appel',
      contactId: '2',
      dealId: '2',
      title: 'R2 — Cabinet Rousseau',
      notes: 'R2 planifié. Nathalie attend des exemples secteur profession libérale.',
      date: new Date('2026-06-02T11:00:00').toISOString(),
      completed: true,
      createdAt: new Date('2026-05-29').toISOString(),
    },
    {
      id: '3',
      type: 'email',
      contactId: '1',
      dealId: '3',
      title: 'Relance devis — Benali Plomberie',
      notes: 'Devis envoyé le 30 mai, pas de réponse. Relancer par email + appel.',
      date: new Date('2026-06-06T09:00:00').toISOString(),
      completed: false,
      createdAt: new Date('2026-06-03').toISOString(),
    },
    {
      id: '4',
      type: 'appel',
      contactId: '9',
      dealId: '4',
      title: 'R2 — Institut Marie Delacroix',
      notes: 'Rappel R2 suite au bon premier contact ce matin.',
      date: new Date('2026-06-05T14:00:00').toISOString(),
      completed: false,
      createdAt: new Date('2026-06-03').toISOString(),
    },
    {
      id: '5',
      type: 'appel',
      contactId: '4',
      title: 'Relance Patricia — Élec Pro 69',
      notes: 'Injoignable 3×. Réessayer à une heure différente.',
      date: new Date('2026-06-04T16:00:00').toISOString(),
      completed: false,
      createdAt: new Date('2026-06-03').toISOString(),
    },
    {
      id: '6',
      type: 'appel',
      contactId: '6',
      title: 'R1 — Maçonnerie Ouali',
      notes: 'Nouveau prospect S23. Premier appel à passer.',
      date: new Date('2026-06-03T11:00:00').toISOString(),
      completed: false,
      createdAt: new Date('2026-06-02').toISOString(),
    },
    {
      id: '7',
      type: 'appel',
      contactId: '7',
      title: 'R1 — Ostéo Claire Moreau',
      notes: 'Nouveau prospect S23. Premier appel à passer.',
      date: new Date('2026-06-03T15:00:00').toISOString(),
      completed: false,
      createdAt: new Date('2026-06-02').toISOString(),
    },
    {
      id: '8',
      type: 'appel',
      contactId: '1',
      dealId: '3',
      title: 'R1 — Benali Plomberie',
      notes: 'Premier appel réussi. Intéressé, site 2018 à refaire.',
      date: new Date('2026-05-27T10:30:00').toISOString(),
      completed: true,
      createdAt: new Date('2026-05-27').toISOString(),
    },
  ],
};

function getStore(): CRMStore {
  if (typeof window === 'undefined') return defaultData;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function saveStore(data: CRMStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Contacts
export function getContacts(): Contact[] {
  return getStore().contacts;
}

export function getContact(id: string): Contact | undefined {
  return getStore().contacts.find(c => c.id === id);
}

export function saveContacts(contacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]): Contact[] {
  const store = getStore();
  const now = new Date().toISOString();
  const newContacts: Contact[] = contacts.map((c, i) => ({
    ...c,
    id: (Date.now() + i).toString(),
    createdAt: now,
    updatedAt: now,
  }));
  store.contacts.unshift(...newContacts);
  saveStore(store);
  return newContacts;
}

export function saveContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const store = getStore();
  const newContact: Contact = {
    ...contact,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.contacts.unshift(newContact);
  saveStore(store);
  return newContact;
}

export function updateContact(id: string, updates: Partial<Contact>): Contact | null {
  const store = getStore();
  const idx = store.contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  store.contacts[idx] = { ...store.contacts[idx], ...updates, updatedAt: new Date().toISOString() };
  saveStore(store);
  return store.contacts[idx];
}

export function deleteContact(id: string) {
  const store = getStore();
  store.contacts = store.contacts.filter(c => c.id !== id);
  store.deals = store.deals.filter(d => d.contactId !== id);
  store.activities = store.activities.filter(a => a.contactId !== id);
  saveStore(store);
}

// Deals
export function getDeals(): Deal[] {
  return getStore().deals;
}

export function saveDeal(deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Deal {
  const store = getStore();
  const newDeal: Deal = {
    ...deal,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.deals.unshift(newDeal);
  saveStore(store);
  return newDeal;
}

export function updateDeal(id: string, updates: Partial<Deal>): Deal | null {
  const store = getStore();
  const idx = store.deals.findIndex(d => d.id === id);
  if (idx === -1) return null;
  store.deals[idx] = { ...store.deals[idx], ...updates, updatedAt: new Date().toISOString() };
  saveStore(store);
  return store.deals[idx];
}

export function deleteDeal(id: string) {
  const store = getStore();
  store.deals = store.deals.filter(d => d.id !== id);
  saveStore(store);
}

// Activities
export function getActivities(): Activity[] {
  return getStore().activities;
}

export function saveActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Activity {
  const store = getStore();
  const newActivity: Activity = {
    ...activity,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  store.activities.unshift(newActivity);
  saveStore(store);
  return newActivity;
}

export function updateActivity(id: string, updates: Partial<Activity>): Activity | null {
  const store = getStore();
  const idx = store.activities.findIndex(a => a.id === id);
  if (idx === -1) return null;
  store.activities[idx] = { ...store.activities[idx], ...updates };
  saveStore(store);
  return store.activities[idx];
}

export function deleteActivity(id: string) {
  const store = getStore();
  store.activities = store.activities.filter(a => a.id !== id);
  saveStore(store);
}

// Helper: reset localStorage to fresh default data
export function resetStore() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}

// Settings
const SETTINGS_KEY = 'thomas-crm-settings-v1';

export function getSettings(): CRMSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: CRMSettings): void {
  if (typeof window !== 'undefined') localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// Scripts
const SCRIPTS_KEY = 'thomas-crm-scripts-v1';

export function getScripts(): CRMScripts | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveScripts(s: CRMScripts): void {
  if (typeof window !== 'undefined') localStorage.setItem(SCRIPTS_KEY, JSON.stringify(s));
}

// Tasks
const TASKS_KEY = 'thomas-crm-taches-v1';

export function getTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTask(text: string): Task {
  const tasks = getTasks();
  const task: Task = { id: Date.now().toString(), text, completed: false, createdAt: new Date().toISOString() };
  tasks.unshift(task);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = getTasks().map(t => t.id === id ? { ...t, ...updates } : t);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter(t => t.id !== id);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
