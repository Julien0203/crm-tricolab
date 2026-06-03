'use client';

import { useEffect, useState } from 'react';
import { getDeals, getContacts, saveDeal, updateDeal, deleteDeal } from '@/lib/store';
import { Deal, DealStage, Contact } from '@/lib/types';
import { Plus, X, Trash2, Pencil, GripVertical, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'prospect',      label: 'Prospect',      color: '#64748b' },
  { id: 'qualification', label: 'Qualification',  color: '#3b82f6' },
  { id: 'proposition',   label: 'Proposition',    color: '#f59e0b' },
  { id: 'negociation',   label: 'Négociation',    color: '#8b5cf6' },
  { id: 'gagne',         label: 'Gagné',          color: '#22c55e' },
  { id: 'perdu',         label: 'Perdu',          color: '#ef4444' },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type FormData = {
  title: string; contactId: string; stage: DealStage; value: number;
  probability: number; notes: string; expectedCloseDate: string;
};
const emptyForm: FormData = { title: '', contactId: '', stage: 'prospect', value: 0, probability: 20, notes: '', expectedCloseDate: '' };

function DealCard({ deal, contact, onEdit, onDelete, onStageChange }: {
  deal: Deal; contact?: Contact; onEdit: () => void; onDelete: () => void;
  onStageChange: (stage: DealStage) => void;
}) {
  const stage = STAGES.find(s => s.id === deal.stage)!;
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('dealId', deal.id); }}
      style={{
        background: '#0f1117',
        border: '1px solid #1e2740',
        borderRadius: 10,
        padding: '14px 14px',
        marginBottom: 8,
        cursor: 'grab',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{deal.title}</div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ padding: 4, borderRadius: 5, background: '#1e2740', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={11} /></button>
          <button onClick={onDelete} style={{ padding: 4, borderRadius: 5, background: '#1e2740', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={11} /></button>
        </div>
      </div>
      {contact && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
          {contact.firstName} {contact.lastName} · {contact.company}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{formatCurrency(deal.value)}</div>
        <div style={{ fontSize: 11, color: stage.color, fontWeight: 600 }}>{deal.probability}%</div>
      </div>
      {deal.expectedCloseDate && (
        <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
          Clôture : {format(new Date(deal.expectedCloseDate), 'd MMM', { locale: fr })}
        </div>
      )}
      {/* Quick stage change */}
      <div style={{ marginTop: 10, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {STAGES.filter(s => s.id !== deal.stage).slice(0, 3).map(s => (
          <button key={s.id} onClick={() => onStageChange(s.id)} style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${s.color}15`,
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

  const reload = () => { setDeals(getDeals()); setContacts(getContacts()); };
  useEffect(() => { reload(); }, []);

  function openNew(stage: DealStage = 'prospect') {
    setEditing(null);
    setForm({ ...emptyForm, stage });
    setShowModal(true);
  }
  function openEdit(deal: Deal) {
    setEditing(deal);
    setForm({ title: deal.title, contactId: deal.contactId, stage: deal.stage, value: deal.value, probability: deal.probability, notes: deal.notes, expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '' });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const data = { ...form, expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : '' };
    if (editing) updateDeal(editing.id, data);
    else saveDeal(data);
    reload(); setShowModal(false);
  }

  function handleDrop(e: React.DragEvent, stage: DealStage) {
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) { updateDeal(dealId, { stage }); reload(); }
    setDragOverStage(null);
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a3550', background: '#0f1117', color: '#f1f5f9', fontSize: 14, outline: 'none' };

  const totalPipeline = deals.filter(d => d.stage !== 'gagne' && d.stage !== 'perdu').reduce((s, d) => s + d.value, 0);
  const totalGagne = deals.filter(d => d.stage === 'gagne').reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Pipeline</h1>
          <p style={{ color: '#64748b', margin: '2px 0 0', fontSize: 13 }}>
            Pipeline actif : {formatCurrency(totalPipeline)} · Gagné : {formatCurrency(totalGagne)}
          </p>
        </div>
        <button onClick={() => openNew()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Plus size={16} /> Nouveau deal
        </button>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, overflowX: 'auto' }}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.id);
          const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => handleDrop(e, stage.id)}
              style={{
                background: isOver ? '#1a1f2e' : '#13161f',
                border: `1px solid ${isOver ? stage.color + '60' : '#1e2740'}`,
                borderRadius: 12,
                padding: '14px 12px',
                minHeight: 400,
                transition: 'all 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{stage.label}</span>
                    <span style={{ fontSize: 11, color: '#64748b', background: '#1e2740', borderRadius: 20, padding: '1px 7px' }}>{stageDeals.length}</span>
                  </div>
                  <button onClick={() => openNew(stage.id)} style={{ padding: 3, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569' }}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{formatCurrency(stageTotal)}</div>
              </div>

              {/* Cards */}
              {stageDeals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  contact={contacts.find(c => c.id === deal.contactId)}
                  onEdit={() => openEdit(deal)}
                  onDelete={() => { deleteDeal(deal.id); reload(); }}
                  onStageChange={s => { updateDeal(deal.id, { stage: s }); reload(); }}
                />
              ))}

              {stageDeals.length === 0 && (
                <div style={{ border: '1px dashed #1e2740', borderRadius: 10, padding: '20px 12px', textAlign: 'center', color: '#334155', fontSize: 12 }}>
                  Glisser ici
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#13161f', border: '1px solid #1e2740', borderRadius: 16, padding: '28px', width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editing ? 'Modifier le deal' : 'Nouveau deal'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: '#1e2740', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: 6 }}><X size={15} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Titre *</label>
              <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Contrat annuel XYZ" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Contact</label>
              <select style={{ ...inp }} value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.company})</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Valeur (€)</label>
                <input style={inp} type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Probabilité (%)</label>
                <input style={inp} type="number" min={0} max={100} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Étape</label>
                <select style={{ ...inp }} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Date de clôture</label>
                <input style={inp} type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, background: '#1e2740', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {editing ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
