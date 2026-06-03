'use client';

import { useEffect, useState } from 'react';
import { getContacts, saveContact, updateContact, deleteContact } from '@/lib/store';
import { Contact, ContactTag } from '@/lib/types';
import { Plus, Search, Phone, Mail, Building2, Pencil, Trash2, X, Check, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TAG_COLORS: Record<ContactTag, { bg: string; text: string }> = {
  client:      { bg: '#22c55e20', text: '#22c55e' },
  prospect:    { bg: '#6366f120', text: '#818cf8' },
  partenaire:  { bg: '#f59e0b20', text: '#fbbf24' },
  fournisseur: { bg: '#3b82f620', text: '#60a5fa' },
  perdu:       { bg: '#ef444420', text: '#f87171' },
};

const TAG_LABELS: Record<ContactTag, string> = {
  client: 'Client',
  prospect: 'Prospect',
  partenaire: 'Partenaire',
  fournisseur: 'Fournisseur',
  perdu: 'Perdu',
};

const ALL_TAGS: ContactTag[] = ['prospect', 'client', 'partenaire', 'fournisseur', 'perdu'];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.5,
      background: `${color}30`, color, fontWeight: 700,
      fontSize: size * 0.38, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, border: `1px solid ${color}40`,
    }}>
      {initials}
    </div>
  );
}

type FormData = {
  firstName: string; lastName: string; company: string;
  email: string; phone: string; tags: ContactTag[]; notes: string;
};

const emptyForm: FormData = { firstName: '', lastName: '', company: '', email: '', phone: '', tags: ['prospect'], notes: '' };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<ContactTag | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [selected, setSelected] = useState<Contact | null>(null);

  const reload = () => setContacts(getContacts());
  useEffect(() => { reload(); }, []);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const match = !q || `${c.firstName} ${c.lastName} ${c.company} ${c.email}`.toLowerCase().includes(q);
    const tag = filterTag === 'all' || c.tags.includes(filterTag);
    return match && tag;
  });

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(c: Contact) { setEditing(c); setForm({ firstName: c.firstName, lastName: c.lastName, company: c.company, email: c.email, phone: c.phone, tags: c.tags, notes: c.notes }); setShowModal(true); }

  function handleSave() {
    if (!form.firstName.trim()) return;
    if (editing) { updateContact(editing.id, form); }
    else { saveContact(form); }
    reload(); setShowModal(false);
  }

  function handleDelete(id: string) {
    deleteContact(id); reload();
    if (selected?.id === id) setSelected(null);
  }

  function toggleTag(tag: ContactTag) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a3550',
    background: '#0f1117', color: '#f1f5f9', fontSize: 14, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 64px)' }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Contacts</h1>
            <p style={{ color: '#64748b', margin: '2px 0 0', fontSize: 13 }}>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <Plus size={16} /> Nouveau contact
          </button>
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inp, paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', ...ALL_TAGS] as const).map(tag => (
              <button key={tag} onClick={() => setFilterTag(tag)} style={{
                padding: '7px 12px', borderRadius: 8, border: '1px solid',
                borderColor: filterTag === tag ? '#6366f1' : '#1e2740',
                background: filterTag === tag ? '#6366f120' : 'transparent',
                color: filterTag === tag ? '#818cf8' : '#64748b',
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}>
                {tag === 'all' ? 'Tous' : TAG_LABELS[tag]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: selected ? 16 : 0 }}>
          {filtered.map(contact => (
            <div key={contact.id} onClick={() => setSelected(selected?.id === contact.id ? null : contact)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                background: selected?.id === contact.id ? '#1e2740' : '#13161f',
                border: `1px solid ${selected?.id === contact.id ? '#334155' : '#1e2740'}`,
                transition: 'all 0.15s',
              }}>
              <Avatar name={`${contact.firstName} ${contact.lastName}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{contact.firstName} {contact.lastName}</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Building2 size={11} /> {contact.company}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {contact.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: TAG_COLORS[tag].bg, color: TAG_COLORS[tag].text }}>
                      {TAG_LABELS[tag]}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>{format(new Date(contact.createdAt), 'd MMM yyyy', { locale: fr })}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(contact)} style={{ padding: 6, borderRadius: 6, background: '#1e2740', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={13} /></button>
                <button onClick={() => handleDelete(contact.id)} style={{ padding: 6, borderRadius: 6, background: '#1e2740', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
              <Users size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              Aucun contact trouvé
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div style={{ width: 320, marginLeft: 20, background: '#13161f', border: '1px solid #1e2740', borderRadius: 14, padding: '24px 20px', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <Avatar name={`${selected.firstName} ${selected.lastName}`} size={52} />
            <button onClick={() => setSelected(null)} style={{ background: '#1e2740', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: 6 }}><X size={15} /></button>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' }}>{selected.firstName} {selected.lastName}</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>{selected.company}</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
            {selected.tags.map(tag => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: TAG_COLORS[tag].bg, color: TAG_COLORS[tag].text }}>
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {selected.email && (
              <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
                <Mail size={15} color="#6366f1" /> {selected.email}
              </a>
            )}
            {selected.phone && (
              <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
                <Phone size={15} color="#6366f1" /> {selected.phone}
              </a>
            )}
          </div>
          {selected.notes && (
            <div style={{ background: '#0f1117', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              {selected.notes}
            </div>
          )}
          <div style={{ marginTop: 20, fontSize: 11, color: '#475569' }}>
            Ajouté le {format(new Date(selected.createdAt), 'd MMMM yyyy', { locale: fr })}
          </div>
          <button onClick={() => openEdit(selected)} style={{ marginTop: 16, width: '100%', padding: '9px', borderRadius: 8, background: '#1e2740', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Modifier
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#13161f', border: '1px solid #1e2740', borderRadius: 16, padding: '28px 28px', width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editing ? 'Modifier' : 'Nouveau contact'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: '#1e2740', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: 6 }}><X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Prénom *</label>
                <input style={inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Thomas" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Nom *</label>
                <input style={inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Société</label>
              <input style={inp} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Entreprise SAS" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Email</label>
                <input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.fr" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Téléphone</label>
                <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="06 XX XX XX XX" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Tags</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ALL_TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)} style={{
                    padding: '5px 11px', borderRadius: 20, border: '1px solid',
                    borderColor: form.tags.includes(tag) ? TAG_COLORS[tag].text : '#1e2740',
                    background: form.tags.includes(tag) ? TAG_COLORS[tag].bg : 'transparent',
                    color: form.tags.includes(tag) ? TAG_COLORS[tag].text : '#64748b',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {form.tags.includes(tag) && <Check size={11} />}
                    {TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes sur ce contact..." />
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

