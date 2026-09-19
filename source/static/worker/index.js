// Service des comptes PrepaCards
// ===============================
//
// Un seul Worker devant le site. Il intercepte /api/… et laisse tout le
// reste aux fichiers statiques : le site garde sa vitesse, et seules les
// requetes de compte coutent du calcul.
//
// Ce qu'il sait faire :
//   - creer un compte, connecter, deconnecter ;
//   - dire a l'application si un compte est abonne ;
//   - recevoir les evenements Stripe et tenir l'abonnement a jour ;
//   - garder une sauvegarde CHIFFREE des paquets, qu'il ne peut pas lire.
//
// Ce qu'il ne fait pas, volontairement : servir des seances de revision.
// La repetition espacee, la voix et la lecture labiale vivent dans
// l'application ; les dupliquer ici ferait deux moteurs a tenir d'accord.

import {
  ITERATIONS, base64, desBase64, dansNJours, emailPlausible, empreinteJeton,
  hacherMotDePasse, jetonAleatoire, maintenant, memeSecret, motDePassePlausible,
  normaliserEmail, selAleatoire, signatureStripeValide,
} from './securite.js';

const JOURS_SESSION = 180;

// Taille maximale d'une sauvegarde. Quatre-vingt-cinq paquets chiffres
// pesent quelques centaines de kilooctets ; dix megaoctets laissent une
// marge confortable sans ouvrir la porte a un depot de fichiers.
const TAILLE_MAX_SAUVEGARDE = 10 * 1024 * 1024;

function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...entetes,
    },
  });
}

function erreur(message, statut = 400) {
  return json({ erreur: message }, statut);
}

async function corpsJson(requete) {
  try {
    return await requete.json();
  } catch {
    return null;
  }
}

// --- Comptes ---------------------------------------------------------

async function compteParEmail(env, email) {
  return env.DB.prepare('SELECT * FROM comptes WHERE email = ?')
    .bind(email).first();
}

/** Etat de l'abonnement tel que l'application doit le comprendre. */
function etatAbonnement(compte) {
  const statut = compte.statut || '';
  const jusqu = compte.valide_jusqu_au;
  // Un abonnement resilie reste du dernier jour paye : couper l'acces le
  // jour de la resiliation reviendrait a garder de l'argent sans service.
  const encoreValide = jusqu ? new Date(jusqu).getTime() > Date.now() : false;
  const actif = ['trialing', 'active', 'past_due'].includes(statut)
    && encoreValide;
  return {
    abonne: actif,
    statut,
    offre: compte.offre || '',
    valide_jusqu_au: jusqu || null,
  };
}

async function ouvrirSession(env, compteId, origine) {
  const jeton = jetonAleatoire();
  await env.DB.prepare(
    'INSERT INTO sessions (empreinte_jeton, compte_id, cree_le, expire_le, origine)'
    + ' VALUES (?, ?, ?, ?, ?)')
    .bind(await empreinteJeton(jeton), compteId, maintenant(),
          dansNJours(JOURS_SESSION), origine)
    .run();
  return jeton;
}

async function compteDeLaRequete(env, requete) {
  const entete = requete.headers.get('authorization') || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';
  if (!jeton) return null;
  const ligne = await env.DB.prepare(
    'SELECT c.* , s.expire_le FROM sessions s'
    + ' JOIN comptes c ON c.id = s.compte_id'
    + ' WHERE s.empreinte_jeton = ?')
    .bind(await empreinteJeton(jeton)).first();
  if (!ligne) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) return null;
  return ligne;
}

