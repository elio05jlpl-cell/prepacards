// Verification de la route de paiement et de la regle d'essai.
//
// Usage :  node source/worker/_test_paiement.mjs

import { ouvrirPaiement, parametresSession } from './paiement.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const JOUR = 24 * 3600 * 1000;
const maintenant = Date.parse('2026-11-10T12:00:00Z');

console.log('--- Parametres de la session ---');
let p = parametresSession({
  prix: 'price_m', reference: 'pc_abc', email: 'a@b.fr',
  essaiFin: new Date(maintenant + 20 * JOUR).toISOString(), maintenant,
});
verifier(p.get('subscription_data[trial_end]') === String(Math.floor((maintenant + 20 * JOUR) / 1000)),
         "essai en cours : l'abonnement demarre a la fin de l'essai, aucun jour perdu");
verifier(p.get('client_reference_id') === 'pc_abc', 'la reference du compte est transmise a Stripe');
verifier(p.get('line_items[0][price]') === 'price_m', "l'offre choisie est le prix envoye");
verifier(p.get('mode') === 'subscription', 'mode abonnement');

p = parametresSession({
  prix: 'price_m', reference: 'pc_abc', email: '',
  essaiFin: new Date(maintenant - 2 * JOUR).toISOString(), maintenant,
});
verifier(!p.has('subscription_data[trial_end]'), 'essai termine : paiement immediat, pas de nouvel essai');
verifier(!p.has('customer_email'), "pas d'adresse : le champ n'est pas envoye");

p = parametresSession({
  prix: 'price_m', reference: 'pc_abc', email: '',
  essaiFin: new Date(maintenant + 1 * JOUR).toISOString(), maintenant,
});
verifier(!p.has('subscription_data[trial_end]'),
         "moins de 48 h d'essai : Stripe refuserait, on facture tout de suite");

p = parametresSession({ prix: 'price_m', reference: 'pc_abc', email: '', essaiFin: null, maintenant });
verifier(!p.has('subscription_data[trial_end]'), "pas d'essai connu : pas de trial_end");

console.log('\n--- La route ---');
const ENV = {
  SUPABASE_URL: 'https://exemple.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv',
  STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRIX_MENSUEL: 'price_m', STRIPE_PRIX_ANNUEL: 'price_a',
};
const appels = [];
let utilisateurValide = true;
globalThis.fetch = async (url, options = {}) => {
  appels.push({ url, options });
  if (url.includes('/auth/v1/user')) {
    return utilisateurValide
      ? new Response(JSON.stringify({ id: 'u1', email: 'eleve@exemple.fr' }), { status: 200 })
      : new Response('{}', { status: 401 });
  }
  if (url.includes('/rest/v1/profiles')) {
    return new Response(JSON.stringify([{
      reference: 'pc_ref', client_stripe: null,
      essai_fin: new Date(Date.now() + 10 * JOUR).toISOString(),
    }]), { status: 200 });
  }
  if (url.startsWith('https://api.stripe.com')) {
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/xyz' }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
};
function requete(corps, jeton = 'jeton') {
  return new Request('https://prepacards.fr/api/paiement', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    body: JSON.stringify(corps),
  });
}

let r = await ouvrirPaiement(requete({ offre: 'annuel' }), { ...ENV, STRIPE_SECRET_KEY: '' });
verifier(r.status === 503, 'non configure : 503, et l\'application retombe sur le lien');

r = await ouvrirPaiement(requete({ offre: 'annuel' }, ''), ENV);
verifier(r.status === 401, 'sans jeton : 401');

r = await ouvrirPaiement(requete({ offre: 'annuel' }), ENV);
const donnees = await r.json();
verifier(r.status === 200 && donnees.url.startsWith('https://checkout.stripe.com/'), 'une adresse de paiement est rendue');
const appelStripe = appels.find((a) => a.url.startsWith('https://api.stripe.com'));
verifier(appelStripe.options.body.includes('price_a'), "l'offre annuelle envoie le prix annuel");
verifier(appelStripe.options.body.includes('trial_end'), "l'essai restant est reporte sur l'abonnement");
verifier(appelStripe.options.headers.authorization === 'Bearer sk_test', 'la cle secrete reste cote serveur');
verifier(!JSON.stringify(donnees).includes('sk_test'), 'et ne sort jamais dans la reponse');

r = await ouvrirPaiement(requete({ offre: 'nimportequoi' }), ENV);
verifier((await r.json()).url !== undefined
         && appels.at(-1).options.body.includes('price_m'),
         'une offre inconnue retombe sur le mensuel');

console.log('\n' + '='.repeat(60));
if (echecs) {
  console.log(`${echecs} ECHEC(S)`);
  process.exit(1);
}
console.log('Tous les controles passent.');
