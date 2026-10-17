// Formulaire de contact
// ======================
//
// Le visiteur ecrit, le message arrive dans la boite de contact par Resend,
// avec son adresse en « repondre a ». Protections, de la plus legere a la
// plus forte :
//
//   - origine : la requete doit venir du site ;
//   - champ piege (« site_web ») : un robot qui le remplit est ecarte sans
//     le savoir ;
//   - Cloudflare Turnstile quand TURNSTILE_SECRET est depose : sans jeton
//     valide, rien ne part ;
//   - un quota par adresse IP (voir index.js) ;
//   - des longueurs bornees, et un sujet purge de tout saut de ligne (on ne
//     laisse jamais un visiteur injecter un en-tete d'e-mail).
//
// Aucun message n'est conserve ici : il part par e-mail, et c'est tout.

import { disponible, envoyer } from './courriel.js';
import { normaliserEmail } from './securite.js';

const MAX_MESSAGE = 4000;
const MIN_MESSAGE = 10;
const MAX_SUJET = 120;
const MAX_NOM = 80;
const URL_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function emailValide(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

const CONTROLES_LIGNE = new RegExp('[\u0000-\u001f\u007f\u2028\u2029]+', 'g');
const CONTROLES_BLOC = new RegExp('[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]', 'g');

/** Une seule ligne, sans caractere de controle, tronquee. */
function ligne(valeur, max) {
  return typeof valeur === 'string'
    ? valeur.replace(CONTROLES_LIGNE, ' ').trim().slice(0, max)
    : '';
}

function bloc(valeur, max) {
  return typeof valeur === 'string'
    ? valeur.replace(CONTROLES_BLOC, '').trim().slice(0, max)
    : '';
}

async function turnstileValide(jeton, ip, env, recuperer) {
  if (typeof jeton !== 'string' || !jeton || jeton.length > 2048) return false;
  const corps = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: jeton });
  if (ip) corps.set('remoteip', ip);
  try {
    const r = await recuperer(URL_TURNSTILE, { method: 'POST', body: corps });
    if (!r.ok) return false;
    const reponse = await r.json();
    return reponse && reponse.success === true;
  } catch (e) {
    console.error('turnstile', e);
    return false;
  }
}

/** POST /api/contact { email, nom?, sujet?, message, site_web, jeton } */
export async function recevoirContact(requete, env, recuperer = fetch) {
  const origine = requete.headers.get('origin');
  if (origine && new URL(requete.url).origin !== origine) {
    return json({ erreur: 'Origine refusée.' }, 403);
  }

  const corps = await requete.json().catch(() => null);
  if (!corps || typeof corps !== 'object') return json({ erreur: 'Demande illisible.' }, 400);

  // Champ piege rempli : on repond « ok » sans rien envoyer.
  if (corps.site_web) return json({ ok: true });

  const email = normaliserEmail(corps.email);
  if (!emailValide(email)) return json({ erreur: 'Adresse e-mail invalide.' }, 400);
  const message = bloc(corps.message, MAX_MESSAGE);
  if (message.length < MIN_MESSAGE) {
    return json({ erreur: 'Votre message est trop court.' }, 400);
  }

  if (env.TURNSTILE_SECRET) {
    const ip = requete.headers.get('cf-connecting-ip') || '';
    if (!await turnstileValide(corps.jeton, ip, env, recuperer)) {
      return json({ erreur: 'Vérification anti-robot échouée. Rechargez la page.' }, 400);
    }
  }

  const destination = env.COURRIEL_CONTACT || env.COURRIEL_REPONSE;
  if (!disponible(env) || !destination) {
    return json({ erreur: 'Le formulaire n’est pas disponible. Écrivez-nous par e-mail.' }, 503);
  }

  const nom = ligne(corps.nom, MAX_NOM);
  const sujet = ligne(corps.sujet, MAX_SUJET) || 'Sans objet';
  const texte = [
    `De : ${nom || '(sans nom)'} <${email}>`,
    `Objet : ${sujet}`,
    '',
    message,
  ].join('\n');

  try {
    await envoyer(env, destination, `[Contact site] ${sujet}`,
      { texte, replyTo: email }, recuperer);
  } catch (e) {
    console.error('contact', e.message);
    return json({ erreur: 'Envoi impossible pour le moment. Réessayez dans un instant.' }, 502);
  }
  return json({ ok: true });
}
