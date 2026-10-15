// Route /api/rapport : ce qu'elle accepte, ce qu'elle jette, ce qu'elle range.
//
// Usage :  node worker/_test_rapport.mjs

import worker from './index.js';
import { normaliserRapport } from './rapport.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const appels = [];
globalThis.fetch = async (url, options) => {
  appels.push({ url: String(url), options });
  return new Response('', { status: 201 });
};

const env = {
  SUPABASE_URL: 'https://exemple.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
};

function post(corps, ip = '7.7.7.7') {
  const texte = typeof corps === 'string' ? corps : JSON.stringify(corps);
  return new Request('https://prepacards.fr/api/rapport', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip,
      'content-length': String(new TextEncoder().encode(texte).length) },
    body: texte,
  });
}

const bon = {
  version: '1.3.1', date_version: '2026-10-10', systeme: 'Windows 11',
  python: '3.12.4', description: 'Plante a l ouverture',
  erreurs: [{ ts: '2026-10-14T10:00:00', version: '1.3.1', type: 'KeyError',
    message: "'deck'", pile: 'Traceback…' }],
  plantage: '',
};

console.log('--- Un rapport valide ---');
let r = await worker.fetch(post(bon), env);
verifier(r.status === 200, `accepte (${r.status})`);
const envoye = appels.at(-1);
verifier(envoye.url.endsWith('/rest/v1/rapports_erreurs'), 'range dans rapports_erreurs');
verifier(envoye.options.headers.authorization === 'Bearer service-secret',
  'avec la cle serveur, jamais exposee');
const ligne = JSON.parse(envoye.options.body);
verifier(ligne.version === '1.3.1' && ligne.contenu.erreurs.length === 1, 'contenu conserve');

console.log('\n--- Ce qui est refuse ---');
verifier((await worker.fetch(post('pas du json'), env)).status === 400, 'JSON illisible : 400');
verifier((await worker.fetch(post({ version: 'x', erreurs: [{}] }), env)).status === 400,
  'version qui n en est pas une : 400');
verifier((await worker.fetch(post({ version: '1.3.1' }), env)).status === 400,
  'rapport vide : 400');
verifier((await worker.fetch(post([1, 2]), env)).status === 400, 'tableau : 400');

console.log('\n--- Ce qui est borne ---');
const enorme = normaliserRapport({ ...bon,
  description: 'x'.repeat(50000),
  erreurs: Array.from({ length: 40 }, () => ({ type: 'E', message: 'm'.repeat(5000),
    pile: 'p'.repeat(50000) })),
  champ_inconnu: 'ne doit pas passer', email: 'a@b.fr' });
verifier(enorme.description.length === 1000, 'description tronquee');
verifier(enorme.erreurs.length === 5, 'cinq erreurs au plus');
verifier(enorme.erreurs[0].pile.length === 3500, 'pile tronquee');
verifier(!('champ_inconnu' in enorme) && !('email' in enorme), 'champs inconnus ignores');

console.log('\n--- Taille et quota ---');
const gros = { ...bon, description: 'y'.repeat(20000) };
verifier((await worker.fetch(post(gros, '6.6.6.6'), env)).status === 413, 'corps de 20 Ko : 413');
let dernier = 0;
for (let i = 0; i < 8; i += 1) dernier = (await worker.fetch(post(bon, '8.8.8.8'), env)).status;
verifier(dernier === 429, `quota par adresse atteint (${dernier})`);

console.log('\n--- Panne du stockage ---');
globalThis.fetch = async () => new Response('boom secret interne', { status: 500 });
r = await worker.fetch(post(bon, '9.9.9.9'), env);
const corps = await r.text();
verifier(r.status === 502 && !corps.includes('secret interne'),
  'erreur sobre, rien de la reponse interne');

console.log('\n' + '='.repeat(56));
if (echecs) { console.log(`${echecs} ECHEC(S).`); process.exit(1); }
console.log('Tous les controles passent.');
