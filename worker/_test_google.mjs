// Connexion par Google : ce qui doit etre refuse
// ===============================================
//
// On ne peut pas faire parler le vrai Google depuis un test. On fabrique
// donc nos propres cles RSA et on signe de faux jetons avec : c'est
// exactement ce que ferait un attaquant, et c'est la seule facon de
// verifier que le refus a bien lieu.
//
// Ce qui est eprouve ici ne se voit pas a l'usage. Un jeton accepte a tort
// ne provoque aucune erreur visible : il ouvre simplement le compte de
// quelqu'un d'autre.
//
// Usage :  node worker/_test_google.mjs

import {
  fabriquerEtat, lireEtat, verifierJetonIdentite, viderCacheDesCles,
} from './google.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const encodeur = new TextEncoder();
const CLIENT = '123456.apps.googleusercontent.com';

function b64url(octets) {
  return Buffer.from(octets).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Un « Google » de laboratoire ------------------------------------

const paire = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', paire.publicKey);
jwk.kid = 'cle-1';

// Une seconde paire : celle d'un attaquant qui signerait ses propres
// jetons en pretendant etre Google.
const autre = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);

function fauxFetch(reponse) {
  return async () => ({ ok: true, json: async () => reponse });
}
const clesDeGoogle = fauxFetch({ keys: [{ kid: 'cle-1', kty: jwk.kty,
                                          n: jwk.n, e: jwk.e }] });

async function fabriquerJeton(charge, cle = paire.privateKey, entete = {}) {
  const e = b64url(encodeur.encode(JSON.stringify(
    { alg: 'RS256', kid: 'cle-1', ...entete })));
  const c = b64url(encodeur.encode(JSON.stringify(charge)));
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cle, encodeur.encode(`${e}.${c}`));
  return `${e}.${c}.${b64url(signature)}`;
}

function chargeValide(extra = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT,
    sub: '1122334455',
    email: 'Eleve@Gmail.com',
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  };
}

async function refuse(charge, cle, entete, message) {
  viderCacheDesCles();
  const jeton = await fabriquerJeton(charge, cle, entete);
  try {
    await verifierJetonIdentite(jeton, CLIENT, clesDeGoogle);
    verifier(false, message + ' (ACCEPTE A TORT)');
  } catch (e) {
    verifier(true, `${message} — ${e.message}`);
  }
}

console.log('--- Un jeton authentique passe ---');
viderCacheDesCles();
const bon = await verifierJetonIdentite(
  await fabriquerJeton(chargeValide()), CLIENT, clesDeGoogle);
verifier(bon.email === 'eleve@gmail.com',
         `l'adresse est normalisee en minuscules (${bon.email})`);
verifier(bon.sub === '1122334455', 'l’identifiant Google est rendu');

console.log('\n--- Ce qui doit etre refuse ---');
await refuse(chargeValide(), autre.privateKey, {},
             'jeton signe par une autre cle');
await refuse(chargeValide({ aud: 'une-autre-application.apps.googleusercontent.com' }),
             paire.privateKey, {},
             'jeton valide mais emis pour une AUTRE application');
await refuse(chargeValide({ iss: 'https://accounts.evil.example' }),
             paire.privateKey, {}, 'emetteur qui n’est pas Google');
await refuse(chargeValide({ exp: Math.floor(Date.now() / 1000) - 60 }),
             paire.privateKey, {}, 'jeton perime');
await refuse(chargeValide({ email_verified: false }), paire.privateKey, {},
             'adresse Google NON verifiee');
await refuse(chargeValide({ email_verified: undefined }), paire.privateKey, {},
             'email_verified absent');
await refuse(chargeValide(), paire.privateKey, { alg: 'none' },
             'algorithme « none »');
await refuse(chargeValide({ email: '' }), paire.privateKey, {},
             'adresse absente');
await refuse(chargeValide(), paire.privateKey, { kid: 'cle-inconnue' },
             'cle de signature inconnue');

console.log('\n--- email_verified en chaine de caracteres ---');
viderCacheDesCles();
const enChaine = await verifierJetonIdentite(
  await fabriquerJeton(chargeValide({ email_verified: 'true' })),
  CLIENT, clesDeGoogle);
verifier(enChaine.email === 'eleve@gmail.com',
         'Google l’envoie parfois ainsi : accepte');

console.log('\n--- L’etat, contre une connexion declenchee par un tiers ---');
const env = { GOOGLE_CLIENT_ID: CLIENT, GOOGLE_CLIENT_SECRET: 'un-secret' };
const { etat, graine } = await fabriquerEtat(env, 'site');

verifier(await lireEtat(env, etat, graine), 'l’etat revient avec son temoin');
verifier(!await lireEtat(env, etat, 'autre-temoin'),
         'refuse avec le temoin d’un autre navigateur');
verifier(!await lireEtat(env, etat, ''), 'refuse sans temoin');
verifier(!await lireEtat(env, etat + 'x', graine), 'refuse si l’etat est retouche');
verifier(!await lireEtat({ ...env, GOOGLE_CLIENT_SECRET: 'autre' }, etat, graine),
         'refuse un etat signe d’un autre secret');
verifier(!await lireEtat(env, 'nimporte-quoi', graine), 'refuse un etat fabrique');

const vieux = await fabriquerEtat(env, 'site');
const vraiDate = Date.now;
Date.now = () => vraiDate() + 11 * 60 * 1000;
verifier(!await lireEtat(env, vieux.etat, vieux.graine),
         'refuse un etat vieux de onze minutes');
Date.now = vraiDate;

console.log('\n' + '='.repeat(56));
if (echecs) {
  console.log(`${echecs} ECHEC(S).`);
  process.exit(1);
}
console.log('Tous les controles passent.');