async function inscription(requete, env) {
  const corps = await corpsJson(requete);
  if (!corps) return erreur('Requête illisible.');
  const email = normaliserEmail(corps.email);
  const motDePasse = corps.mot_de_passe;

  if (!emailPlausible(email)) return erreur("Adresse e-mail invalide.");
  if (!motDePassePlausible(motDePasse)) {
    return erreur('Le mot de passe doit faire au moins 8 caractères.');
  }
  if (await compteParEmail(env, email)) {
    // Message identique a celui de la connexion ratee : dire « ce compte
    // existe » permettrait de savoir qui est inscrit chez vous.
    return erreur('Un compte existe déjà pour cette adresse.', 409);
  }

  const sel = selAleatoire();
  const empreinte = await hacherMotDePasse(motDePasse, sel);
  const resultat = await env.DB.prepare(
    'INSERT INTO comptes (email, sel, empreinte, iterations, cree_le)'
    + ' VALUES (?, ?, ?, ?, ?)')
    .bind(email, base64(sel), base64(empreinte), ITERATIONS, maintenant())
    .run();

  const id = resultat.meta.last_row_id;
  const jeton = await ouvrirSession(env, id, corps.origine || 'application');
  return json({ jeton, email, abonnement: etatAbonnement({ statut: '' }) }, 201);
}

async function connexion(requete, env) {
  const corps = await corpsJson(requete);
  if (!corps) return erreur('Requête illisible.');
  const email = normaliserEmail(corps.email);
  const compte = await compteParEmail(env, email);

  // Meme travail et meme message dans les deux cas : sans cela, le temps de
  // reponse revelerait quelles adresses ont un compte.
  const sel = compte ? desBase64(compte.sel) : selAleatoire();
  const iterations = compte ? compte.iterations : ITERATIONS;
  const empreinte = await hacherMotDePasse(
    String(corps.mot_de_passe || ''), sel, iterations);
  const attendu = compte ? desBase64(compte.empreinte) : selAleatoire(32);

  if (!compte || !memeSecret(empreinte, attendu)) {
    return erreur('Adresse ou mot de passe incorrect.', 401);
  }

  const jeton = await ouvrirSession(env, compte.id, corps.origine || 'application');
  return json({ jeton, email, abonnement: etatAbonnement(compte) });
}

async function deconnexion(requete, env) {
  const entete = requete.headers.get('authorization') || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';
  if (jeton) {
    await env.DB.prepare('DELETE FROM sessions WHERE empreinte_jeton = ?')
      .bind(await empreinteJeton(jeton)).run();
  }
  return json({ ok: true });
}

/** Ce que l'application interroge une fois par jour. */
async function abonnement(requete, env) {
  const compte = await compteDeLaRequete(env, requete);
  if (!compte) return erreur('Session expirée.', 401);
  const sauvegarde = await env.DB.prepare(
    'SELECT octets, cartes, depose_le FROM sauvegardes WHERE compte_id = ?')
    .bind(compte.id).first();
  return json({
    email: compte.email,
    abonnement: etatAbonnement(compte),
    sauvegarde: sauvegarde || null,
  });
}

// --- Sauvegarde chiffree ---------------------------------------------

async function deposerSauvegarde(requete, env) {
  const compte = await compteDeLaRequete(env, requete);
  if (!compte) return erreur('Session expirée.', 401);
  if (!etatAbonnement(compte).abonne) {
    return erreur('La sauvegarde en ligne fait partie de l’offre complète.', 402);
  }

  const contenu = new Uint8Array(await requete.arrayBuffer());
  if (!contenu.length) return erreur('Sauvegarde vide.');
  if (contenu.length > TAILLE_MAX_SAUVEGARDE) {
    return erreur('Sauvegarde trop volumineuse.', 413);
  }
  const cartes = Number(requete.headers.get('x-cartes') || 0) || 0;

  await env.DB.prepare(
    'INSERT INTO sauvegardes (compte_id, contenu, octets, cartes, depose_le)'
    + ' VALUES (?, ?, ?, ?, ?)'
    + ' ON CONFLICT(compte_id) DO UPDATE SET contenu = excluded.contenu,'
    + ' octets = excluded.octets, cartes = excluded.cartes,'
    + ' depose_le = excluded.depose_le')
    .bind(compte.id, contenu, contenu.length, cartes, maintenant())
    .run();
  return json({ ok: true, octets: contenu.length, cartes });
}

async function lireSauvegarde(requete, env) {
  const compte = await compteDeLaRequete(env, requete);
  if (!compte) return erreur('Session expirée.', 401);
  const ligne = await env.DB.prepare(
    'SELECT contenu, octets, depose_le FROM sauvegardes WHERE compte_id = ?')
    .bind(compte.id).first();
  if (!ligne) return erreur('Aucune sauvegarde.', 404);
  return new Response(ligne.contenu, {
    headers: {
      'content-type': 'application/octet-stream',
      'x-depose-le': ligne.depose_le,
      'cache-control': 'no-store',
    },
  });
}

