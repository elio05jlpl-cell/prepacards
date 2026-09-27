// Envoi d'e-mails transactionnels (hors connexion)
// ==================================================
//
// La connexion (confirmation d'inscription, mot de passe oublie) est geree
// par Supabase Auth depuis le passage a Supabase - voir les gabarits dans
// courriels/, a coller dans Authentication -> Emails du tableau de bord.
//
// Ce qui reste ici concerne deux moments que Supabase ne peut pas connaitre
// a notre place : la confirmation d'un compte (bienvenue) et la fin d'un
// abonnement (resiliation). Passe par Resend, en une requete HTTP - pas de
// bibliotheque a embarquer dans un Worker.
//
// Tant que la cle n'est pas deposee, disponible() rend faux : les appelants
// avalent l'echec silencieusement (console.error) plutot que de faire
// echouer tout le webhook pour un e-mail secondaire.

const ENVOI = 'https://api.resend.com/emails';

export function disponible(env) {
  return Boolean(env.RESEND_API_KEY && env.COURRIEL_EXPEDITEUR);
}

export async function envoyer(env, destinataire, sujet, corps, recuperer = fetch) {
  if (!disponible(env)) throw new Error('Envoi d’e-mails non configuré.');
  const reponse = await recuperer(ENVOI, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.COURRIEL_EXPEDITEUR,
      to: [destinataire],
      subject: sujet,
      text: corps.texte,
      html: corps.html,
      ...(env.COURRIEL_REPONSE ? { reply_to: [env.COURRIEL_REPONSE] } : {}),
    }),
  });
  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => '');
    throw new Error(`Envoi refusé (${reponse.status}) ${detail.slice(0, 200)}`);
  }
  return true;
}

function enveloppe(interieur) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f4f6fb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<tr><td>${interieur}</td></tr></table>
</td></tr></table></body></html>`;
}

/** Envoye une fois par compte, juste apres la confirmation de l'adresse
 *  (mot de passe : lien suivi ; Google : deja verifiee). Purement
 *  editorial - aucun lien d'action, contrairement aux e-mails Supabase. */
export function messageBienvenue() {
  const texte = [
    'Bienvenue sur PrépaCards !',
    '',
    'Votre compte est prêt. Installez l’application pour créer vos premiers',
    'paquets, ou piochez parmi les 85 paquets gratuits déjà prêts (anglais,',
    'allemand, espagnol, italien, formules de maths) :',
    '',
    'Télécharger : https://prepacards.fr/telecharger/',
    'Paquets gratuits : https://prepacards.fr/decks/',
    '',
    'Vos cartes restent sur votre ordinateur ; le compte ne sert qu’à',
    'retrouver votre abonnement sur une autre machine.',
  ].join('\n');

  const html = enveloppe(`
<p style="margin:0 0 18px;font-size:19px;font-weight:700">Bienvenue sur PrépaCards</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#334155">
Votre compte est prêt. De quoi commencer tout de suite :</p>
<p style="margin:0 0 14px">
<a href="https://prepacards.fr/telecharger/" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">Télécharger l'application</a></p>
<p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#334155">
Ou parcourez d'abord les <a href="https://prepacards.fr/decks/" style="color:#1e3a8a">85 paquets gratuits</a>
(anglais, allemand, espagnol, italien, formules de maths) — aucune inscription
supplémentaire, ils s'ouvrent directement dans l'application.</p>
<p style="margin:0;font-size:13.5px;line-height:1.55;color:#64748b">
Vos cartes restent sur votre ordinateur ; ce compte ne sert qu'à retrouver
votre abonnement sur une autre machine.</p>
`);

  return { texte, html };
}

/** finLe : Date | null. Envoye une fois, quand Stripe confirme que
 *  l'abonnement a reellement pris fin (evenement .deleted, pas un simple
 *  changement de statut) - voir le commentaire pres de son appel. */
export function messageResiliation(finLe) {
  const dateFr = finLe
    ? finLe.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const acces = dateFr && finLe.getTime() > Date.now()
    ? `Vous gardez l’accès à l’offre complète jusqu’au ${dateFr}.`
    : `L’accès à l’offre complète s’arrête à réception de ce message.`;

  const texte = [
    'Votre abonnement PrépaCards a été résilié.',
    '',
    acces,
    '',
    'Vos cartes, vos paquets et votre progression restent sur votre',
    'ordinateur : rien n’est supprimé. La répétition espacée, l’import et',
    'les paquets gratuits continuent de fonctionner sans l’offre complète.',
    '',
    'Un avis, une raison à nous dire ? Répondez simplement à ce message.',
  ].join('\n');

  const html = enveloppe(`
<p style="margin:0 0 18px;font-size:19px;font-weight:700">Abonnement résilié</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#334155">${acces}</p>
<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155">
Vos cartes, vos paquets et votre progression restent sur votre ordinateur :
rien n'est supprimé. La répétition espacée, l'import et les paquets gratuits
continuent de fonctionner sans l'offre complète.</p>
<p style="margin:0;font-size:13.5px;line-height:1.55;color:#64748b">
Un avis, une raison à nous dire ? Répondez simplement à ce message.</p>
`);

  return { texte, html };
}
