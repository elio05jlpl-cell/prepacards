// Liste d'attente : « prevenez-moi quand PrepaCards existera sur Mac ou mobile »
// ===========================================================================
//
// Le visiteur laisse son adresse et coche les systemes qui l'interessent.
// Cela sert a UNE chose : decider de l'ordre des portages, puis le prevenir
// une fois, quand la version qu'il attend existe. Rien d'autre n'en est fait.
//
// Garde-fous :
//   - la requete doit venir de ce site (en-tete Origin) ;
//   - quelques inscriptions seulement par IP et par fenetre de temps ;
//   - un champ piege (« site_web »), invisible pour une personne : un robot
//     qui le remplit est ecarte sans le lui dire ;
//   - la reponse est IDENTIQUE que l'adresse soit nouvelle ou deja inscrite :
//     le formulaire ne doit pas permettre de savoir qui est dans la liste ;
//   - seules les valeurs prevues pour « plateformes » sont gardees.

import { normaliserEmail } from './securite.js';
import { creerLimiteur } from './limiteur.js';

const limiteur = creerLimiteur(5, 60 * 60 * 1000);
export const tropDeDemandes = (ip, maintenant) => limiteur.tropDeDemandes(ip, maintenant);
export const oublierPassages = () => limiteur.oublier();

export const PLATEFORMES = ['mac', 'iphone', 'android'];

export function emailValide(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** POST /api/attente  { email, plateformes: [...], site_web: '' } -> { ok: true } */
export async function sInscrire(requete, env) {
  const origine = requete.headers.get('origin');
  if (origine && new URL(requete.url).origin !== origine) {
    return json({ erreur: 'Origine refusée.' }, 403);
  }

  const ip = requete.headers.get('cf-connecting-ip') || '';
  if (tropDeDemandes(ip)) {
    return json({ erreur: 'Trop de demandes. Réessayez plus tard.' }, 429);
  }

  const corps = await requete.json().catch(() => null);
  if (!corps || typeof corps !== 'object') return json({ erreur: 'Demande illisible.' }, 400);

  // Champ piege rempli : on repond « ok » sans rien enregistrer.
  if (corps.site_web) return json({ ok: true });

  const email = normaliserEmail(corps.email);
  if (!emailValide(email)) return json({ erreur: 'Adresse invalide.' }, 400);

  const plateformes = [...new Set(
    (Array.isArray(corps.plateformes) ? corps.plateformes : [])
      .map((p) => String(p).toLowerCase())
      .filter((p) => PLATEFORMES.includes(p)))];
  if (!plateformes.length) {
    return json({ erreur: 'Choisissez au moins un système.' }, 400);
  }

  // « ignore-duplicates » : une adresse deja inscrite ne produit ni erreur ni
  // modification, donc rien qui la distingue d'une nouvelle.
  const reponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/liste_attente?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ email, plateformes }),
    });
  if (!reponse.ok) {
    console.error('liste_attente', reponse.status);
    return json({ erreur: 'Service indisponible. Réessayez dans un instant.' }, 502);
  }
  return json({ ok: true });
}
