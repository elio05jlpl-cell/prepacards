// Envoi d'e-mails
// ================
//
// Un seul usage pour l'instant : le lien de reinitialisation du mot de
// passe. Le service passe par Resend, qui s'appelle en une requete HTTP —
// pas de bibliotheque a embarquer dans un Worker.
//
// Tant que la cle n'est pas deposee, « disponible() » rend faux et l'appel
// n'est pas tente. Cela vaut mieux que d'echouer a l'envoi : la route peut
// alors le DIRE a l'eleve au lieu de lui promettre un e-mail qui
// n'arrivera jamais.

const ENVOI = 'https://api.resend.com/emails';

export function disponible(env) {
  return Boolean(env.RESEND_API_KEY && env.COURRIEL_EXPEDITEUR);
}

/** Corps du message. Texte ET html : certains clients n'affichent que l'un. */
export function messageReinitialisation(lien) {
  const texte = [
    'Vous avez demandé à réinitialiser votre mot de passe PrépaCards.',
    '',
    'Ouvrez ce lien pour en choisir un nouveau :',
    lien,
    '',
    'Ce lien est valable une heure et ne fonctionne qu’une fois.',
    '',
    'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message :',
    'votre mot de passe reste inchangé.',
  ].join('\n');

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f4f6fb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<tr><td>
<p style="margin:0 0 18px;font-size:19px;font-weight:700">Réinitialiser votre mot de passe</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#334155">
Vous avez demandé à choisir un nouveau mot de passe pour votre compte PrépaCards.</p>
<p style="margin:0 0 26px">
<a href="${lien}" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">Choisir un nouveau mot de passe</a></p>
<p style="margin:0 0 18px;font-size:13.5px;line-height:1.55;color:#64748b">
Ce lien est valable <strong>une heure</strong> et ne fonctionne qu’une fois.
Si le bouton ne s’ouvre pas, copiez cette adresse :<br>
<span style="word-break:break-all;color:#334155">${lien}</span></p>
<p style="margin:0;font-size:13.5px;line-height:1.55;color:#64748b">
Si vous n’êtes pas à l’origine de cette demande, ignorez ce message :
votre mot de passe reste inchangé.</p>
</td></tr></table>
</td></tr></table></body></html>`;

  return { texte, html };
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
    }),
  });
  if (!reponse.ok) {
    // Le detail part dans les journaux, jamais dans la reponse : il
    // contient l'adresse et de quoi renseigner qui sonde le service.
    const detail = await reponse.text().catch(() => '');
    throw new Error(`Envoi refusé (${reponse.status}) ${detail.slice(0, 200)}`);
  }
  return true;
}
