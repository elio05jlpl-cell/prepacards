// Service des comptes PrepaCards
// ===============================
//
// Un seul Worker devant le site. Il intercepte /api/… et laisse tout le
// reste aux fichiers statiques : le site garde sa vitesse, et seule la
// requete Stripe coute du calcul.
//
// L'inscription, la connexion, la connexion Google, la reinitialisation du
// mot de passe et la sauvegarde chiffree ne passent PLUS par ce Worker :
// le navigateur et l'application parlent directement a Supabase (Auth et
// REST), proteges par les regles RLS posees dans schema.sql. Il ne reste
// ici que ce qui EXIGE un secret que le navigateur ne doit jamais voir :
// verifier la signature Stripe, ecrire l'abonnement avec la cle
// service_role (qui contourne RLS), supprimer un compte a la demande de
// son titulaire, et envoyer les deux e-mails que Supabase ne peut pas
// declencher lui-meme (bienvenue, resiliation) - voir courriel.js.

import { maintenant, normaliserEmail, signatureStripeValide } from './securite.js';
import { lireFeuille } from './scan.js';
import { disponible as courrielDisponible, envoyer as envoyerCourriel,
         messageBienvenue, messageResiliation } from './courriel.js';

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function erreur(message, statut = 400) {
  return json({ erreur: message }, statut);
}

/** Appelle l'API REST de Supabase avec la cle service_role : contourne RLS,
 *  ne doit donc jamais etre exposee ailleurs que dans ce Worker. */
