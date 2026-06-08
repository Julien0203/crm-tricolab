'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/lib/store';
import { CRMSettings, DEFAULT_SETTINGS } from '@/lib/types';
import { Save, RotateCcw, User, FileText, Target, TrendingUp, CheckCircle } from 'lucide-react';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...glass, borderRadius: 16, padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(60,60,67,0.65)', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(60,60,67,0.40)', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  color: '#1d1d1f',
  background: 'rgba(0,0,0,0.03)',
  border: '1px solid rgba(0,0,0,0.09)',
  borderRadius: 9,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export default function ParametresPage() {
  const [form, setForm] = useState<CRMSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(getSettings());
  }, []);

  function set<K extends keyof CRMSettings>(key: K, value: CRMSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    setForm(DEFAULT_SETTINGS);
    setSaved(false);
  }

  const weeklyTargetCommission = form.weeklyTargetDeals * form.commissionPerDeal;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.025em' }}>Paramètres</h1>
        <p style={{ color: 'rgba(60,60,67,0.55)', margin: '4px 0 0', fontSize: 13 }}>
          Personnalise le CRM selon ton contrat et tes objectifs
        </p>
      </div>

      {/* Profil */}
      <Section icon={<User size={16} />} title="Mon profil">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prénom">
            <input
              style={inputStyle}
              value={form.userName}
              onChange={e => set('userName', e.target.value)}
              placeholder="Thomas"
            />
          </Field>
          <Field label="Titre / Poste">
            <input
              style={inputStyle}
              value={form.userTitle}
              onChange={e => set('userTitle', e.target.value)}
              placeholder="Commercial"
            />
          </Field>
        </div>
      </Section>

      {/* Contrat */}
      <Section icon={<FileText size={16} />} title="Contrat Tricolab">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date de début">
            <input
              style={inputStyle}
              type="date"
              value={form.contractStart}
              onChange={e => set('contractStart', e.target.value)}
            />
          </Field>
          <Field label="Date de fin">
            <input
              style={inputStyle}
              type="date"
              value={form.contractEnd}
              onChange={e => set('contractEnd', e.target.value)}
            />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Objectif total commission" hint="€">
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.contractTarget}
              onChange={e => set('contractTarget', Number(e.target.value))}
            />
          </Field>
          <Field label="Commission par deal" hint="€">
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.commissionPerDeal}
              onChange={e => set('commissionPerDeal', Number(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      {/* Objectifs hebdo */}
      <Section icon={<Target size={16} />} title="Objectifs hebdomadaires">
        <Field label="Nombre de ventes par semaine">
          <input
            style={inputStyle}
            type="number"
            min={1}
            max={20}
            value={form.weeklyTargetDeals}
            onChange={e => set('weeklyTargetDeals', Number(e.target.value))}
          />
        </Field>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={14} color="#6366f1" />
            <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 500 }}>
              Objectif commission calculé : {weeklyTargetCommission}€/semaine
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.50)', marginTop: 4 }}>
            {form.weeklyTargetDeals} deal{form.weeklyTargetDeals > 1 ? 's' : ''} × {form.commissionPerDeal}€ = {weeklyTargetCommission}€
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: saved ? '#10b981' : '#6366f1', color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s', fontFamily: 'inherit',
          }}
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
        <button
          onClick={handleReset}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            background: 'transparent', color: 'rgba(60,60,67,0.55)', border: '1px solid rgba(0,0,0,0.09)',
            borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RotateCcw size={14} />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
