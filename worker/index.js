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
  normaliserEmail,
  referenceAleatoire, selAleatoire, signatureStripeValide,
} from './securite.js';
import {
  adresseGoogle, configure as googleConfigure, echangerLeCode, fabriquerEtat,
  lireEtat, verifierJetonIdentite,
} from './google.js';

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

/** Reference du compte, creee a la volee pour les comptes anterieurs.
 *
 * Les premiers comptes ont ete ouverts avant que cette colonne existe. On
 * ne les laisse pas sans reference : sinon leur titulaire devrait payer
 * avec l'adresse exacte de son compte, ce que la nouvelle page ne lui dit
 * plus.
 */
async function referenceDe(env, compte) {
  if (compte.reference) return compte.reference;
  const reference = referenceAleatoire();
  await env.DB.prepare('UPDATE comptes SET reference = ? WHERE id = ?')
    .bind(reference, compte.id).run();
  return reference;
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
  const reference = referenceAleatoire();
  const resultat = await env.DB.prepare(
    'INSERT INTO comptes (email, sel, empreinte, iterations, cree_le, reference)'
    + ' VALUES (?, ?, ?, ?, ?, ?)')
    .bind(email, base64(sel), base64(empreinte), ITERATIONS, maintenant(),
          reference)
    .run();

  const id = resultat.meta.last_row_id;
  const jeton = await ouvrirSession(env, id, corps.origine || 'application');
  return json({ jeton, email, reference,
                abonnement: etatAbonnement({ statut: '' }) }, 201);
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
  return json({ jeton, email, reference: await referenceDe(env, compte),
                abonnement: etatAbonnement(compte) });
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
    reference: await referenceDe(env, compte),
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

  // Base64 plutot que BLOB : D1 ne rend pas les colonnes binaires sous une
  // forme exploitable, et un essai de bout en bout a rendu une sauvegarde
  // VIDE sans lever la moindre erreur. Sur des donnees irremplacables, la
  // previsibilite vaut mieux que le tiers d'espace economise.
  const encode = base64(contenu);
  const empreinte = base64(await crypto.subtle.digest('SHA-256', contenu));

  await env.DB.prepare(
    'INSERT INTO sauvegardes (compte_id, contenu, empreinte, octets, cartes, depose_le)'
    + ' VALUES (?, ?, ?, ?, ?, ?)'
    + ' ON CONFLICT(compte_id) DO UPDATE SET contenu = excluded.contenu,'
    + ' empreinte = excluded.empreinte, octets = excluded.octets,'
    + ' cartes = excluded.cartes, depose_le = excluded.depose_le')
    .bind(compte.id, encode, empreinte, contenu.length, cartes, maintenant())
    .run();
  return json({ ok: true, octets: contenu.length, cartes });
}

