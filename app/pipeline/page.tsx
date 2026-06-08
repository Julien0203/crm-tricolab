'use client';

import { useEffect, useState } from 'react';
import { getDeals, getContacts, saveDeal, updateDeal, deleteDeal } from '@/lib/store';
import { Deal, DealStage, Contact, LostReason, LOST_REASON_LABELS, ALL_LOST_REASONS, DEAL_STAGE_LABELS, COMMISSION_PER_DEAL, DEAL_FULL_VALUE } from '@/lib/types';
import { Plus, X, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'r1',           label: 'R1 — 1er appel',  color: 'var(--text-muted)' },
  { id: 'r2',           label: 'R2 — Relance',     color: '#3b82f6' },
  { id: 'devis-envoye', label: 'Devis envoyé',     color: '#f59e0b' },
  { id: 'signe',        label: 'Signé ✓',           color: '#10b981' },
  { id: 'perdu',        label: 'Perdu',             color: '#ef4444' },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type FormData = {
  title: string; contactId: string; stage: DealStage; value: number; commission: number;
  probability: number; notes: string; expectedCloseDate: string;
};
const emptyForm: FormData = {
  title: '', contactId: '', stage: 'r1', value: DEAL_FULL_VALUE, commission: COMMISSION_PER_DEAL,
  probability: 30, notes: '', expectedCloseDate: '',
};

