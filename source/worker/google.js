// Connexion par Google (OpenID Connect)
// ======================================
//
// Google ne nous dit pas « cette personne est Untel » : il nous remet un
// jeton signe par lui, qui l'affirme. Tout ce fichier consiste a verifier
// cette signature et ce qu'elle couvre, avant d'en croire un mot.
//
// Ce qui est verifie, et pourquoi chaque point compte :
//
//   - la SIGNATURE du jeton, contre les cles publiques de Google. Sans
//     elle, n'importe qui fabrique un jeton disant ce qu'il veut ;
//   - « aud », qui doit etre NOTRE identifiant client. Un jeton Google
//     valide, mais emis pour une autre application, ouvrirait nos comptes
//     a qui possede cette autre application ;
//   - « iss », qui doit etre Google ;
//   - « exp », la peremption ;
//   - « email_verified ». C'est le plus important : sans lui, quelqu'un
//     pourrait ouvrir un compte Google portant l'adresse d'un tiers et
//     prendre le controle du compte PrepaCards correspondant.
//
// Le rattachement se fait par l'adresse. Une personne qui s'est inscrite
// avec un mot de passe puis revient par Google retrouve SON compte, avec
// son abonnement — c'est le comportement attendu, et cela lui donne du
// meme coup le moyen de revenir quand elle a oublie son mot de passe.

import { base64, jetonAleatoire, memeSecret, normaliserEmail } from './securite.js';

const AUTORISATION = 'https://accounts.google.com/o/oauth2/v2/auth';
const JETONS = 'https://oauth2.googleapis.com/token';
const CLES = 'https://www.googleapis.com/oauth2/v3/certs';
const EMETTEURS = ['accounts.google.com', 'https://accounts.google.com'];

// Duree de vie du va-et-vient vers Google. Dix minutes suffisent largement
// a choisir un compte, et bornent la fenetre pendant laquelle un etat
// intercepte servirait a quelque chose.
const VALIDITE_ETAT = 10 * 60 * 1000;

const encodeur = new TextEncoder();

