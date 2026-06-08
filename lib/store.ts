import { supabase } from './supabase';
import {
  Contact, Deal, Activity, Task,
  CRMSettings, DEFAULT_SETTINGS, CRMScripts, COMMISSION_PER_DEAL,
} from './types';

// ── Mappers camelCase ↔ snake_case ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToContact(r: any): Contact {
  return {
    id: r.id,
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    company: r.company || '',
    sector: r.sector,
    city: r.city || '',
    email: r.email || '',
    phone: r.phone || '',
    siteStatus: r.site_status,
    prospectStatus: r.prospect_status,
    weekBatch: r.week_batch || '',
    callNotes: r.call_notes || '',
    notes: r.notes || '',
    source: r.source || 'appel_froid',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function contactToDb(c: Partial<Contact>): Record<string, unknown> {
  const r: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('firstName'      in c) r.first_name      = c.firstName;
  if ('lastName'       in c) r.last_name        = c.lastName;
  if ('company'        in c) r.company          = c.company;
  if ('sector'         in c) r.sector           = c.sector;
  if ('city'           in c) r.city             = c.city;
  if ('email'          in c) r.email            = c.email;
  if ('phone'          in c) r.phone            = c.phone;
  if ('siteStatus'     in c) r.site_status      = c.siteStatus;
  if ('prospectStatus' in c) r.prospect_status  = c.prospectStatus;
  if ('weekBatch'      in c) r.week_batch       = c.weekBatch;
  if ('callNotes'      in c) r.call_notes       = c.callNotes;
  if ('notes'          in c) r.notes            = c.notes;
  if ('source'         in c) r.source           = c.source;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToDeal(r: any): Deal {
  return {
    id: r.id,
    title: r.title,
    contactId: r.contact_id || '',
    stage: r.stage,
    value: r.value ?? 1920,
    commission: r.commission ?? COMMISSION_PER_DEAL,
    probability: r.probability ?? 0,
    notes: r.notes || '',
    lostReason: r.lost_reason,
    lostNote: r.lost_note,
    expectedCloseDate: r.expected_close_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function dealToDb(d: Partial<Deal>): Record<string, unknown> {
  const r: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('title'             in d) r.title              = d.title;
  if ('contactId'         in d) r.contact_id          = d.contactId;
  if ('stage'             in d) r.stage               = d.stage;
  if ('value'             in d) r.value               = d.value;
  if ('commission'        in d) r.commission          = d.commission;
  if ('probability'       in d) r.probability         = d.probability;
  if ('notes'             in d) r.notes               = d.notes;
  if ('lostReason'        in d) r.lost_reason         = d.lostReason;
  if ('lostNote'          in d) r.lost_note           = d.lostNote;
  if ('expectedCloseDate' in d) r.expected_close_date = d.expectedCloseDate;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToActivity(r: any): Activity {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    contactId: r.contact_id,
    dealId: r.deal_id,
    notes: r.notes || '',
    date: r.date,
    completed: r.completed || false,
    createdAt: r.created_at,
  };
}

function activityToDb(a: Partial<Activity>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if ('type'      in a) r.type       = a.type;
  if ('title'     in a) r.title      = a.title;
  if ('contactId' in a) r.contact_id = a.contactId;
  if ('dealId'    in a) r.deal_id    = a.dealId;
  if ('notes'     in a) r.notes      = a.notes;
  if ('date'      in a) r.date       = a.date;
  if ('completed' in a) r.completed  = a.completed;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToTask(r: any): Task {
  return {
    id: r.id,
    text: r.text,
    completed: r.completed || false,
    createdAt: r.created_at,
  };
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getContacts', error); return []; }
  return (data || []).map(dbToContact);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
  return data ? dbToContact(data) : undefined;
}

export async function saveContacts(
  contacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<Contact[]> {
  const now = new Date().toISOString();
  const rows = contacts.map(c => ({ ...contactToDb(c as Partial<Contact>), created_at: now }));
  const { data, error } = await supabase.from('contacts').insert(rows).select();
  if (error) { console.error('saveContacts', error); return []; }
  return (data || []).map(dbToContact);
}

export async function saveContact(
  contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...contactToDb(contact as Partial<Contact>), created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return dbToContact(data);
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .update(contactToDb(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateContact', error); return null; }
  return data ? dbToContact(data) : null;
}

export async function deleteContact(id: string): Promise<void> {
  await supabase.from('contacts').delete().eq('id', id);
}

// ── Deals ──────────────────────────────────────────────────────────────────────

export async function getDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getDeals', error); return []; }
  return (data || []).map(dbToDeal);
}

export async function saveDeal(
  deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .insert({ ...dealToDb(deal as Partial<Deal>), created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return dbToDeal(data);
}

export async function updateDeal(
  id: string,
  updates: Partial<Deal>
): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .update(dealToDb(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateDeal', error); return null; }
  return data ? dbToDeal(data) : null;
}

export async function deleteDeal(id: string): Promise<void> {
  await supabase.from('deals').delete().eq('id', id);
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function getActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('date', { ascending: true });
  if (error) { console.error('getActivities', error); return []; }
  return (data || []).map(dbToActivity);
}

export async function saveActivity(
  activity: Omit<Activity, 'id' | 'createdAt'>
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert({ ...activityToDb(activity as Partial<Activity>), created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return dbToActivity(data);
}

export async function updateActivity(
  id: string,
  updates: Partial<Activity>
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .update(activityToDb(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateActivity', error); return null; }
  return data ? dbToActivity(data) : null;
}

export async function deleteActivity(id: string): Promise<void> {
  await supabase.from('activities').delete().eq('id', id);
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getTasks', error); return []; }
  return (data || []).map(dbToTask);
}

export async function saveTask(text: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ text, completed: false, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return dbToTask(data);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  await supabase.from('tasks').update(updates).eq('id', id);
}

export async function deleteTask(id: string): Promise<void> {
  await supabase.from('tasks').delete().eq('id', id);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<CRMSettings> {
  const { data } = await supabase.from('settings').select('*').eq('id', 'default').single();
  if (!data) return DEFAULT_SETTINGS;
  return {
    userName:               data.user_name               ?? DEFAULT_SETTINGS.userName,
    userTitle:              data.user_title              ?? DEFAULT_SETTINGS.userTitle,
    contractStart:          data.contract_start          ?? DEFAULT_SETTINGS.contractStart,
    contractEnd:            data.contract_end            ?? DEFAULT_SETTINGS.contractEnd,
    contractTarget:         data.contract_target         ?? DEFAULT_SETTINGS.contractTarget,
    commissionPerDeal:      data.commission_per_deal     ?? DEFAULT_SETTINGS.commissionPerDeal,
    weeklyTargetDeals:      data.weekly_target_deals     ?? DEFAULT_SETTINGS.weeklyTargetDeals,
    weeklyTargetCommission: data.weekly_target_commission ?? DEFAULT_SETTINGS.weeklyTargetCommission,
  };
}

export async function saveSettings(s: CRMSettings): Promise<void> {
  await supabase.from('settings').upsert({
    id: 'default',
    user_name:               s.userName,
    user_title:              s.userTitle,
    contract_start:          s.contractStart,
    contract_end:            s.contractEnd,
    contract_target:         s.contractTarget,
    commission_per_deal:     s.commissionPerDeal,
    weekly_target_deals:     s.weeklyTargetDeals,
    weekly_target_commission: s.weeklyTargetCommission,
  });
}

// ── Scripts (localStorage – templates locaux) ─────────────────────────────────

const SCRIPTS_KEY = 'thomas-crm-scripts-v1';

export function getScripts(): CRMScripts | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveScripts(s: CRMScripts): void {
  if (typeof window !== 'undefined') localStorage.setItem(SCRIPTS_KEY, JSON.stringify(s));
}
