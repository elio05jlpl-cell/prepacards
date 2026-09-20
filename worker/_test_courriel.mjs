// Envoi d'e-mails : ce qui part vraiment
// =======================================
//
// Un e-mail mal forme ne provoque aucune erreur visible : il part, et
// personne ne le lit. On inspecte donc la requete envoyee au service
// plutot que son resultat.
//
// Usage :  node worker/_test_courriel.mjs

import { disponible, envoyer, messageReinitialisation } from './courriel.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const LIEN = 'https://prepacards.fr/mot-de-passe/#jeton=abc123';

function espion(reponse = { ok: true, text: async () => '' }) {
  const vu = {};
  const faux = async (url, options) => {
    vu.url = url;
    vu.entetes = options.headers;
    vu.corps = JSON.parse(options.body);
    return reponse;
  };
  return { vu, faux };
}

console.log('--- Sans configuration, rien ne part ---');
verifier(!disponible({}), 'aucune cle : indisponible');
verifier(!disponible({ RESEND_API_KEY: 'x' }),
         'cle sans expediteur : indisponible');
verifier(disponible({ RESEND_API_KEY: 'x', COURRIEL_EXPEDITEUR: 'a@b.fr' }),
         'les deux : disponible');

try {
  await envoyer({}, 'e@test.fr', 'Sujet', messageReinitialisation(LIEN));
  verifier(false, 'envoyer sans configuration doit lever');
} catch (e) {
  verifier(true, `envoyer sans configuration leve — ${e.message}`);
}

console.log('\n--- Ce que recoit le service ---');
const env = {
  RESEND_API_KEY: 'cle-de-test',
  COURRIEL_EXPEDITEUR: 'PrépaCards <noreply@prepacards.fr>',
};
let { vu, faux } = espion();
await envoyer(env, 'eleve@test.fr', 'Réinitialiser',
              messageReinitialisation(LIEN), faux);

verifier(vu.corps.from === env.COURRIEL_EXPEDITEUR, 'l’expediteur est le notre');
verifier(Array.isArray(vu.corps.to) && vu.corps.to[0] === 'eleve@test.fr',
         'le destinataire est le bon');
verifier(vu.corps.subject === 'Réinitialiser', 'le sujet passe');
verifier(vu.entetes.authorization === 'Bearer cle-de-test',
         'la cle voyage en en-tete, pas dans l’adresse');

console.log('\n--- Le lien doit etre dans LES DEUX versions ---');
// Certains clients n'affichent que le texte, d'autres que le html. Un lien
// present d'un seul cote laisse la moitie des eleves sans recours.
verifier(vu.corps.text.includes(LIEN), 'present dans la version texte');
verifier(vu.corps.html.includes(LIEN), 'present dans la version html');
verifier((vu.corps.html.match(/abc123/g) || []).length >= 2,
         'et en clair dans le html, pour qui ne peut pas cliquer');

console.log('\n--- Adresse de reponse ---');
verifier(vu.corps.reply_to === undefined,
         'absente tant qu’elle n’est pas configuree');

({ vu, faux } = espion());
await envoyer({ ...env, COURRIEL_REPONSE: 'contact@prepacards.fr' },
              'eleve@test.fr', 'Réinitialiser',
              messageReinitialisation(LIEN), faux);
verifier(vu.corps.reply_to && vu.corps.reply_to[0] === 'contact@prepacards.fr',
         'une reponse a « noreply » arrive chez contact@');

console.log('\n--- Un refus du service ne passe pas inapercu ---');
const { faux: refus } = espion({
  ok: false, status: 422, text: async () => '{"message":"domaine non verifie"}' });
try {
  await envoyer(env, 'eleve@test.fr', 'Sujet', messageReinitialisation(LIEN), refus);
  verifier(false, 'un refus doit lever');
} catch (e) {
  verifier(e.message.includes('422'), `le code est conserve — ${e.message}`);
}

console.log('\n' + '='.repeat(56));
if (echecs) {
  console.log(`${echecs} ECHEC(S).`);
  process.exit(1);
}
console.log('Tous les controles passent.');