async function supabase(env, chemin, options = {}) {
  return fetch(`${env.SUPABASE_URL}${chemin}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

// --- Compte ------------------------------------------------------------

/** Verifie le jeton d'acces envoye par le navigateur et renvoie
 *  l'utilisateur Supabase correspondant, ou null. On ne fait JAMAIS
 *  confiance a un identifiant fourni par le client : c'est ce jeton, verifie
 *  par Supabase lui-meme, qui dit qui fait la demande. */
async function verifierUtilisateur(requete, env) {
  const entete = requete.headers.get('authorization') || '';
  const jeton = entete.replace(/^Bearer\s+/i, '').trim();
  if (!jeton) return null;
  const reponse = await supabase(env, '/auth/v1/user', {
    headers: { authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) return null;
  const utilisateur = await reponse.json().catch(() => null);
  return utilisateur && utilisateur.id ? utilisateur : null;
}

const STATUTS_ACTIFS = new Set(['trialing', 'active', 'past_due']);

async function supprimerCompte(requete, env) {
  const utilisateur = await verifierUtilisateur(requete, env);
  if (!utilisateur) return erreur('Session invalide.', 401);

  // Un compte encore abonne qu'on supprime laisserait Stripe prelever dans
  // le vide : on demande d'abord la resiliation, plutot que de creer un
  // abonnement fantome que plus personne ne peut retrouver ni annuler.
  const profilReponse = await supabase(env,
    `/rest/v1/profiles?id=eq.${utilisateur.id}&select=statut,valide_jusqu_au`);
  const profils = await profilReponse.json().catch(() => []);
  const profil = Array.isArray(profils) ? profils[0] : null;
  const encoreValide = profil && profil.valide_jusqu_au
    && new Date(profil.valide_jusqu_au).getTime() > Date.now();
  if (profil && STATUTS_ACTIFS.has(profil.statut) && encoreValide) {
    return erreur(
      'Résiliez d’abord votre abonnement depuis le lien reçu par e-mail lors '
      + 'du paiement, puis supprimez votre compte.', 409);
  }

  // Supprime la ligne auth.users : profiles et sauvegardes suivent par
  // cascade (ON DELETE CASCADE dans schema.sql), rien d'autre a nettoyer.
  await supabase(env, `/auth/v1/admin/users/${utilisateur.id}`, { method: 'DELETE' });
  return json({ ok: true });
}

// Appele par un Database Webhook Supabase sur public.profiles (INSERT et
// UPDATE) : le declencheur SQL de schema.sql pose confirme_le exactement
// une fois, a l'inscription (Google) ou a la confirmation du lien reçu par
// e-mail (mot de passe). C'est ce changement precis qu'on guette ici, pas
// les mises a jour de profiles par ailleurs (Stripe, etc.) qui ne touchent
// jamais cette colonne.
async function gererWebhookProfil(requete, env) {
  if (requete.headers.get('x-webhook-secret') !== env.WEBHOOK_SECRET) {
    return erreur('Non autorisé.', 401);
  }

  const corps = await requete.json().catch(() => null);
  const record = corps?.record;
  const ancien = corps?.old_record;
  if (!record?.id || !record.confirme_le || ancien?.confirme_le) {
    // Rien a faire : profil pas encore confirme, ou deja confirme avant
    // cette mise a jour (un changement Stripe, par exemple).
    return json({ ok: true, ignore: true });
  }

  // Garde d'idempotence : cette mise a jour ne reussit (et ne renvoie une
  // ligne) qu'une fois par compte, meme si Supabase rejoue la livraison du
  // webhook. Sans elle, une livraison rejouee enverrait un deuxieme e-mail.
  const marquage = await supabase(env,
    `/rest/v1/profiles?id=eq.${record.id}&accueil_envoye=is.false`,
    { method: 'PATCH', headers: { prefer: 'return=representation' },
      body: JSON.stringify({ accueil_envoye: true }) });
  const marques = await marquage.json().catch(() => []);
  if (!Array.isArray(marques) || !marques.length) {
    return json({ ok: true, deja_envoye: true });
  }

  if (courrielDisponible(env)) {
    // profiles ne contient pas l'adresse (elle vit dans auth.users) : il
    // faut l'API admin, la seule a pouvoir la lire depuis ce Worker.
    const utilisateurReponse = await supabase(env, `/auth/v1/admin/users/${record.id}`);
    const utilisateur = await utilisateurReponse.json().catch(() => null);
    if (utilisateur?.email) {
      try {
        await envoyerCourriel(env, utilisateur.email, 'Bienvenue sur PrépaCards', messageBienvenue());
      } catch (e) {
        // Un e-mail de bienvenue manque, jamais un compte : on journalise
        // sans faire echouer la reponse au webhook.
        console.error('courriel bienvenue', e);
      }
    }
  }

  return json({ ok: true });
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
  const deja = await supabase(env,
    `/rest/v1/evenements_stripe?id=eq.${encodeURIComponent(evenement.id)}&select=id`);
  const dejaListe = await deja.json().catch(() => []);
  if (Array.isArray(dejaListe) && dejaListe.length) {
    return json({ ok: true, deja_traite: true });
  }

  const objet = evenement.data?.object || {};
  const email = normaliserEmail(
    objet.customer_email || objet.customer_details?.email || '');
  const client = objet.customer || null;
  // La reference que le site glisse dans le lien de paiement designe le
  // compte ou la personne etait connectee en payant : elle prime sur
  // tout, et permet de payer avec l'adresse qu'on veut (celle de la
  // carte, celle des parents). Le rattachement par adresse ou par
  // identifiant client couvre qui paie sans etre connecte.
  const reference = objet.client_reference_id || '';

  const recherche = await supabase(env, '/rest/v1/rpc/trouver_compte_stripe', {
    method: 'POST',
    body: JSON.stringify({
      p_reference: reference, p_email: email, p_client_stripe: client,
    }),
  });
  const compteId = await recherche.json().catch(() => null);

  if (compteId) {
    const statut = STATUTS_STRIPE.has(objet.status) ? objet.status
      : (evenement.type === 'checkout.session.completed' ? 'active' : null);
    const fin = objet.current_period_end
      ? new Date(objet.current_period_end * 1000).toISOString() : null;
    const offre = objet.items?.data?.[0]?.plan?.interval === 'year' ? 'annuel'
      : (objet.items?.data?.[0]?.plan?.interval === 'month' ? 'mensuel' : null);

    await supabase(env, '/rest/v1/rpc/appliquer_maj_stripe', {
      method: 'POST',
      body: JSON.stringify({
        p_id: compteId, p_statut: statut, p_offre: offre,
        p_client_stripe: client, p_abonnement_stripe: objet.id || null,
        p_valide_jusqu_au: fin,
      }),
    });

    // .deleted marque la fin REELLE de l'abonnement (pas une simple mise a
    // jour intermediaire, par ex. cancel_at_period_end pose a l'avance) :
    // c'est le seul moment sur precis pour prevenir la personne.
    if (evenement.type === 'customer.subscription.deleted' && courrielDisponible(env)) {
      const utilisateurReponse = await supabase(env, `/auth/v1/admin/users/${compteId}`);
      const utilisateur = await utilisateurReponse.json().catch(() => null);
      if (utilisateur?.email) {
        try {
          await envoyerCourriel(env, utilisateur.email,
            'Votre abonnement PrépaCards a été résilié',
            messageResiliation(fin ? new Date(fin) : null));
        } catch (e) {
          console.error('courriel resiliation', e);
        }
      }
    }
  }

  await supabase(env, '/rest/v1/evenements_stripe', {
    method: 'POST',
    body: JSON.stringify({ id: evenement.id, recu_le: maintenant() }),
  });

  // On repond 200 meme sans compte correspondant : un paiement fait avant
  // la creation du compte ne doit pas faire boucler Stripe indefiniment.
  // La page /compte/ rattache l'abonnement a l'inscription.
  return json({ ok: true, rattache: Boolean(compteId) });
}

// --- Routage ---------------------------------------------------------

const ROUTES = {
  'POST /api/stripe': webhookStripe,
  'POST /api/compte/supprimer': supprimerCompte,
  'POST /api/webhooks/profil': gererWebhookProfil,
  // Lecture d'une feuille photographiee. Cote serveur parce que la cle
  // d'API ne peut pas vivre dans un binaire distribue - et parce que
  // c'est ici, et nulle part dans l'application, que l'abonnement peut
  // etre verifie pour de bon.
  'POST /api/scan': lireFeuille,
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
