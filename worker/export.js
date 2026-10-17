// Export des donnees du compte (RGPD, droit d'acces et de portabilite)
// =====================================================================
//
// POST /api/compte/exporter, avec le jeton de la personne connectee. Rend un
// fichier JSON de TOUT ce que le service sait d'elle :
//
//   - son adresse et les dates de son compte ;
//   - son abonnement (statut, offre, echeance) ;
//   - sa prepa d'origine, si elle l'a donnee ;
//   - le consentement aux e-mails de conseils ;
//   - les METADONNEES de sa sauvegarde en ligne (taille, nombre de cartes,
//     date). Le contenu, lui, est chiffre sur son ordinateur avec une cle
//     que le service n'a jamais : il n'est pas lisible ici, et ne peut donc
//     pas etre rendu en clair. Il se recupere avec l'application ;
//   - le nombre de feuilles lues par mois ;
//   - la liste des e-mails de l'essai deja envoyes.
//
// L'identite vient du jeton, verifie par Supabase : on n'exporte jamais les
// donnees d'un identifiant fourni par le client.

function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees, null, 2), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8', ...entetes },
  });
}

async function lire(env, chemin, recuperer) {
  const r = await recuperer(`${env.SUPABASE_URL}${chemin}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`lecture ${chemin.split('?')[0]} : ${r.status}`);
  const lignes = await r.json().catch(() => []);
  return Array.isArray(lignes) ? lignes : [];
}

export async function exporterCompte(requete, env, recuperer = fetch) {
  const entete = requete.headers.get('authorization') || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : '';
  if (!jeton) return json({ erreur: 'Connectez-vous d’abord.' }, 401);

  const u = await recuperer(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${jeton}` },
  });
  if (!u.ok) return json({ erreur: 'Session invalide.' }, 401);
  const utilisateur = await u.json().catch(() => null);
  const id = utilisateur && utilisateur.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ erreur: 'Session invalide.' }, 401);

  const [profil, sauvegarde, scans, envoyes] = await Promise.all([
    lire(env, `/rest/v1/profiles?id=eq.${id}&select=cree_le,confirme_le,essai_fin,statut,offre,`
      + 'valide_jusqu_au,filiere,prepa_nom,prepa_ville,prepa_le,marketing_ok,marketing_le', recuperer),
    lire(env, `/rest/v1/sauvegardes?compte_id=eq.${id}&select=octets,cartes,depose_le`, recuperer),
    lire(env, `/rest/v1/usages_scan?compte_id=eq.${id}&select=mois,nombre&order=mois.asc`, recuperer),
    lire(env, `/rest/v1/emails_envoyes?user_id=eq.${id}&select=type,envoye_le&order=envoye_le.asc`, recuperer),
  ]);

  const donnees = {
    genere_le: new Date().toISOString(),
    service: 'PrépaCards (prepacards.fr)',
    compte: {
      adresse: utilisateur.email || null,
      ...(profil[0] || {}),
    },
    sauvegarde_en_ligne: sauvegarde[0]
      ? { presente: true, ...sauvegarde[0],
          note: 'Contenu chiffré sur votre ordinateur : illisible par le service.' }
      : { presente: false },
    feuilles_lues_par_mois: scans,
    emails_envoyes: envoyes,
  };

  return json(donnees, 200, {
    'content-disposition': 'attachment; filename="prepacards-mes-donnees.json"',
  });
}
