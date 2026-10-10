// Paiement de l'abonnement, apres ou pendant l'essai gratuit
// ==========================================================
//
// Chaque compte recoit 30 jours d'essai a l'inscription, SANS carte bancaire
// (profiles.essai_fin, voir schema.sql). Cette route ouvre le paiement chez
// Stripe en tenant compte de ce qu'il reste de l'essai :
//
//   - essai encore en cours : l'abonnement demarre avec « trial_end » egal a
//     la fin de l'essai. La personne donne sa carte maintenant, ne paie rien
//     avant cette date, et ne perd aucun jour offert ;
//   - essai termine (ou presque) : paiement immediat, sans periode d'essai.
//
// Pourquoi une route et non un lien de paiement : un lien Stripe porte une
// periode d'essai FIXE, la meme pour tout le monde. Il offrirait 30 jours de
// plus a qui s'abonne apres 25 jours d'essai - soixante jours au total.
//
// Prerequis cote Cloudflare (a deposer par `wrangler secret put`, jamais dans
// le depot ni dans une conversation) :
//   STRIPE_SECRET_KEY, STRIPE_PRIX_MENSUEL, STRIPE_PRIX_ANNUEL
// Sans eux la route repond 503, et l'application retombe sur le lien de
// paiement.

import { compteDuJeton } from './scan.js';

const URL_STRIPE = 'https://api.stripe.com/v1/checkout/sessions';

// Stripe refuse un trial_end a moins de 48 h : en dessous, on facture tout de
// suite plutot que d'echouer.
const MARGE_STRIPE_MS = 48 * 3600 * 1000;

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function profilDe(compteId, env) {
  const reponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${compteId}` +
    '&select=reference,essai_fin,client_stripe',
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  if (!reponse.ok) return null;
  const lignes = await reponse.json().catch(() => []);
  return Array.isArray(lignes) ? lignes[0] || null : null;
}

async function adresseDe(requete, env) {
  const entete = requete.headers.get('authorization') || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : '';
  const reponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) return '';
  const utilisateur = await reponse.json().catch(() => null);
  return utilisateur?.email || '';
}

// Parametres de la session. Fonction pure : c'est elle que le test verifie.
export function parametresSession({ prix, reference, email, essaiFin, maintenant }) {
  const p = new URLSearchParams();
  p.set('mode', 'subscription');
  p.set('line_items[0][price]', prix);
  p.set('line_items[0][quantity]', '1');
  p.set('client_reference_id', reference);
  if (email) p.set('customer_email', email);
  p.set('success_url', 'https://prepacards.fr/merci/');
  p.set('cancel_url', 'https://prepacards.fr/tarifs/');
  p.set('allow_promotion_codes', 'true');

  const fin = essaiFin ? new Date(essaiFin).getTime() : 0;
  if (fin - maintenant > MARGE_STRIPE_MS) {
    p.set('subscription_data[trial_end]', String(Math.floor(fin / 1000)));
  }
  return p;
}

export async function ouvrirPaiement(requete, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRIX_MENSUEL || !env.STRIPE_PRIX_ANNUEL) {
    return json({ erreur: 'Le paiement en ligne n’est pas encore configuré.' }, 503);
  }

  const compteId = await compteDuJeton(requete, env);
  if (!compteId) return json({ erreur: 'Connectez-vous d’abord.' }, 401);

  const corps = await requete.json().catch(() => null);
  const offre = corps?.offre === 'annuel' ? 'annuel' : 'mensuel';
  const prix = offre === 'annuel' ? env.STRIPE_PRIX_ANNUEL : env.STRIPE_PRIX_MENSUEL;

  const profil = await profilDe(compteId, env);
  if (!profil) return json({ erreur: 'Compte introuvable.' }, 404);

  const parametres = parametresSession({
    prix,
    reference: profil.reference,
    email: await adresseDe(requete, env),
    essaiFin: profil.essai_fin,
    maintenant: Date.now(),
  });

  const reponse = await fetch(URL_STRIPE, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: parametres.toString(),
  });
  if (!reponse.ok) {
    // Le detail va dans les journaux : il peut citer des elements de la
    // requete, et n'apprend rien a l'eleve.
    console.error('paiement', reponse.status, await reponse.text().catch(() => ''));
    return json({ erreur: 'Le paiement n’a pas pu être ouvert. Réessayez.' }, 502);
  }
  const session = await reponse.json().catch(() => null);
  if (!session?.url) return json({ erreur: 'Réponse de paiement inattendue.' }, 502);
  return json({ url: session.url });
}
