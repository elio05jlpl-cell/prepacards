// Un compte existe-t-il pour cette adresse ?
// ==========================================
//
// La page de connexion fait comme les services qu'on lui compare : on saisit
// son adresse, puis elle sait toute seule s'il faut demander le mot de passe
// (le compte existe) ou en faire choisir un (il n'existe pas).
//
// Supabase ne repond pas a cette question depuis le navigateur : par
// prudence, il masque l'existence d'un compte. La reponse passe donc par ici,
// ou l'on peut lire la table des utilisateurs avec la cle service_role,
// jamais exposee au navigateur.
//
// Ce que cela coute en confidentialite : n'importe qui peut demander si une
// adresse donnee a un compte. C'est le comportement de la plupart des services
// et le prix d'une page qui se comporte intelligemment ; on le borne :
//
//   - la requete doit venir de ce site (en-tete Origin) ;
//   - quelques requetes seulement par adresse IP et par fenetre de temps ;
//   - la reponse ne contient que trois booleens, jamais d'identifiant, de
//     date ni de nom.
//
// Le plafond est tenu en memoire de l'instance du Worker : il freine un
// enchainement de requetes depuis un meme poste, il ne remplace pas une vraie
// limitation (Cloudflare : Securite > WAF > Regles de limitation de debit,
// sur /api/compte/existe).

import { normaliserEmail } from './securite.js';
import { creerLimiteur } from './limiteur.js';

const limiteur = creerLimiteur(20, 10 * 60 * 1000);

/** Vrai si cette IP a depasse son quota pour la fenetre en cours. */
export const tropDeDemandes = (ip, maintenant) => limiteur.tropDeDemandes(ip, maintenant);

export const oublierPassages = () => limiteur.oublier();

export function emailValide(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** POST /api/compte/existe  { email } -> { existe, mot_de_passe, google } */
export async function compteExiste(requete, env) {
  const origine = requete.headers.get('origin');
  if (origine && new URL(requete.url).origin !== origine) {
    return json({ erreur: 'Origine refusée.' }, 403);
  }

  const ip = requete.headers.get('cf-connecting-ip') || '';
  if (tropDeDemandes(ip)) {
    return json({ erreur: 'Trop de tentatives. Réessayez dans quelques minutes.' }, 429);
  }

  const corps = await requete.json().catch(() => null);
  const email = normaliserEmail(corps && corps.email);
  if (!emailValide(email)) return json({ erreur: 'Adresse invalide.' }, 400);

  const reponse = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/compte_existe`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_email: email }),
  });
  if (!reponse.ok) {
    console.error('compte_existe', reponse.status);
    return json({ erreur: 'Service indisponible.' }, 502);
  }
  const lecture = await reponse.json().catch(() => null);
  return json({
    existe: Boolean(lecture && lecture.existe),
    mot_de_passe: Boolean(lecture && lecture.mot_de_passe),
    google: Boolean(lecture && lecture.google),
  });
}
