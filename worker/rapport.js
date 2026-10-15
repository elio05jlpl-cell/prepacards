// Rapports d'erreurs de l'application
// ====================================
//
// L'application envoie, quand l'utilisateur le demande, ses dernieres
// exceptions : version, systeme, pile d'appels. Elle les a deja nettoyees
// (rapport_erreurs.py) ; on ne lui fait pas confiance pour autant :
//
//   - aucune identite n'est demandee, aucune n'est conservee, pas d'IP ;
//   - champs en liste blanche, longueurs bornees, tout le reste est ignore ;
//   - un quota par adresse IP, plus bas que celui des routes d'un compte ;
//   - la table n'a aucune policy : seule la cle service_role y ecrit, et
//     personne ne la lit depuis un navigateur.
//
// Un adversaire qui l'inonderait ne gagnerait que de remplir une table : le
// quota et la limite de taille (voir index.js) bornent ce que coute l'essai.

const MAX = { version: 20, date_version: 12, systeme: 80, python: 20,
  description: 1000, plantage: 2000, type: 80, message: 300, pile: 3500, ts: 25 };
const MAX_ERREURS = 5;

function texte(valeur, max) {
  return typeof valeur === 'string' ? valeur.slice(0, max) : '';
}

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Valide et reduit le corps recu. Rend null si ce n'est pas un rapport. */
export function normaliserRapport(corps) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return null;
  const version = texte(corps.version, MAX.version);
  // Une version de la forme 1.3.1 : tout le reste est du bruit.
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null;

  const erreurs = (Array.isArray(corps.erreurs) ? corps.erreurs : [])
    .slice(-MAX_ERREURS)
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      ts: texte(e.ts, MAX.ts),
      version: texte(e.version, MAX.version),
      type: texte(e.type, MAX.type),
      message: texte(e.message, MAX.message),
      pile: texte(e.pile, MAX.pile),
    }));

  const plantage = texte(corps.plantage, MAX.plantage);
  const description = texte(corps.description, MAX.description);
  // Un rapport sans rien dedans ne sert a personne.
  if (!erreurs.length && !plantage && !description) return null;

  return {
    version,
    date_version: texte(corps.date_version, MAX.date_version),
    systeme: texte(corps.systeme, MAX.systeme),
    python: texte(corps.python, MAX.python),
    description,
    erreurs,
    plantage,
  };
}

/** POST /api/rapport -> { ok: true } */
export async function recevoirRapport(requete, env) {
  const corps = await requete.json().catch(() => null);
  const rapport = normaliserRapport(corps);
  if (!rapport) return json({ erreur: 'Rapport illisible.' }, 400);

  const reponse = await fetch(`${env.SUPABASE_URL}/rest/v1/rapports_erreurs`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      version: rapport.version,
      systeme: rapport.systeme,
      contenu: rapport,
    }),
  });
  if (!reponse.ok) {
    console.error('rapport', reponse.status);
    return json({ erreur: 'Service indisponible.' }, 502);
  }
  return json({ ok: true });
}
