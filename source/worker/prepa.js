// Prepa d'origine
// ================
//
// L'application demande, a la premiere ouverture, dans quel lycee l'eleve
// prepare ses concours. La reponse est facultative ; quand il la donne, elle
// est rangee sur son profil pour que le projet sache d'ou viennent ses
// utilisateurs.
//
// Pourquoi une route et non une ecriture directe depuis l'application : la
// table profiles n'a aucune policy d'ecriture pour l'utilisateur (c'est ce qui
// protege le statut d'abonnement). Ouvrir une colonne a l'ecriture ouvrirait la
// table. Ici, le Worker ne touche QUE ces quatre champs, valides.
//
// Ce qui est enregistre : un code d'etablissement (UAI), son nom, sa ville et
// la filiere. Rien d'autre, et jamais de carte.

import { compteDuJeton } from './scan.js';

const FILIERES = ['ECG', 'ECT', 'MPSI', 'PCSI', 'PTSI', 'MPI', 'BCPST',
  'AL', 'BL', 'AUTRE'];
// Deux reponses qui ne designent pas un etablissement de la liste : on les
// garde, parce que « n'a pas trouve son lycee » est elle-meme une statistique.
const SANS_ETABLISSEMENT = ['autre'];

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function texte(valeur, max) {
  return typeof valeur === 'string' ? valeur.trim().slice(0, max) : '';
}

export async function enregistrerPrepa(requete, env) {
  const compteId = await compteDuJeton(requete, env);
  if (!compteId) return json({ erreur: 'Connectez-vous d’abord.' }, 401);

  const corps = await requete.json().catch(() => null);
  if (!corps) return json({ erreur: 'Requête illisible.' }, 400);

  const filiere = texte(corps.filiere, 10).toUpperCase();
  const uai = texte(corps.uai, 12);
  const nom = texte(corps.nom, 120);
  const ville = texte(corps.ville, 80);

  if (filiere && !FILIERES.includes(filiere)) {
    return json({ erreur: 'Filière inconnue.' }, 400);
  }
  // Un UAI est 7 chiffres et une lettre : on n'accepte rien d'autre, ce qui
  // empeche de ranger du texte libre dans une colonne de statistiques.
  if (uai && !/^[0-9]{7}[A-Z]$/.test(uai) && !SANS_ETABLISSEMENT.includes(uai)) {
    return json({ erreur: 'Établissement inconnu.' }, 400);
  }

  const reponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${compteId}`, {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        filiere: filiere || null,
        prepa_uai: uai || null,
        prepa_nom: nom || null,
        prepa_ville: ville || null,
        prepa_le: new Date().toISOString(),
      }),
    });
  if (!reponse.ok) {
    console.error('prepa', reponse.status, await reponse.text().catch(() => ''));
    return json({ erreur: 'Enregistrement impossible pour le moment.' }, 502);
  }
  return json({ ok: true });
}
