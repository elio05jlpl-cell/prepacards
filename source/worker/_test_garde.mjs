// Garde-fous communs du Worker : taille des corps, quotas, secrets,
// signature Stripe, en-tetes des reponses.
//
// Usage :  node worker/_test_garde.mjs

import worker from './index.js';
import { egalSecret, signatureStripeValide } from './securite.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const env = {
  SUPABASE_URL: 'https://exemple.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  WEBHOOK_SECRET: 'secret-de-webhook',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  ASSETS: { fetch: async () => new Response('page') },
};

function requete(chemin, { methode = 'POST', corps = '{}', entetes = {}, longueur } = {}) {
  const e = { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', ...entetes };
  if (longueur !== undefined) e['content-length'] = String(longueur);
  else if (methode !== 'GET') e['content-length'] = String(new TextEncoder().encode(corps).length);
  return new Request(`https://prepacards.fr${chemin}`, {
    method: methode, headers: e, body: methode === 'GET' ? undefined : corps,
  });
}

console.log('--- Egalite des secrets ---');
verifier(egalSecret('abc', 'abc'), 'deux secrets identiques');
verifier(!egalSecret('abc', 'abd'), 'une difference est refusee');
verifier(!egalSecret('abc', 'abcd'), 'une longueur differente est refusee');
verifier(!egalSecret(null, 'abc') && !egalSecret('abc', undefined), 'un secret absent est refuse');
verifier(!egalSecret('', ''), 'deux secrets vides ne passent pas');

console.log('\n--- Taille des corps ---');
let r = await worker.fetch(requete('/api/prepa', { longueur: 5 * 1024 * 1024 }), env);
verifier(r.status === 413, `5 Mo sur /api/prepa : refuse (${r.status})`);
r = await worker.fetch(requete('/api/scan', { longueur: 20 * 1024 * 1024 }), env);
verifier(r.status === 413, `20 Mo sur /api/scan : refuse (${r.status})`);
const sansLongueur = new Request('https://prepacards.fr/api/prepa', {
  method: 'POST', headers: { 'cf-connecting-ip': '9.9.9.9' }, body: '{}',
});
sansLongueur.headers.delete('content-length');
r = await worker.fetch(sansLongueur, env);
verifier([411, 401, 400].includes(r.status), `sans longueur : pas de traitement du corps (${r.status})`);

console.log('\n--- En-tetes des reponses ---');
r = await worker.fetch(requete('/api/inconnue'), env);
verifier(r.status === 404, 'route inconnue : 404');
verifier(r.headers.get('x-content-type-options') === 'nosniff', 'nosniff present');
verifier(r.headers.get('cache-control') === 'no-store', 'jamais de cache');
const texte = await r.text();
verifier(!/stack|at \w+\.|Error:/.test(texte), 'aucun detail technique dans la reponse');

console.log('\n--- Quota par adresse ---');
let dernier = 0;
for (let i = 0; i < 8; i += 1) {
  const reponse = await worker.fetch(requete('/api/compte/supprimer', {
    entetes: { 'cf-connecting-ip': '5.5.5.5' } }), env);
  dernier = reponse.status;
}
verifier(dernier === 429, `suppression de compte : quota atteint (${dernier})`);

console.log('\n--- Webhook de profil ---');
r = await worker.fetch(requete('/api/webhooks/profil', {
  entetes: { 'x-webhook-secret': 'mauvais' } }), env);
verifier(r.status === 401, 'mauvais secret : 401');
r = await worker.fetch(requete('/api/webhooks/profil'), env);
verifier(r.status === 401, 'sans secret : 401');
r = await worker.fetch(requete('/api/webhooks/profil', { entetes: { 'x-webhook-secret': '' } }),
  { ...env, WEBHOOK_SECRET: '' });
verifier(r.status === 401, 'secret non configure ET en-tete vide : 401');

console.log('\n--- Webhook Stripe ---');
r = await worker.fetch(requete('/api/stripe'), env);
verifier(r.status === 400, 'sans signature : 400');

async function signer(corps, secret, horodatage) {
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(`${horodatage}.${corps}`));
  return [...new Uint8Array(s)].map((o) => o.toString(16).padStart(2, '0')).join('');
}
const maintenant = Math.floor(Date.now() / 1000);
const brut = '{"id":"evt_1"}';
const bonne = await signer(brut, 'whsec_test', maintenant);
verifier(await signatureStripeValide(brut, `t=${maintenant},v1=${bonne}`, 'whsec_test'),
  'signature authentique acceptee');
verifier(await signatureStripeValide(brut, `t=${maintenant},v1=${'0'.repeat(64)},v1=${bonne}`, 'whsec_test'),
  'une signature authentique parmi plusieurs v1 suffit');
verifier(!await signatureStripeValide(brut, `t=${maintenant},v1=${'0'.repeat(64)}`, 'whsec_test'),
  'signature fausse refusee');
verifier(!await signatureStripeValide(brut + ' ', `t=${maintenant},v1=${bonne}`, 'whsec_test'),
  'corps modifie refuse');
const vieux = maintenant - 3600;
verifier(!await signatureStripeValide(brut, `t=${vieux},v1=${await signer(brut, 'whsec_test', vieux)}`, 'whsec_test'),
  'evenement rejoue une heure plus tard refuse');
verifier(!await signatureStripeValide(brut, `t=${maintenant},v1=${bonne}`, ''),
  'secret non configure : refuse');

const corpsInvalide = 'pas du json';
const sig = await signer(corpsInvalide, 'whsec_test', maintenant);
r = await worker.fetch(requete('/api/stripe', {
  corps: corpsInvalide, entetes: { 'stripe-signature': `t=${maintenant},v1=${sig}` } }), env);
verifier(r.status === 400, `corps signe mais illisible : 400 sans plantage (${r.status})`);

console.log('\n' + '='.repeat(56));
if (echecs) {
  console.log(`${echecs} ECHEC(S).`);
  process.exit(1);
}
console.log('Tous les controles passent.');