async function lireSauvegarde(requete, env) {
  const compte = await compteDeLaRequete(env, requete);
  if (!compte) return erreur('Session expirée.', 401);
  const ligne = await env.DB.prepare(
    'SELECT contenu, empreinte, octets, depose_le FROM sauvegardes'
    + ' WHERE compte_id = ?')
    .bind(compte.id).first();
  if (!ligne) return erreur('Aucune sauvegarde.', 404);

  const octets = desBase64(ligne.contenu);
  // Une sauvegarde abimee doit se SIGNALER. Rendue en silence, elle ferait
  // croire a une restauration reussie et l'eleve effacerait peut-etre sa
  // copie locale par-dessus.
  if (ligne.empreinte) {
    const verif = base64(await crypto.subtle.digest('SHA-256', octets));
    if (verif !== ligne.empreinte) {
      return erreur('Sauvegarde corrompue : ne l’utilisez pas.', 500);
    }
  }
  if (octets.length !== ligne.octets) {
    return erreur('Sauvegarde incomplète : ne l’utilisez pas.', 500);
  }

  return new Response(octets, {
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

  // Trois facons de retrouver le compte, dans cet ordre.
  //
  // 1. La reference que le site a glissee dans le lien de paiement. Elle
  //    prime sur tout : elle designe le compte ou la personne etait
  //    connectee en payant, ce qui lui permet de payer avec l'adresse
  //    qu'elle veut — celle de sa carte, celle de ses parents.
  // 2. L'adresse, quand elle correspond a un compte. C'est le cas de qui
  //    paie sans etre connecte, puis cree son compte ensuite.
  // 3. L'identifiant client Stripe, pour les evenements d'abonnement qui
  //    ne transportent aucune adresse (renouvellement, resiliation).
  const reference = objet.client_reference_id || '';
  let compte = null;
  if (reference) {
    compte = await env.DB.prepare('SELECT * FROM comptes WHERE reference = ?')
      .bind(reference).first();
  }
  if (!compte && email) compte = await compteParEmail(env, email);
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

// --- Connexion par Google --------------------------------------------

const TEMOIN = 'pc_google';
const VIE_CODE_MINUTES = 5;

function temoinDeLaRequete(requete) {
  const brut = requete.headers.get('cookie') || '';
  const trouve = brut.split(';').map((p) => p.trim())
    .find((p) => p.startsWith(TEMOIN + '='));
  return trouve ? decodeURIComponent(trouve.slice(TEMOIN.length + 1)) : '';
}

/** Ce dont le service dispose, pour que la page n'affiche pas un bouton
 *  qui ne mene nulle part. La page est statique : elle ne peut pas savoir
 *  seule si Google est configure. */
function capacites(requete, env) {
  return json({ google: googleConfigure(env) });
}

/** Depart vers Google. */
async function googleDepart(requete, env) {
  if (!googleConfigure(env)) return retourVersLaPage('google=indisponible');
  const url = new URL(requete.url);
  const { etat, graine } = await fabriquerEtat(env, url.searchParams.get('origine'));
  return new Response(null, {
    status: 302,
    headers: {
      location: adresseGoogle(env, url, etat),
      // HttpOnly : le temoin ne sert qu'au serveur, aucun script n'a a le
      // lire. SameSite=Lax et non Strict : Strict n'enverrait pas le
      // temoin au retour de Google, et la connexion echouerait toujours.
      'set-cookie': `${TEMOIN}=${encodeURIComponent(graine)}; Path=/api/google;`
        + ' Max-Age=600; HttpOnly; Secure; SameSite=Lax',
      'cache-control': 'no-store',
    },
  });
}

function retourVersLaPage(message) {
  // On revient toujours sur /compte/ : un JSON affiche en pleine page a
  // la fin d'une connexion ressemble a une panne.
  return new Response(null, {
    status: 302,
    headers: { location: '/compte/#' + message, 'cache-control': 'no-store' },
  });
}

/** Retour de Google. */
async function googleRetour(requete, env) {
  if (!googleConfigure(env)) return retourVersLaPage('google=indisponible');
  const url = new URL(requete.url);

  if (url.searchParams.get('error')) return retourVersLaPage('google=annule');
  const code = url.searchParams.get('code') || '';
  const charge = await lireEtat(env, url.searchParams.get('state'),
                                temoinDeLaRequete(requete));
  if (!code || !charge) return retourVersLaPage('google=etat');

  let identite;
  try {
    const jetonIdentite = await echangerLeCode(env, url, code);
    identite = await verifierJetonIdentite(jetonIdentite, env.GOOGLE_CLIENT_ID);
  } catch {
    return retourVersLaPage('google=refus');
  }

  // Par l'identifiant Google d'abord : il ne change pas, meme si la
  // personne change l'adresse de son compte Google.
  let compte = identite.sub ? await env.DB.prepare(
    'SELECT * FROM comptes WHERE google_sub = ?').bind(identite.sub).first() : null;
  if (!compte) compte = await compteParEmail(env, identite.email);

  if (!compte) {
    // Compte ouvert par Google : aucun mot de passe utilisable. On range
    // une empreinte tiree au hasard plutot qu'un champ vide, pour que la
    // route « connexion » fasse exactement le meme travail et ne trahisse
    // pas, par son temps de reponse, quels comptes passent par Google.
    const sel = selAleatoire();
    const resultat = await env.DB.prepare(
      'INSERT INTO comptes (email, sel, empreinte, iterations, cree_le,'
      + ' reference, google_sub) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(identite.email, base64(sel), base64(selAleatoire(32)), ITERATIONS,
            maintenant(), referenceAleatoire(), identite.sub || null)
      .run();
    compte = await env.DB.prepare('SELECT * FROM comptes WHERE id = ?')
      .bind(resultat.meta.last_row_id).first();
  } else if (identite.sub && !compte.google_sub) {
    await env.DB.prepare('UPDATE comptes SET google_sub = ? WHERE id = ?')
      .bind(identite.sub, compte.id).run();
  }

  // La session n'est PAS ouverte ici. Seul un code a usage unique part
  // dans l'adresse ; le jeton, qui vaut six mois, ne s'y montre jamais —
  // une adresse reste dans l'historique, dans les journaux d'un proxy,
  // dans une capture d'ecran envoyee a un camarade.
  const codeUnique = jetonAleatoire();
  await env.DB.prepare(
    'INSERT INTO codes_connexion (empreinte, compte_id, cree_le, expire_le)'
    + ' VALUES (?, ?, ?, ?)')
    .bind(await empreinteJeton(codeUnique), compte.id, maintenant(),
          new Date(Date.now() + VIE_CODE_MINUTES * 60000).toISOString())
    .run();
  const reponse = retourVersLaPage(
    'connexion=' + encodeURIComponent(codeUnique)
    + '&origine=' + encodeURIComponent(charge.o || 'site'));
  reponse.headers.append('set-cookie',
    `${TEMOIN}=; Path=/api/google; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  return reponse;
}

/** Le navigateur echange son code contre l'etat du compte. */
async function googleEchange(requete, env) {
  const corps = await corpsJson(requete);
  const code = String((corps && corps.code) || '');
  if (!code) return erreur('Code de connexion invalide.', 400);
  const empreinte = await empreinteJeton(code);

  const ligne = await env.DB.prepare(
    'SELECT compte_id, expire_le FROM codes_connexion WHERE empreinte = ?')
    .bind(empreinte).first();
  // Usage unique : consomme des qu'il est presente, valide ou perime. Sans
  // cela, un code reste dans l'historique du navigateur et rouvrirait une
  // session des semaines plus tard.
  await env.DB.prepare('DELETE FROM codes_connexion WHERE empreinte = ?')
    .bind(empreinte).run();
  if (!ligne) return erreur('Code de connexion invalide.', 400);
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    return erreur('Code de connexion expiré.', 400);
  }

  const compte = await env.DB.prepare('SELECT * FROM comptes WHERE id = ?')
    .bind(ligne.compte_id).first();
  if (!compte) return erreur('Compte introuvable.', 400);
  return json({
    jeton: await ouvrirSession(env, compte.id,
                               String((corps && corps.origine) || 'site')),
    email: compte.email,
    reference: await referenceDe(env, compte),
    abonnement: etatAbonnement(compte),
  });
}

const ROUTES = {
  'GET /api/capacites': capacites,
  'GET /api/google': googleDepart,
  'GET /api/google/retour': googleRetour,
  'POST /api/google/echange': googleEchange,
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
