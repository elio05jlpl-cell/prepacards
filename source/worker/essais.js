// E-mails de l'essai gratuit
// ==========================
//
// Chaque compte a 30 jours d'essai sans carte. Quatre messages jalonnent
// cette periode (voir emails_essai_a_envoyer() dans schema.sql, qui decide QUI
// recoit QUOI aujourd'hui) :
//
//   essai_j1, essai_j7   conseils d'usage    - seulement avec consentement
//   essai_j25            l'essai se termine  - service lie au compte
//   essai_j31            l'essai est termine - service lie au compte
//
// Ce module les envoie, une fois par jour, depuis le declencheur planifie du
// Worker (voir `scheduled` dans index.js et "triggers" dans wrangler.jsonc).
//
// Garde-fous :
//   - interrupteur : rien ne part tant que la variable EMAILS_ESSAI n'est pas
//     a « 1 ». On deploie le code, on verifie, PUIS on active ;
//   - chaque envoi est reserve en base AVANT d'etre fait (reserver_email) : un
//     planificateur qui tourne deux fois n'envoie rien deux fois ;
//   - un envoi qui echoue libere sa place : le lendemain retentera ;
//   - au plus MAX_PAR_PASSAGE messages par execution : on ne sature ni Resend
//     ni la limite de requetes du Worker ;
//   - les messages de conseils portent un lien de desinscription signe, et
//     l'en-tete List-Unsubscribe-Post (desinscription en un clic des
//     messageries).

import { disponible, envoyer } from './courriel.js';
import { messageEssai } from './messages-essai.js';
import { egalSecret } from './securite.js';

const MAX_PAR_PASSAGE = 80;
const encodeur = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secretDesinscription(env) {
  return env.DESINSCRIPTION_SECRET || env.WEBHOOK_SECRET || '';
}

/** Signature HMAC-SHA256 de l'identifiant. Un lien de desinscription ne doit
 *  pas permettre de desinscrire quelqu'un d'autre en devinant son
 *  identifiant : il faut le secret pour produire le jeton. */
export async function jetonDesinscription(uid, env) {
  const secret = secretDesinscription(env);
  if (!secret) return '';
  const cle = await crypto.subtle.importKey(
    'raw', encodeur.encode(`desinscription:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cle, encodeur.encode(String(uid)));
  return [...new Uint8Array(signature)]
    .map((o) => o.toString(16).padStart(2, '0')).join('');
}

export async function lienDesinscription(uid, env) {
  const jeton = await jetonDesinscription(uid, env);
  if (!jeton) return '';
  return `https://prepacards.fr/api/desabonner?u=${encodeURIComponent(uid)}&t=${jeton}`;
}

async function rpc(env, nom, corps, recuperer) {
  return recuperer(`${env.SUPABASE_URL}/rest/v1/rpc/${nom}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(corps || {}),
  });
}

/** Execute un passage. Rend un compte rendu ; ne leve jamais, pour qu'une
 *  panne d'e-mail ne fasse pas echouer le planificateur. */
export async function envoyerEmailsEssai(env, recuperer = fetch) {
  const bilan = { actif: false, envoyes: 0, deja: 0, echecs: 0 };
  if (env.EMAILS_ESSAI !== '1') return bilan;
  if (!disponible(env) || !secretDesinscription(env)) {
    console.error('emails essai : envoi non configure (Resend ou secret manquant)');
    return bilan;
  }
  bilan.actif = true;

  let liste;
  try {
    const reponse = await rpc(env, 'emails_essai_a_envoyer', {}, recuperer);
    if (!reponse.ok) {
      console.error('emails essai : liste indisponible', reponse.status);
      return bilan;
    }
    liste = await reponse.json();
  } catch (e) {
    console.error('emails essai : liste', e);
    return bilan;
  }
  if (!Array.isArray(liste)) return bilan;

  for (const ligne of liste.slice(0, MAX_PAR_PASSAGE)) {
    const { uid, adresse, genre, jours, promo } = ligne || {};
    if (!UUID.test(uid || '') || !adresse || !genre) continue;

    let reserve = false;
    try {
      const r = await rpc(env, 'reserver_email', { p_user: uid, p_type: genre }, recuperer);
      reserve = r.ok && (await r.json()) === true;
    } catch (e) {
      console.error('emails essai : reservation', e);
    }
    if (!reserve) {
      bilan.deja += 1;
      continue;
    }

    try {
      const lien = await lienDesinscription(uid, env);
      const message = messageEssai(genre, { jours, lienDesinscription: lien, promo });
      if (!message) throw new Error(`type inconnu : ${genre}`);
      const entetes = promo && lien
        ? { 'List-Unsubscribe': `<${lien}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : null;
      await envoyer(env, adresse, message.sujet, message, recuperer, entetes);
      bilan.envoyes += 1;
    } catch (e) {
      bilan.echecs += 1;
      console.error('emails essai : envoi', genre, e.message);
      try {
        await rpc(env, 'liberer_email', { p_user: uid, p_type: genre }, recuperer);
      } catch (e2) {
        console.error('emails essai : liberation', e2);
      }
    }
  }
  return bilan;
}

// --- Desinscription -------------------------------------------------------

function page(titre, texte, statut) {
  const corps = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${titre}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;color:#0f172a">
<h1 style="font-size:22px">${titre}</h1><p style="font-size:16px;line-height:1.6;color:#334155">${texte}</p>
<p><a href="https://prepacards.fr/" style="color:#1e3a8a">Retour au site</a></p></body></html>`;
  return new Response(corps, {
    status: statut,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
      'referrer-policy': 'no-referrer',
    },
  });
}

/** GET ou POST /api/desabonner?u=<uid>&t=<jeton>. Le POST sert la
 *  desinscription en un clic des messageries (RFC 8058). */
export async function desabonner(requete, env, recuperer = fetch) {
  const url = new URL(requete.url);
  const uid = url.searchParams.get('u') || '';
  const jeton = url.searchParams.get('t') || '';
  const attendu = UUID.test(uid) ? await jetonDesinscription(uid, env) : '';
  if (!attendu || !egalSecret(jeton, attendu)) {
    return page('Lien invalide', 'Ce lien de désinscription n’est pas valide.', 400);
  }

  const reponse = await recuperer(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ marketing_ok: false }),
    });
  if (!reponse.ok) {
    console.error('desabonner', reponse.status);
    return page('Réessayez', 'La désinscription n’a pas pu être enregistrée. Réessayez dans un instant.', 502);
  }
  return page('Vous êtes désinscrit',
    'Vous ne recevrez plus de conseils d’utilisation. Les messages liés à votre compte (fin d’essai, abonnement) continuent d’être envoyés.',
    200);
}
