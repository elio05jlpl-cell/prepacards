// Verification de la liste d'attente (Mac, iPhone, Android).
//
// Usage :  node source/worker/_test_attente.mjs

import { emailValide, oublierPassages, sInscrire, tropDeDemandes } from './attente.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const ENV = { SUPABASE_URL: 'https://exemple.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'cle-de-test' };
const appels = [];
let statutSupabase = 201;
globalThis.fetch = async (url, options) => {
  appels.push({ url, options });
  return new Response('', { status: statutSupabase });
};

function requete(corps, entetes = {}) {
  return new Request('https://prepacards.fr/api/attente', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://prepacards.fr', ...entetes },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
  });
}
async function appeler(corps, entetes) {
  const r = await sInscrire(requete(corps, entetes), ENV);
  return { statut: r.status, corps: await r.json() };
}

console.log('--- Inscription ---');
oublierPassages();
let r = await appeler({ email: '  Eleve@Exemple.FR ', plateformes: ['Mac', 'android', 'mac'] });
verifier(r.statut === 200 && r.corps.ok === true, 'inscription acceptee');
const envoye = JSON.parse(appels.at(-1).options.body);
verifier(envoye.email === 'eleve@exemple.fr', "adresse normalisee (minuscules, sans espaces)");
verifier(JSON.stringify(envoye.plateformes) === '["mac","android"]', 'systemes dedoublonnes et en minuscules');
verifier(appels.at(-1).options.headers.prefer.includes('ignore-duplicates'),
         "une adresse deja inscrite est ignoree, sans erreur");
verifier(appels.at(-1).options.headers.authorization === 'Bearer cle-de-test',
         'la cle service_role reste cote serveur');
verifier(Object.keys(envoye).sort().join() === 'email,plateformes', "rien d'autre n'est enregistre");

oublierPassages();
console.log('--- Valeurs refusees ---');
r = await appeler({ email: 'nimportequoi', plateformes: ['mac'] });
verifier(r.statut === 400, 'adresse invalide : 400');
r = await appeler({ email: 'eleve@exemple.fr', plateformes: [] });
verifier(r.statut === 400, 'aucun systeme : 400');
r = await appeler({ email: 'eleve@exemple.fr', plateformes: ['linux', '<script>'] });
verifier(r.statut === 400, 'systemes inconnus ignores, donc aucun : 400');
r = await appeler({ email: 'eleve@exemple.fr', plateformes: ['iphone', 'linux'] });
verifier(JSON.parse(appels.at(-1).options.body).plateformes.join() === 'iphone',
         'les systemes inconnus sont retires, les autres gardes');
r = await appeler('{pas du json');
verifier(r.statut === 400, 'corps illisible : 400');
r = await appeler({ email: 'eleve@exemple.fr', plateformes: ['mac'] }, { origin: 'https://autre.example' });
verifier(r.statut === 403, "requete venue d'un autre site : 403");

oublierPassages();
console.log('--- Robots ---');
const avant = appels.length;
r = await appeler({ email: 'robot@exemple.fr', plateformes: ['mac'], site_web: 'http://spam.example' });
verifier(r.statut === 200 && r.corps.ok === true, 'champ piege rempli : reponse « ok »...');
verifier(appels.length === avant, '...mais rien n\'est enregistre');

oublierPassages();
console.log('--- Panne ---');
statutSupabase = 500;
r = await appeler({ email: 'eleve@exemple.fr', plateformes: ['mac'] });
verifier(r.statut === 502 && !JSON.stringify(r.corps).includes('500'), 'Supabase en panne : 502, sans detail');
statutSupabase = 201;

console.log('--- Limitation ---');
oublierPassages();
let bloque = 0;
for (let i = 0; i < 8; i += 1) {
  const x = await sInscrire(requete({ email: `a${i}@exemple.fr`, plateformes: ['mac'] },
    { 'cf-connecting-ip': '203.0.113.7' }), ENV);
  if (x.status === 429) bloque += 1;
}
verifier(bloque === 3, `cinq inscriptions par heure et par IP, les trois suivantes refusees (${bloque})`);
verifier(tropDeDemandes('203.0.113.7', Date.now() + 61 * 60 * 1000) === false,
         'le quota se libere une fois la fenetre ecoulee');
verifier(emailValide('a@b.fr') && !emailValide('a@b'), 'forme de l\'adresse');

console.log();
if (echecs) {
  console.log(`${echecs} echec(s)`);
  process.exit(1);
}
console.log('Tout passe.');