function base64url(octets) {
  return base64(octets).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desBase64url(texte) {
  const comble = texte.replace(/-/g, '+').replace(/_/g, '/')
    + '==='.slice((texte.length + 3) % 4);
  return Uint8Array.from(atob(comble), (c) => c.charCodeAt(0));
}

export function configure(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

// Adresse de retour FIXE, et non celle de la requete.
//
// Deux raisons. Google n'accepte que des adresses de retour declarees a
// l'avance : construire celle-ci a partir de l'hote appele ferait echouer
// la connexion des que le Worker est atteint autrement que par
// prepacards.fr — et il l'est, par son adresse en workers.dev.
//
// Surtout, cet hote vient d'un en-tete fourni par l'appelant. Le figer
// enleve toute prise sur la destination du retour.
const SITE = 'https://prepacards.fr';

function adresseRetour() {
  return `${SITE}/api/google/retour`;
}

// --- Etat : se proteger d'une connexion declenchee par un tiers ------
//
// Sans cela, un attaquant peut commencer une connexion avec SON compte
// Google et faire aboutir le retour dans le navigateur de quelqu'un
// d'autre, qui se retrouve connecte au compte de l'attaquant sans l'avoir
// demande. L'etat est donc lie au navigateur par un temoin, et signe pour
// qu'il ne soit pas fabricable.

async function signer(valeur, secret) {
  const cle = await crypto.subtle.importKey(
    'raw', encodeur.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', cle, encodeur.encode(valeur)));
}

export async function fabriquerEtat(env, origine) {
  const graine = jetonAleatoire();
  const charge = base64url(encodeur.encode(JSON.stringify({
    g: graine, t: Date.now(), o: origine || 'site',
  })));
  return { etat: `${charge}.${await signer(charge, env.GOOGLE_CLIENT_SECRET)}`, graine };
}

export async function lireEtat(env, etat, graineAttendue) {
  const morceaux = String(etat || '').split('.');
  if (morceaux.length !== 2) return null;
  const attendue = await signer(morceaux[0], env.GOOGLE_CLIENT_SECRET);
  if (!memeSecret(encodeur.encode(attendue), encodeur.encode(morceaux[1]))) {
    return null;
  }
  let charge;
  try {
    charge = JSON.parse(new TextDecoder().decode(desBase64url(morceaux[0])));
  } catch { return null; }
  if (!charge || typeof charge.t !== 'number') return null;
  if (Date.now() - charge.t > VALIDITE_ETAT) return null;
  // Le temoin depose au depart doit correspondre : c'est lui qui prouve
  // que le navigateur qui revient est celui qui est parti.
  if (!graineAttendue
      || !memeSecret(encodeur.encode(String(charge.g)),
                     encodeur.encode(String(graineAttendue)))) {
    return null;
  }
  return charge;
}

export function adresseGoogle(env, url, etat) {
  const cible = new URL(AUTORISATION);
  cible.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  cible.searchParams.set('redirect_uri', adresseRetour());
  cible.searchParams.set('response_type', 'code');
  cible.searchParams.set('scope', 'openid email');
  cible.searchParams.set('state', etat);
  // « select_account » plutot qu'une reconnexion muette : sur un poste
  // partage, se voir connecter au compte du precedent sans rien choisir
  // est la meilleure facon de deposer ses cartes chez quelqu'un d'autre.
  cible.searchParams.set('prompt', 'select_account');
  return cible.toString();
}

// --- Verification du jeton d'identite --------------------------------

let clesEnCache = null;
let clesExpirent = 0;

async function clesDeGoogle(recuperer = fetch) {
  if (clesEnCache && Date.now() < clesExpirent) return clesEnCache;
  const reponse = await recuperer(CLES);
  if (!reponse.ok) throw new Error('Cles Google indisponibles.');
  const donnees = await reponse.json();
  clesEnCache = donnees.keys || [];
  // Google fait tourner ses cles. Une heure de cache evite d'aller les
  // chercher a chaque connexion sans risquer de garder une cle retiree.
  clesExpirent = Date.now() + 3600 * 1000;
  return clesEnCache;
}

export function viderCacheDesCles() {
  clesEnCache = null;
  clesExpirent = 0;
}

export async function verifierJetonIdentite(jeton, clientId, recuperer = fetch) {
  const morceaux = String(jeton || '').split('.');
  if (morceaux.length !== 3) throw new Error('Jeton Google malforme.');

  let entete;
  let charge;
  try {
    entete = JSON.parse(new TextDecoder().decode(desBase64url(morceaux[0])));
    charge = JSON.parse(new TextDecoder().decode(desBase64url(morceaux[1])));
  } catch { throw new Error('Jeton Google illisible.'); }

  if (entete.alg !== 'RS256') throw new Error('Signature Google inattendue.');

  const cles = await clesDeGoogle(recuperer);
  const cle = cles.find((k) => k.kid === entete.kid);
  if (!cle) throw new Error('Cle de signature inconnue.');

  const publique = await crypto.subtle.importKey(
    'jwk', { kty: cle.kty, n: cle.n, e: cle.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valide = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', publique, desBase64url(morceaux[2]),
    encodeur.encode(`${morceaux[0]}.${morceaux[1]}`));
  if (!valide) throw new Error('Signature Google invalide.');

  if (!EMETTEURS.includes(charge.iss)) throw new Error('Emetteur inattendu.');
  // Le controle qui empeche d'ouvrir nos comptes avec un jeton valide emis
  // pour une AUTRE application.
  if (charge.aud !== clientId) throw new Error('Jeton emis pour un autre site.');
  if (!charge.exp || charge.exp * 1000 < Date.now()) {
    throw new Error('Jeton Google perime.');
  }
  // Google renvoie email_verified tantot en booleen, tantot en chaine.
  const verifiee = charge.email_verified === true
    || charge.email_verified === 'true';
  if (!verifiee) throw new Error('Adresse Google non verifiee.');

  const email = normaliserEmail(charge.email || '');
  if (!email) throw new Error('Adresse Google absente.');
  return { email, sub: String(charge.sub || '') };
}

export async function echangerLeCode(env, url, code, recuperer = fetch) {
  const corps = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: adresseRetour(),
    grant_type: 'authorization_code',
  });
  const reponse = await recuperer(JETONS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corps.toString(),
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok || !donnees.id_token) {
    throw new Error('Google a refusé l’échange du code.');
  }
  return donnees.id_token;
}
