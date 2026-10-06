// Verification de la route « un compte existe-t-il pour cette adresse ? ».
//
// Usage :  node source/worker/_test_existence.mjs

import { compteExiste, emailValide, oublierPassages, tropDeDemandes } from './existence.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const ENV = { SUPABASE_URL: 'https://exemple.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'cle-de-test' };
const appels = [];
let reponseSupabase = { existe: false, mot_de_passe: false, google: false };
let statutSupabase = 200;
globalThis.fetch = async (url, options) => {
  appels.push({ url, options });
  return new Response(JSON.stringify(reponseSupabase), { status: statutSupabase });
};

function requete(corps, entetes = {}) {
  return new Request('https://prepacards.fr/api/compte/existe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://prepacards.fr', ...entetes },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
  });
}

async function appeler(corps, entetes) {
  const r = await compteExiste(requete(corps, entetes), ENV);
  return { statut: r.status, corps: await r.json() };
}

console.log('--- Adresses ---');
verifier(emailValide('eleve@exemple.fr'), 'adresse ordinaire acceptee');
verifier(!emailValide('pas une adresse'), 'texte quelconque refuse');
verifier(!emailValide('a@b'), 'sans domaine refuse');
verifier(!emailValide('a'.repeat(300) + '@exemple.fr'), 'trop longue refusee');

console.log('--- Reponses ---');
oublierPassages();
let r = await appeler({ email: '  Eleve@Exemple.FR ' });
verifier(r.statut === 200 && r.corps.existe === false, 'aucun compte : existe = false');
verifier(JSON.parse(appels.at(-1).options.body).p_email === 'eleve@exemple.fr',
         "l'adresse est normalisee (minuscules, sans espaces) avant la requete");
verifier(appels.at(-1).options.headers.authorization === 'Bearer cle-de-test',
         'la cle service_role est utilisee cote serveur');

reponseSupabase = { existe: true, mot_de_passe: true, google: false };
r = await appeler({ email: 'eleve@exemple.fr' });
verifier(r.corps.existe && r.corps.mot_de_passe && !r.corps.google, 'compte avec mot de passe');

reponseSupabase = { existe: true, mot_de_passe: false, google: true };
r = await appeler({ email: 'eleve@exemple.fr' });
verifier(r.corps.existe && !r.corps.mot_de_passe && r.corps.google, 'compte Google seul');

reponseSupabase = { existe: true, mot_de_passe: true, google: true, id: 'secret', email: 'x' };
r = await appeler({ email: 'eleve@exemple.fr' });
verifier(JSON.stringify(Object.keys(r.corps).sort()) === '["existe","google","mot_de_passe"]',
         "la reponse ne contient que trois booleens, rien d'autre");

console.log('--- Refus ---');
r = await appeler({ email: 'nimportequoi' });
verifier(r.statut === 400, 'adresse invalide : 400');
r = await appeler('{pas du json');
verifier(r.statut === 400, 'corps illisible : 400');
r = await appeler({ email: 'eleve@exemple.fr' }, { origin: 'https://autre-site.example' });
verifier(r.statut === 403, "requete venue d'un autre site : 403");

statutSupabase = 500;
r = await appeler({ email: 'eleve@exemple.fr' });
verifier(r.statut === 502, 'Supabase en panne : 502, sans detail');
statutSupabase = 200;

console.log('--- Limitation ---');
oublierPassages();
let bloque = 0;
for (let i = 0; i < 25; i += 1) {
  const x = await compteExiste(requete({ email: 'eleve@exemple.fr' }, { 'cf-connecting-ip': '203.0.113.9' }), ENV);
  if (x.status === 429) bloque += 1;
}
verifier(bloque === 5, `vingt demandes passent, les cinq suivantes sont refusees (${bloque})`);
const autre = await compteExiste(requete({ email: 'eleve@exemple.fr' }, { 'cf-connecting-ip': '203.0.113.10' }), ENV);
verifier(autre.status === 200, 'une autre adresse IP reste servie');
verifier(tropDeDemandes('203.0.113.9', Date.now() + 11 * 60 * 1000) === false,
         'le quota se libere une fois la fenetre ecoulee');

console.log();
if (echecs) {
  console.log(`${echecs} echec(s)`);
  process.exit(1);
}
console.log('Tout passe.');
