// Briques de securite du Worker
// ==============================
//
// Ce qui reste ici, depuis le passage a Supabase Auth : plus rien sur les
// mots de passe, les jetons de session ou Google — Supabase s'en charge,
// avec sa propre securite, testee a bien plus grande echelle que ce que ce
// projet pourrait maintenir seul. Il ne reste que ce que Supabase ne peut
// pas savoir a notre place : verifier qu'un evenement vient vraiment de
// Stripe.

const encodeur = new TextEncoder();

export function maintenant() {
  return new Date().toISOString();
}

// Comparaison a duree constante. Une comparaison naive revele la longueur
// du prefixe correct par le temps qu'elle met a echouer.
function memeSecret(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

// L'adresse sert de cle de rattachement pour Stripe : on la normalise
// avant toute comparaison, sinon deux graphies coexistent pour une seule
// boite aux lettres.
// Egalite a duree constante de deux chaines (secret de webhook, par exemple).
// Faux si l'un des deux est vide : un secret non configure ne doit jamais
// laisser passer une requete qui n'en envoie pas non plus.
export function egalSecret(a, b) {
  if (!a || !b) return false;
  return memeSecret(encodeur.encode(String(a)), encodeur.encode(String(b)));
}

export function normaliserEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Verification de la signature d'un evenement Stripe.
//
// Sans elle, n'importe qui pouvant deviner l'adresse du webhook s'offrirait
// un abonnement a vie en envoyant un faux evenement. C'est le point le plus
// sensible de tout ce qui reste dans ce Worker.
export async function signatureStripeValide(corps, entete, secret) {
  if (!entete || !secret) return false;
  // Stripe peut joindre plusieurs signatures v1 (rotation du secret) : l'une
  // d'elles suffit.
  const morceaux = entete.split(',').map((p) => p.split('=').map((s) => s.trim()));
  const horodatage = (morceaux.find(([k]) => k === 't') || [])[1];
  const signatures = morceaux.filter(([k, v]) => k === 'v1' && v).map(([, v]) => v);
  if (!horodatage || !signatures.length) return false;

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
  return signatures.some((s) => memeSecret(encodeur.encode(attenduHex), encodeur.encode(s)));
}
