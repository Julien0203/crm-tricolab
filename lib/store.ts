import { Contact, Deal, Activity, CRMStore } from './types';

const STORAGE_KEY = 'thomas-crm-data';

const defaultData: CRMStore = {
  contacts: [
    {
      id: '1',
      firstName: 'Sophie',
      lastName: 'Martin',
      company: 'TechCorp SAS',
      email: 'sophie.martin@techcorp.fr',
      phone: '06 12 34 56 78',
      tags: ['prospect'],
      notes: 'Intéressée par notre offre premium',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: '2',
      firstName: 'Marc',
      lastName: 'Dubois',
      company: 'Dubois & Associés',
      email: 'marc.dubois@dubois-asso.fr',
      phone: '07 98 76 54 32',
      tags: ['client'],
      notes: 'Client fidèle depuis 2 ans',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: '3',
      firstName: 'Laura',
      lastName: 'Petit',
      company: 'Petit Design Studio',
      email: 'laura@petitdesign.fr',
      phone: '06 55 44 33 22',
      tags: ['prospect'],
      notes: 'RDV à planifier semaine prochaine',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
  deals: [
    {
      id: '1',
      title: 'Contrat annuel TechCorp',
      contactId: '1',
      stage: 'proposition',
      value: 12000,
      probability: 60,
      notes: 'Proposition envoyée le 28/05',
      expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: '2',
      title: 'Renouvellement Dubois',
      contactId: '2',
      stage: 'negociation',
      value: 8500,
      probability: 80,
      notes: 'Négociation en cours sur le tarif',
      expectedCloseDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: '3',
      title: 'Pack démarrage Petit Design',
      contactId: '3',
      stage: 'qualification',
      value: 2400,
      probability: 40,
      notes: 'Besoin de mieux qualifier',
      expectedCloseDate: new Date(Date.now() + 21 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: '4',
      title: 'Projet web Dubois',
      contactId: '2',
      stage: 'gagne',
      value: 5000,
      probability: 100,
      notes: 'Signé !',
      expectedCloseDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ],
  activities: [
    {
      id: '1',
      type: 'appel',
      contactId: '1',
      dealId: '1',
      title: 'Appel suivi proposition',
      notes: 'Sophie souhaite une réunion en visio',
      date: new Date(Date.now() + 2 * 86400000).toISOString(),
      completed: false,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: '2',
      type: 'rdv',
      contactId: '2',
      dealId: '2',
      title: 'RDV finalisation contrat',
      notes: 'Bureaux de Marc à 14h',
      date: new Date(Date.now() + 5 * 86400000).toISOString(),
      completed: false,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: '3',
      type: 'email',
      contactId: '3',
      title: 'Envoi documentation',
      notes: 'Documentation produit envoyée',
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      completed: true,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
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
