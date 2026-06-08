'use client';

import { useState, useEffect } from 'react';
import { getScripts, saveScripts } from '@/lib/store';
import { CRMScripts, ScriptBlock } from '@/lib/types';
import { ChevronDown, ChevronUp, Pencil, Check, BookOpen, Phone, MessageSquare, Mail } from 'lucide-react';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
};

const DEFAULT_SCRIPTS: CRMScripts = {
  r1: [
    {
      id: 'r1-accroche',
      title: 'Accroche — 10 secondes',
      content: `"Bonjour [Prénom], c'est Thomas de Tricolab. J'espère que je ne vous dérange pas ? Je vous appelle car vous êtes dans notre zone de prospection ce mois-ci — j'avais juste une question rapide sur votre présence en ligne."

→ Attendre la réponse. Ne pas enchaîner directement.
→ Si occupé : "Vous avez 2 minutes ou je rappelle à un meilleur moment ?"`,
    },
    {
      id: 'r1-decouverte',
      title: 'Questions découverte',
      content: `"Vous avez actuellement un site internet pour [Entreprise] ?"

Si oui :
  → "Il date de quand à peu près ? Vous en êtes content — il vous amène des clients ?"
  → "C'est un prestataire qui l'a fait ou vous même ?"

Si non :
  → "Vous y avez réfléchi ? Qu'est-ce qui vous a retenu jusqu'ici ?"

Suite :
"C'est quoi votre canal principal pour trouver de nouveaux clients aujourd'hui ?"
"Vous avez déjà eu un mauvais vécu avec un prestataire web ?"

→ Écouter activement. Reformuler. NE PAS pitcher tant que le besoin n'est pas confirmé.`,
    },
    {
      id: 'r1-pitch',
      title: 'Pitch Tricolab',
      content: `À utiliser uniquement si besoin confirmé (site absent, vieux, ou insatisfaisant) :

"Chez Tricolab, on fait des sites vitrine clés en main pour les artisans et PME locales — design moderne, mobile-first, optimisé Google Maps. Délai : 3 semaines. Prix fixe, sans surprise.

On a déjà accompagné des [secteur] dans votre région — je peux vous montrer des exemples concrets."

Points forts à adapter selon le profil :
• Artisan / Bâtiment → "devis en ligne, photos chantiers, fiche Google"
• Profession libérale → "prise de RDV, présentation cabinet, confiance patient"
• Restauration → "menu, horaires, réservation, Google Maps"
• Commerce → "vitrine produits, horaires, promotions"`,
    },
    {
      id: 'r1-closing',
      title: 'Closing R1 — Fixer le R2',
      content: `"Est-ce que vous seriez disponible [jour] ou [jour] de cette semaine pour un échange de 20 minutes ? Je vous montrerai des exemples de réalisations dans votre secteur et on regarde ensemble si ça peut coller pour [Entreprise]."

Si hésitation :
  → "Ce n'est pas un engagement — c'est juste pour que vous puissiez évaluer sur des bases concrètes."

Confirmer :
  → "Super, je note [jour] à [heure]. Je vous rappelle à ce moment-là — vous recevrez un SMS de confirmation."

À noter dans le CRM : date R2, besoin principal, niveau d'intérêt (1-5).`,
    },
  ],
  r2: [
    {
      id: 'r2-rappel',
      title: 'Rappel contexte',
      content: `"Bonjour [Prénom], c'est Thomas de Tricolab — on avait échangé [jour dernier]. Vous aviez le temps ?"

Rappel contexte :
"Vous m'aviez dit que [recap : site vieux / pas de site / insatisfait]. J'ai préparé quelques exemples de réalisations dans votre secteur pour cet appel."

→ Montrer que vous avez retenu l'essentiel. Ça crédibilise.
→ Si R2 planifié après envoi de visuels : "Vous avez eu l'occasion de jeter un œil à ce que je vous avais envoyé ?"`,
    },
    {
      id: 'r2-offre',
      title: "Présentation de l'offre",
      content: `Pack site vitrine Tricolab :
• 5 pages sur-mesure (Accueil, Services, À propos, Galerie/Photos, Contact)
• Design mobile-first — 60% des visites se font sur mobile
• SEO local optimisé (Google Maps, mots-clés métier + ville)
• Hébergement + maintenance inclus 1 an
• Mise en ligne en 3 semaines après validation

Prix : 780€ HT (création) + abonnement maintenance si souhaité

"Ce qu'on vise ensemble, c'est qu'un prospect qui vous cherche sur Google tombe sur un site qui donne envie d'appeler — pas de fuir."`,
    },
    {
      id: 'r2-valeur',
      title: 'Ancrage valeur',
      content: `"Un seul nouveau client via votre site, c'est déjà rentabilisé. Et nos clients constatent en moyenne +30% de demandes de devis dans les 3 premiers mois."

Selon le secteur :
• Artisan → "Un chantier supplémentaire par mois grâce au site, ça change tout en fin d'année."
• Profession libérale → "Un nouveau patient ou client par semaine — c'est le résultat qu'on vise."
• Restauration → "Plus de couverts le week-end, des réservations directes sans commission."

→ Ne pas argumenter sur le prix. Argumenter sur la valeur.`,
    },
    {
      id: 'r2-closing',
      title: 'Closing R2',
      content: `"Alors, vous vous voyez lancer ça sur les prochaines semaines ?"

Si oui → "Parfait. Il me faut votre accord pour que j'envoie le devis formel ce soir — et on peut démarrer dès lundi."

Si hésitation → "Qu'est-ce qui vous retient encore ?"
  → Écouter, traiter l'objection, ne pas presser.
  → "Vous avez besoin de combien de temps pour décider ?"

Ne jamais couper court. Laisser parler.

Relance si pas de retour : J+3, J+7, J+14 (email + appel).`,
    },
  ],
  objections: [
    {
      id: 'obj-prestataire',
      title: '"J\'ai déjà un prestataire web"',
      content: `"Super, c'est bien d'en avoir un. Vous en êtes content ? Je vous pose la question parce qu'on rencontre souvent des pros coincés sur un site de 2017 que leur ancien prestataire ne suit plus.

Si vous êtes vraiment satisfait — pas de souci, je ne vais pas vous faire perdre du temps. Mais ça prend 2 minutes de comparer."

→ Ne pas attaquer le prestataire actuel. Questionner la satisfaction.`,
    },
    {
      id: 'obj-timing',
      title: '"C\'est pas le bon moment / Je suis trop occupé"',
      content: `"Je comprends tout à fait. C'est quand ça serait un meilleur moment pour vous — dans 2 semaines, un mois ?"

→ Obtenir une date précise. Sinon c'est un refus poli.

"Je note dans mon agenda et je vous rappelle exactement à cette date — comme ça vous ne perdez pas de temps aujourd'hui."

→ Si vraiment pas intéressé, ne pas insister. Mettre en "À rappeler" dans le CRM.`,
    },
    {
      id: 'obj-prix',
      title: '"C\'est trop cher"',
      content: `"Je comprends la réaction. C'est quoi trop cher pour vous — vous aviez un budget en tête ?"

→ Ne pas défendre le prix immédiatement. Comprendre d'abord.

"Je vous pose la question parce que selon votre situation on peut peut-être adapter la formule. Et je le redis : un seul nouveau client via le site, c'est rentabilisé."

Si objection persiste :
"Vous préférez un devis formalisé pour avoir le chiffre noir sur blanc ? Comme ça vous comparez avec votre situation actuelle."`,
    },
    {
      id: 'obj-associe',
      title: '"Je dois en parler à mon associé / conjoint / comptable"',
      content: `"Bien sûr, c'est tout à fait normal pour une décision comme ça. Vous en parlez quand — ce soir, demain ?"

→ Toujours obtenir une date.

"Je rappelle jeudi ou vendredi pour avoir votre retour ?"

→ Si vous sentez que c'est une esquive : "Est-ce qu'il y a un point qui vous freine personnellement, indépendamment de ça ?"`,
    },
    {
      id: 'obj-commerciaux',
      title: '"Je reçois des commerciaux toute la journée"',
      content: `"Vous avez raison d'être sélectif — je comprends. La différence avec Tricolab c'est qu'on est ultra-spécialisé artisans et PME locales, pas un généraliste qui vend de tout.

Une seule question : votre site actuel vous ramène des clients aujourd'hui ?"

→ Si non ou "je sais pas" → enchaîner sur la découverte.
→ Si oui et satisfait → "Pas de souci, je ne vous retiens pas."`,
    },
    {
      id: 'obj-mauvaise-exp',
      title: '"J\'ai déjà essayé, ça n\'a rien donné"',
      content: `"C'est dommage d'entendre ça — et c'est malheureusement fréquent. C'était quel type de prestataire ?"

→ Laisser raconter. Identifier l'erreur passée (SEO raté, design générique, abandon après livraison...).

"Ce que vous décrivez, c'est exactement ce qu'on essaie d'éviter. Notre process inclut [ce qui a manqué]. Je peux vous montrer un exemple dans votre secteur pour que vous jugiez vous-même."`,
    },
  ],
  emails: [
    {
      id: 'email-relance-r1',
      title: 'Relance post-R1',
      content: `Objet : Suite à notre échange de ce matin — [Entreprise]

Bonjour [Prénom],

Merci pour notre échange de ce matin. Comme évoqué, je vous partage quelques exemples de réalisations Tricolab dans votre secteur :

→ [Lien portfolio ou exemples]

N'hésitez pas à me poser des questions. On se rappelle bien [jour] à [heure] ?

Bonne journée,
Thomas
Tricolab — Création de sites vitrine pour artisans & PME
06 XX XX XX XX`,
    },
    {
      id: 'email-devis',
      title: 'Envoi de devis',
      content: `Objet : Votre devis Tricolab — Site vitrine [Entreprise]

Bonjour [Prénom],

Comme convenu, veuillez trouver ci-joint votre devis pour la création de votre site vitrine.

En résumé :
• Site vitrine 5 pages sur-mesure
• SEO local + Google Maps
• Hébergement + maintenance inclus 1 an
• Livraison en 3 semaines après validation

Montant : 780€ HT

Je reste disponible pour en discuter, n'hésitez pas à m'appeler directement.

Bonne journée,
Thomas
06 XX XX XX XX`,
    },
    {
      id: 'email-relance-devis',
      title: 'Relance devis J+7',
      content: `Objet : Votre projet de site — avez-vous pu y réfléchir ?

Bonjour [Prénom],

Je me permets de revenir vers vous concernant votre devis envoyé la semaine dernière.

Avez-vous eu l'occasion d'en prendre connaissance ? Y a-t-il des questions ou des ajustements à prévoir ?

Je suis dispo pour un rapide échange si vous le souhaitez — 10 minutes suffisent.

Bonne journée,
Thomas
06 XX XX XX XX`,
    },
    {
      id: 'email-relance-devis-j14',
      title: 'Relance devis J+14 (dernière)',
      content: `Objet : Dernière relance — projet site [Entreprise]

Bonjour [Prénom],

Je me permets de vous recontacter une dernière fois concernant votre projet de site.

Si le timing n'est pas bon, pas de problème — je note de vous rappeler dans quelques mois. Et si vous avez des questions entre-temps, je reste disponible.

Bonne continuation,
Thomas
06 XX XX XX XX`,
    },
  ],
};