// --- Stripe ----------------------------------------------------------

const STATUTS_STRIPE = new Set([
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete',
  'incomplete_expired', 'paused',
]);

async function webhookStripe(requete, env) {
  const brut = await requete.text();
  const signature = requete.headers.get('stripe-signature');
  if (!await signatureStripeValide(brut, signature, env.STRIPE_WEBHOOK_SECRET)) {
    return erreur('Signature invalide.', 400);
  }

  const evenement = JSON.parse(brut);
  // Stripe rejoue les evenements en cas de doute sur la livraison :
  // appliquer deux fois une resiliation n'est pas anodin.
  const deja = await env.DB.prepare(
    'SELECT id FROM evenements_stripe WHERE id = ?').bind(evenement.id).first();
  if (deja) return json({ ok: true, deja_traite: true });

  const objet = evenement.data?.object || {};
  let email = normaliserEmail(
    objet.customer_email || objet.customer_details?.email || '');
  const client = objet.customer || null;

  // Sur les evenements d'abonnement, l'adresse n'est pas jointe : on
  // retrouve le compte par l'identifiant client deja enregistre.
  let compte = email ? await compteParEmail(env, email) : null;
  if (!compte && client) {
    compte = await env.DB.prepare('SELECT * FROM comptes WHERE client_stripe = ?')
      .bind(client).first();
  }

  if (compte) {
    const statut = STATUTS_STRIPE.has(objet.status) ? objet.status
      : (evenement.type === 'checkout.session.completed' ? 'active'
        : compte.statut);
    const fin = objet.current_period_end
      ? new Date(objet.current_period_end * 1000).toISOString()
      : compte.valide_jusqu_au;
    const offre = objet.items?.data?.[0]?.plan?.interval === 'year'
      ? 'annuel' : (objet.items?.data?.[0]?.plan?.interval === 'month'
        ? 'mensuel' : compte.offre);

    await env.DB.prepare(
      'UPDATE comptes SET statut = ?, offre = ?, client_stripe = COALESCE(?, client_stripe),'
      + ' abonnement_stripe = COALESCE(?, abonnement_stripe),'
      + ' valide_jusqu_au = ?, maj_le = ? WHERE id = ?')
      .bind(statut, offre, client, objet.id || null, fin, maintenant(), compte.id)
      .run();
  }

  await env.DB.prepare(
    'INSERT INTO evenements_stripe (id, recu_le) VALUES (?, ?)')
    .bind(evenement.id, maintenant()).run();

  // On repond 200 meme sans compte correspondant : un paiement fait avant
  // la creation du compte ne doit pas faire boucler Stripe indefiniment.
  // La page /compte/ rattache l'abonnement a l'inscription.
  return json({ ok: true, rattache: Boolean(compte) });
}

// --- Routage ---------------------------------------------------------

const ROUTES = {
  'POST /api/inscription': inscription,
  'POST /api/connexion': connexion,
  'POST /api/deconnexion': deconnexion,
  'GET /api/abonnement': abonnement,
  'PUT /api/sauvegarde': deposerSauvegarde,
  'GET /api/sauvegarde': lireSauvegarde,
  'POST /api/stripe': webhookStripe,
};

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url);

    if (!url.pathname.startsWith('/api/')) {
      // Tout le reste du site reste servi en statique, sans passer par le
      // moindre calcul : c'est ce qui garde les pages instantanees.
      return env.ASSETS.fetch(requete);
    }

    const gestionnaire = ROUTES[`${requete.method} ${url.pathname}`];
    if (!gestionnaire) return erreur('Route inconnue.', 404);

    try {
      return await gestionnaire(requete, env);
    } catch (e) {
      // Le detail part dans les journaux, jamais dans la reponse : un
      // message d'erreur de base de donnees renseigne un attaquant.
      console.error('erreur', url.pathname, e);
      return erreur('Erreur interne.', 500);
    }
  },
};
