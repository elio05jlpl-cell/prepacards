// Briques de securite du Worker
// ==============================
//
// Isolees du routeur parce que ce sont elles qu'il faut pouvoir relire
// seules : une faute ici ne se voit pas a l'usage, elle se voit le jour de
// la fuite.
//
// Le hachage reprend exactement les parametres de l'application locale
// (PBKDF2-HMAC-SHA256, 200 000 iterations) : meme force des deux cotes, et
// rien a reapprendre quand on lit un fichier apres l'autre.

export const ITERATIONS = 200000;

const encodeur = new TextEncoder();

export function base64(octets) {
  return btoa(String.fromCharCode(...new Uint8Array(octets)));
}

export function desBase64(texte) {
  return Uint8Array.from(atob(texte), (c) => c.charCodeAt(0));
}

export async function hacherMotDePasse(motDePasse, sel, iterations = ITERATIONS) {
  const cle = await crypto.subtle.importKey(
    'raw', encodeur.encode(motDePasse), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sel, iterations, hash: 'SHA-256' }, cle, 256);
  return new Uint8Array(bits);
}

// Comparaison a duree constante. Une comparaison naive revele la longueur
// du prefixe correct par le temps qu'elle met a echouer, ce qui suffit a
// reconstruire une empreinte octet par octet.
export function memeSecret(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export function selAleatoire(octets = 16) {
  return crypto.getRandomValues(new Uint8Array(octets));
}

export function jetonAleatoire() {
  // 32 octets : assez pour qu'un jeton ne se devine pas, meme en essayant
  // pendant des annees.
  return base64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function empreinteJeton(jeton) {
  const somme = await crypto.subtle.digest('SHA-256', encodeur.encode(jeton));
  return base64(somme);
}

// L'adresse sert de cle unique : on la normalise avant tout, sinon deux
// comptes coexistent pour une seule boite aux lettres.
export function normaliserEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function emailPlausible(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

// Le mot de passe doit etre verifie ici AUSSI, et pas seulement dans
// l'application : le serveur ne peut pas supposer que la requete vient de
// notre propre client.
export function motDePassePlausible(motDePasse) {
  return typeof motDePasse === 'string'
    && motDePasse.length >= 8 && motDePasse.length <= 200;
}

export function maintenant() {
  return new Date().toISOString();
}

export function dansNJours(n) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

// Verification de la signature d'un evenement Stripe.
//
// Sans elle, n'importe qui pouvant deviner l'adresse du webhook s'offrirait
// un abonnement a vie en envoyant un faux evenement. C'est le point le plus
// sensible de tout le service.
export async function signatureStripeValide(corps, entete, secret) {
  if (!entete || !secret) return false;
  const champs = Object.fromEntries(
    entete.split(',').map((p) => p.split('=').map((s) => s.trim())));
  const horodatage = champs.t;
  const signature = champs.v1;
  if (!horodatage || !signature) return false;

  // Un evenement vieux de plus de cinq minutes est refuse : cela empeche de
  // rejouer indefiniment une requete interceptee.
  const age = Math.abs(Date.now() / 1000 - Number(horodatage));
  if (!Number.isFinite(age) || age > 300) return false;

  const cle = await crypto.subtle.importKey(
    'raw', encodeur.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']);
  const attendu = await crypto.subtle.sign(
    'HMAC', cle, encodeur.encode(`${horodatage}.${corps}`));
  const attenduHex = [...new Uint8Array(attendu)]
    .map((o) => o.toString(16).padStart(2, '0')).join('');
  return memeSecret(encodeur.encode(attenduHex), encodeur.encode(signature));
}