type TabKey = keyof CRMScripts;

const TABS: { key: TabKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'r1', label: 'Script R1', icon: <Phone size={14} />, color: '#6366f1' },
  { key: 'r2', label: 'Script R2', icon: <MessageSquare size={14} />, color: '#10b981' },
  { key: 'objections', label: 'Objections', icon: <BookOpen size={14} />, color: '#f59e0b' },
  { key: 'emails', label: 'Emails', icon: <Mail size={14} />, color: '#3b82f6' },
];

function ScriptCard({
  block, color, onUpdate,
}: {
  block: ScriptBlock; color: string; onUpdate: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.content);

  function handleSave() {
    onUpdate(draft);
    setEditing(false);
  }

  return (
    <div style={{ ...glass, borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header */}
      <button
        onClick={() => { setOpen(v => !v); setEditing(false); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          background: open ? `${color}08` : 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'inherit', borderBottom: open ? `1px solid ${color}18` : '1px solid transparent',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: open ? color : 'rgba(60,60,67,0.25)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
          {block.title}
        </span>
        {open ? <ChevronUp size={15} color="rgba(60,60,67,0.40)" /> : <ChevronDown size={15} color="rgba(60,60,67,0.40)" />}
      </button>

      {/* Content */}
      {open && (
        <div style={{ padding: '14px 18px' }}>
          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{
                  width: '100%', minHeight: 200, padding: '10px 12px', fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace', lineHeight: 1.6,
                  color: '#1d1d1f', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.09)',
                  borderRadius: 9, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={handleSave}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    background: color, color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Check size={13} /> Enregistrer
                </button>
                <button
                  onClick={() => { setDraft(block.content); setEditing(false); }}
                  style={{
                    padding: '7px 12px', background: 'transparent', border: '1px solid rgba(0,0,0,0.09)',
                    borderRadius: 8, fontSize: 12, color: 'rgba(60,60,67,0.55)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <pre style={{
                margin: 0, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65,
                color: 'rgba(60,60,67,0.80)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {block.content}
              </pre>
              <button
                onClick={e => { e.stopPropagation(); setEditing(true); setDraft(block.content); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, padding: '6px 11px',
                  background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7,
                  fontSize: 11, color: 'rgba(60,60,67,0.55)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Pencil size={11} /> Modifier
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScriptsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('r1');
  const [scripts, setScripts] = useState<CRMScripts>(DEFAULT_SCRIPTS);

  useEffect(() => {
    const saved = getScripts();
    if (saved) setScripts(saved);
  }, []);

  function updateBlock(tab: TabKey, id: string, content: string) {
    setScripts(prev => {
      const updated = {
        ...prev,
        [tab]: prev[tab].map(b => b.id === id ? { ...b, content } : b),
      };
      saveScripts(updated);
      return updated;
    });
  }

  const tab = TABS.find(t => t.key === activeTab)!;
  const blocks = scripts[activeTab];

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.025em' }}>Scripts</h1>
        <p style={{ color: 'rgba(60,60,67,0.55)', margin: '4px 0 0', fontSize: 13 }}>
          Scripts d'appels, objections et templates email — personnalisables et sauvegardés
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
              borderRadius: 10, border: activeTab === t.key ? `1px solid ${t.color}40` : '1px solid rgba(0,0,0,0.08)',
              background: activeTab === t.key ? `${t.color}12` : 'rgba(255,255,255,0.72)',
              color: activeTab === t.key ? t.color : 'rgba(60,60,67,0.55)',
              fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              backdropFilter: 'blur(10px)',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Note */}
      <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', marginBottom: 14 }}>
        Clique sur un bloc pour le dérouler · Bouton "Modifier" pour personnaliser · Sauvegarde automatique
      </div>

      {/* Blocks */}
      {blocks.map(block => (
        <ScriptCard
          key={block.id}
          block={block}
          color={tab.color}
          onUpdate={content => updateBlock(activeTab, block.id, content)}
        />
      ))}
    </div>
  );
}