function DealCard({ deal, contact, onEdit, onDelete, onStageChange }: {
  deal: Deal; contact?: Contact; onEdit: () => void; onDelete: () => void;
  onStageChange: (stage: DealStage) => void;
}) {
  const lostLabel = deal.lostReason ? LOST_REASON_LABELS[deal.lostReason] : null;
  const stage = STAGES.find(s => s.id === deal.stage)!;

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('dealId', deal.id); }}
      style={{
        background: deal.stage === 'signe' ? 'rgba(16,185,129,0.08)' : 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${deal.stage === 'signe' ? 'rgba(16,185,129,0.30)' : 'var(--glass-border-med)'}`,
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        borderRadius: 10,
        padding: '12px',
        marginBottom: 8,
        cursor: 'grab',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, paddingRight: 6 }}>{deal.title}</div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ padding: 3, borderRadius: 4, background: 'var(--hover-bg)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={10} /></button>
          <button onClick={onDelete} style={{ padding: 3, borderRadius: 4, background: 'var(--hover-bg)', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={10} /></button>
        </div>
      </div>
      {contact && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {contact.firstName} {contact.lastName} · {contact.city}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: deal.stage === 'signe' ? '#10b981' : 'var(--text-primary)' }}>
            +{deal.commission}€
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>commission</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatCurrency(deal.value)}</div>
          <div style={{ fontSize: 10, color: stage.color, fontWeight: 600 }}>{deal.probability}%</div>
        </div>
      </div>
      {deal.expectedCloseDate && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
          Clôture : {format(new Date(deal.expectedCloseDate), 'd MMM', { locale: fr })}
        </div>
      )}
      {lostLabel && (
        <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4, background: '#ef444415', borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>
          {lostLabel}
        </div>
      )}
      {/* Quick stage change */}
      <div style={{ marginTop: 8, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {(() => {
          const idx = STAGES.findIndex(s => s.id === deal.stage);
          const next = STAGES[idx + 1];
          const shown = new Set<string>();
          const picks: typeof STAGES[0][] = [];
          if (next && next.id !== 'perdu') { picks.push(next); shown.add(next.id); }
          const signe = STAGES.find(s => s.id === 'signe');
          if (signe && !shown.has(signe.id) && deal.stage !== 'signe') { picks.push(signe); shown.add('signe'); }
          const perdu = STAGES.find(s => s.id === 'perdu');
          if (perdu && deal.stage !== 'perdu') { picks.push(perdu); shown.add('perdu'); }
          return picks;
        })().map(s => (
          <button key={s.id} onClick={() => onStageChange(s.id)} style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${s.color}15`,
            color: s.color, border: `1px solid ${s.color}40`, cursor: 'pointer', fontWeight: 600,
          }}>
            → {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [lostModal, setLostModal] = useState<{ dealId: string } | null>(null);
  const [lostForm, setLostForm] = useState<{ lostReason: LostReason | ''; lostNote: string }>({ lostReason: '', lostNote: '' });

  const reload = async () => { setDeals(await getDeals()); setContacts(await getContacts()); };
  useEffect(() => { reload(); }, []);

  function openNew(stage: DealStage = 'r1') {
    setEditing(null);
    setForm({ ...emptyForm, stage });
    setShowModal(true);
  }
  function openEdit(deal: Deal) {
    setEditing(deal);
    setForm({ title: deal.title, contactId: deal.contactId, stage: deal.stage, value: deal.value, commission: deal.commission, probability: deal.probability, notes: deal.notes, expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    const data = { ...form, expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : '' };
    if (editing) await updateDeal(editing.id, data);
    else await saveDeal(data);
    await reload(); setShowModal(false);
  }

  async function requestStageChange(dealId: string, stage: DealStage) {
    if (stage === 'perdu') {
      setLostForm({ lostReason: '', lostNote: '' });
      setLostModal({ dealId });
    } else {
      const prob = stage === 'signe' ? 100 : stage === 'devis-envoye' ? 60 : stage === 'r2' ? 40 : 20;
      await updateDeal(dealId, { stage, probability: prob });
      await reload();
    }
  }

  function handleDrop(e: React.DragEvent, stage: DealStage) {
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) requestStageChange(dealId, stage);
    setDragOverStage(null);
  }

  async function confirmLost() {
    if (!lostModal) return;
    await updateDeal(lostModal.dealId, {
      stage: 'perdu', probability: 0,
      lostReason: lostForm.lostReason || undefined,
      lostNote: lostForm.lostNote || undefined,
    });
    await reload();
    setLostModal(null);
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--input-border)',
    background: 'var(--glass-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  };

  const activeDeals = deals.filter(d => d.stage !== 'signe' && d.stage !== 'perdu');
  const signedDeals = deals.filter(d => d.stage === 'signe');
  const totalCommission = signedDeals.reduce((s, d) => s + d.commission, 0);
  const dealsThisWeek = signedDeals.length; // simplified

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Pipeline</h1>
          <p style={{ color: 'var(--text-muted)', margin: '2px 0 0', fontSize: 12 }}>
            {activeDeals.length} deals actifs · {signedDeals.length} signés · {totalCommission}€ de commission
          </p>
        </div>
        <button onClick={() => openNew()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} /> Nouveau deal
        </button>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, overflowX: 'auto' }}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.id);
          const stageCommission = stageDeals.reduce((s, d) => s + d.commission, 0);
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => handleDrop(e, stage.id)}
              style={{
                background: isOver ? `${stage.color}18` : 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${isOver ? stage.color + '55' : 'var(--glass-border)'}`,
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                borderRadius: 12,
                padding: '12px 10px',
                minHeight: 400,
                transition: 'all 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{stage.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--border-subtle)', borderRadius: 20, padding: '0px 6px' }}>{stageDeals.length}</span>
                  </div>
                  <button onClick={() => openNew(stage.id)} style={{ padding: 2, borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Plus size={13} />
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {stageCommission > 0 ? `${stageCommission}€ com.` : '—'}
                </div>
              </div>

              {/* Cards */}
              {stageDeals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  contact={contacts.find(c => c.id === deal.contactId)}
                  onEdit={() => openEdit(deal)}
                  onDelete={async () => { await deleteDeal(deal.id); await reload(); }}
                  onStageChange={s => requestStageChange(deal.id, s)}
                />
              ))}

              {stageDeals.length === 0 && (
                <div style={{ border: '1px dashed var(--glass-border-med)', borderRadius: 8, padding: '18px 10px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 11 }}>
                  Glisser ici
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lost reason modal */}
      {lostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--glass-bg-solid)', backdropFilter: 'blur(40px)', border: '1px solid rgba(239,68,68,0.30)', boxShadow: 'var(--glass-shadow-lg)', borderRadius: 16, padding: '24px', width: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Marquer comme perdu</h2>
              <button onClick={() => setLostModal(null)} style={{ background: 'var(--hover-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)', padding: 5 }}><X size={13} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Raison de la perte</label>
              <select style={{ ...inp }} value={lostForm.lostReason} onChange={e => setLostForm(f => ({ ...f, lostReason: e.target.value as LostReason | '' }))}>
                <option value="">— Sélectionner —</option>
                {ALL_LOST_REASONS.map(r => <option key={r} value={r}>{LOST_REASON_LABELS[r]}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Note (optionnel)</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={lostForm.lostNote} onChange={e => setLostForm(f => ({ ...f, lostNote: e.target.value }))} placeholder="Objection ou raison précise..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setLostModal(null)} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={confirmLost} style={{ padding: '8px 18px', borderRadius: 7, background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Confirmer la perte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--glass-bg-solid)', backdropFilter: 'blur(40px)', border: '1px solid var(--glass-border-med)', boxShadow: 'var(--glass-shadow-lg)', borderRadius: 16, padding: '24px', width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{editing ? 'Modifier le deal' : 'Nouveau deal'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--hover-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)', padding: 5 }}><X size={13} /></button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Titre *</label>
              <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Site vitrine — Entreprise" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Prospect</label>
              <select style={{ ...inp }} value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.company}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Valeur pack (€)</label>
                <input style={inp} type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Commission (€)</label>
                <input style={inp} type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Étape</label>
                <select style={{ ...inp }} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date de clôture</label>
                <input style={inp} type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={handleSave} style={{ padding: '8px 18px', borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {editing ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
