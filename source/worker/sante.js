// Etat de sante du service
// =========================
//
// GET /api/sante : un moniteur de disponibilite (UptimeRobot, Better Stack,
// la surveillance de Cloudflare...) l'interroge toutes les quelques minutes.
//
// Il repond 200 quand le Worker ET la base repondent, 503 sinon. La reponse
// ne dit rien de l'interieur : pas de version, pas de nom de table, pas de
// message d'erreur - une page publique n'a pas a renseigner un attaquant.

function json(donnees, statut) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function etatSante(requete, env, recuperer = fetch) {
  let base = false;
  try {
    const r = await recuperer(`${env.SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY },
      signal: AbortSignal.timeout(4000),
    });
    base = r.ok;
  } catch (e) {
    base = false;
  }
  return json({ ok: base, base }, base ? 200 : 503);
}
