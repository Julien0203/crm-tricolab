-- ============================================================
--  Thomas CRM — Supabase SQL Schema
--  À coller dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ── contacts ──────────────────────────────────────────────
create table if not exists contacts (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null default '',
  last_name        text not null default '',
  company          text not null default '',
  sector           text not null default 'autre',
  city             text not null default '',
  email            text not null default '',
  phone            text not null default '',
  site_status      text not null default 'inconnu',
  prospect_status  text not null default 'a-appeler',
  week_batch       text,
  call_notes       text not null default '',
  notes            text not null default '',
  source           text default 'appel_froid',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── deals ─────────────────────────────────────────────────
create table if not exists deals (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null default '',
  contact_id          uuid references contacts(id) on delete set null,
  stage               text not null default 'r1',
  value               numeric not null default 1920,
  commission          numeric not null default 156,
  probability         integer not null default 0,
  notes               text not null default '',
  expected_close_date text,
  lost_reason         text,
  lost_note           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── activities ────────────────────────────────────────────
create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'appel',
  title       text not null default '',
  contact_id  uuid references contacts(id) on delete set null,
  deal_id     uuid references deals(id) on delete set null,
  notes       text not null default '',
  date        text not null default '',
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── tasks ─────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  text        text not null default '',
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── settings ──────────────────────────────────────────────
create table if not exists settings (
  id                       text primary key default 'default',
  user_name                text not null default 'Thomas',
  user_title               text not null default 'Commercial',
  contract_start           text not null default '2026-05-26',
  contract_end             text not null default '2026-09-26',
  contract_target          numeric not null default 4992,
  commission_per_deal      numeric not null default 156,
  weekly_target_deals      integer not null default 2,
  weekly_target_commission numeric not null default 312,
  updated_at               timestamptz not null default now()
);

-- Insérer la ligne de settings par défaut
insert into settings (id) values ('default') on conflict (id) do nothing;

-- ── Row Level Security ────────────────────────────────────
-- Activer RLS sur toutes les tables
alter table contacts   enable row level security;
alter table deals      enable row level security;
alter table activities enable row level security;
alter table tasks      enable row level security;
alter table settings   enable row level security;

-- Politique : seuls les utilisateurs connectés (auth.uid() non null) peuvent accéder
create policy "Authenticated users only" on contacts
  for all using (auth.uid() is not null);

create policy "Authenticated users only" on deals
  for all using (auth.uid() is not null);

create policy "Authenticated users only" on activities
  for all using (auth.uid() is not null);

create policy "Authenticated users only" on tasks
  for all using (auth.uid() is not null);

create policy "Authenticated users only" on settings
  for all using (auth.uid() is not null);
