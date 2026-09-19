// Verification des briques de securite du Worker.
//
// Elles ne se testent pas a l'usage : un hachage trop faible, une
// comparaison qui fuit, une signature acceptee a tort ne se voient qu'au
// moment de la fuite. On les eprouve donc ici, y compris en essayant de
// les mettre en defaut.
//
// Usage :  node worker/_test_securite.mjs

import {
  ITERATIONS, base64, desBase64, emailPlausible, empreinteJeton,
  hacherMotDePasse, jetonAleatoire, memeSecret, motDePassePlausible,
  normaliserEmail, selAleatoire, signatureStripeValide,
} from './securite.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

console.log('--- Hachage du mot de passe ---');
const sel = selAleatoire();
const a = await hacherMotDePasse('motdepasse1', sel);
const b = await hacherMotDePasse('motdepasse1', sel);
const c = await hacherMotDePasse('motdepasse2', sel);
verifier(a.length === 32, 'empreinte de 256 bits');
verifier(memeSecret(a, b), 'le meme mot de passe donne la meme empreinte');
verifier(!memeSecret(a, c), 'un mot de passe different donne une autre empreinte');

const autreSel = selAleatoire();
const d = await hacherMotDePasse('motdepasse1', autreSel);
verifier(!memeSecret(a, d), 'le sel change l\'empreinte : deux comptes de meme mot de passe different');
verifier(ITERATIONS === 200000, 'meme nombre d\'iterations que l\'application locale');

// Le plafond de Cloudflare : 100 000 iterations par appel, au-dela il leve
// NotSupportedError. Node n'a pas cette limite, si bien que TOUS les
// controles ci-dessus passaient alors que l'inscription echouait en
// production. On surveille donc chaque appel plutot que le resultat.
const vraiDeriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
let plusGrandAppel = 0;
crypto.subtle.deriveBits = (algo, ...reste) => {
  if (algo && algo.name === 'PBKDF2') {
    plusGrandAppel = Math.max(plusGrandAppel, algo.iterations);
  }
  return vraiDeriveBits(algo, ...reste);
};
const enchaine = await hacherMotDePasse('motdepasse1', sel);
verifier(plusGrandAppel <= 100000,
  `aucun appel ne depasse le plafond de Cloudflare (le plus grand : ${plusGrandAppel})`);
verifier(memeSecret(enchaine, a), 'l\'enchainement reste deterministe');

// En dessous du plafond, un seul tour : le resultat doit etre exactement
// celui d'un PBKDF2 ordinaire, sans quoi on ne pourrait plus relire les
// empreintes d'un compte enregistre avec moins d'iterations.
const cle = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode('motdepasse1'), 'PBKDF2', false, ['deriveBits']);
const ordinaire = new Uint8Array(await vraiDeriveBits(
  { name: 'PBKDF2', salt: sel, iterations: 50000, hash: 'SHA-256' }, cle, 256));
verifier(memeSecret(await hacherMotDePasse('motdepasse1', sel, 50000), ordinaire),
  'sous le plafond, identique a un PBKDF2 ordinaire');

crypto.subtle.deriveBits = vraiDeriveBits;

console.log('\n--- Comparaison a duree constante ---');
verifier(memeSecret(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), 'egalite reconnue');
verifier(!memeSecret(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), 'difference finale detectee');
verifier(!memeSecret(new Uint8Array([1, 2, 3]), new Uint8Array([9, 2, 3])), 'difference initiale detectee');
verifier(!memeSecret(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])), 'longueurs differentes refusees');

console.log('\n--- Base64 ---');
const octets = selAleatoire(24);
verifier(memeSecret(desBase64(base64(octets)), octets), 'aller-retour sans perte');

console.log('\n--- Jetons ---');
const jetons = new Set(Array.from({ length: 500 }, () => jetonAleatoire()));
verifier(jetons.size === 500, '500 jetons tires, aucun doublon');
const unJeton = jetonAleatoire();
verifier(!/[+/=]/.test(unJeton), 'jeton utilisable tel quel dans une adresse');
verifier(await empreinteJeton(unJeton) === await empreinteJeton(unJeton), 'empreinte stable');
verifier(await empreinteJeton(unJeton) !== unJeton, 'le jeton n\'est pas stocke en clair');

console.log('\n--- Adresses e-mail ---');
verifier(normaliserEmail('  Elio@Gmail.COM ') === 'elio@gmail.com', 'casse et espaces normalises');
verifier(emailPlausible('a@b.fr'), 'adresse simple acceptee');
verifier(!emailPlausible('pas-une-adresse'), 'adresse sans arobase refusee');
verifier(!emailPlausible('a@b'), 'domaine sans extension refuse');
verifier(!emailPlausible(`${'x'.repeat(250)}@b.fr`), 'adresse demesuree refusee');

console.log('\n--- Mots de passe ---');
verifier(!motDePassePlausible('court'), 'moins de 8 caracteres refuse');
verifier(motDePassePlausible('motdepasse1'), '8 caracteres et plus acceptes');
verifier(!motDePassePlausible('x'.repeat(500)), 'longueur demesuree refusee');
verifier(!motDePassePlausible(null), 'valeur absente refusee');

console.log('\n--- Signature Stripe ---');
const secret = 'whsec_test_1234567890';
const corps = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' });
const t = Math.floor(Date.now() / 1000);

async function signer(charge, quand, cle = secret) {
  const encodeur = new TextEncoder();
  const k = await crypto.subtle.importKey(
    'raw', encodeur.encode(cle), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, encodeur.encode(`${quand}.${charge}`));
  const hex = [...new Uint8Array(sig)].map((o) => o.toString(16).padStart(2, '0')).join('');
  return `t=${quand},v1=${hex}`;
}

verifier(await signatureStripeValide(corps, await signer(corps, t), secret),
         'signature authentique acceptee');
verifier(!await signatureStripeValide(corps, await signer(corps, t, 'mauvais_secret'), secret),
         'signature d\'un autre secret refusee');
verifier(!await signatureStripeValide(`${corps} `, await signer(corps, t), secret),
         'corps modifie apres signature refuse');
verifier(!await signatureStripeValide(corps, await signer(corps, t - 3600), secret),
         'evenement vieux d\'une heure refuse (rejeu impossible)');
verifier(!await signatureStripeValide(corps, null, secret), 'entete absent refuse');
verifier(!await signatureStripeValide(corps, await signer(corps, t), ''),
         'secret non configure : rien ne passe');

console.log('\n' + '='.repeat(56));
if (echecs) {
  console.log(`${echecs} ECHEC(S)`);
  process.exit(1);
}
console.log('Tous les controles passent.');
