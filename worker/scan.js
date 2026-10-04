// Lecture d'une feuille de vocabulaire photographiee
// ===================================================
//
// L'application lisait les feuilles avec RapidOCR en local, puis devinait
// leur structure avec 250 lignes d'heuristiques (ou est la gouttiere entre
// les colonnes, quelles lignes vont ensemble, recto/verso alterne ou cote a
// cote). L'OCR lisait correctement les caracteres ; c'est la STRUCTURE qui
// se trompait des qu'une feuille sortait de l'ordinaire.
//
// Un modele de vision comprend la mise en page et rend directement les
// paires. Cette route est le pont, et elle existe cote serveur pour une
// raison qui n'est pas negociable : une cle d'API embarquee dans un binaire
// distribue est extractible en dix minutes.
//
// Elle rend aussi REEL le verrou d'abonnement. Cote application, premium.py
// dit lui-meme que son controle est « un garde-fou d'interface, pas une
// protection » : un booleen dans un SQLite local. Ici, c'est le serveur qui
// decide, avec la cle service_role.

const MODELE = 'claude-haiku-4-5';
const PLAFOND_MENSUEL = 100;

// Au-dela, ce n'est plus la photo d'une feuille. La limite protege surtout
// contre l'envoi accidentel d'une image non redimensionnee : l'application
// ramene a 1568 px avant d'envoyer, ce qui pese moins de 1 Mo.
const TAILLE_MAX_OCTETS = 6 * 1024 * 1024;
const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'];

// La sortie est contrainte par un schema : le modele ne peut pas rendre
// autre chose que ce JSON. Sans cela il faudrait analyser du texte libre,
// qui varie d'un appel a l'autre - exactement le genre de fragilite qu'on
// cherche a supprimer.
const SCHEMA_SORTIE = {
  type: 'object',
  properties: {
    mode: {
      type: 'string',
      enum: ['deux_colonnes', 'alterne', 'separateur', 'incertain'],
    },
    paires: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          recto: { type: 'string' },
          verso: { type: 'string' },
          douteuse: { type: 'boolean' },
        },
        required: ['recto', 'verso', 'douteuse'],
        additionalProperties: false,
      },
    },
  },
  required: ['mode', 'paires'],
  additionalProperties: false,
};

const CONSIGNE = `Tu lis la photo d'une feuille de vocabulaire d'un élève de
classe préparatoire. Rends les paires de mots qu'elle contient.

Règles :
- Une paire = un terme et sa traduction ou sa définition, tels qu'ils sont
  appariés sur la feuille.
- Respecte l'ordre de la feuille, de haut en bas.
- Conserve les accents, la casse et la ponctuation exactement comme écrits.
- Ignore les titres, numéros de page, dates et annotations qui ne font pas
  partie d'une paire.
- N'INVENTE RIEN. Si un mot est illisible ou si tu hésites sur
  l'appariement, rends-le quand même et marque douteuse = true. Une paire
  marquée douteuse sera relue par l'élève ; une paire inventée passera
  inaperçue et sera apprise de travers.
- Si la feuille ne contient aucune paire, rends une liste vide.`;

function json(donnees, statut = 200) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function erreur(message, statut) {
  return json({ erreur: message }, statut);
}

// Le mois courant en UTC. UTC et non l'heure locale de l'eleve : sinon le
// quota se reinitialiserait a des instants differents selon le fuseau, et
// deux appels simultanes pourraient viser deux mois.
function moisCourant() {
  const maintenant = new Date();
  const mois = String(maintenant.getUTCMonth() + 1).padStart(2, '0');
  return `${maintenant.getUTCFullYear()}-${mois}`;
}

// --- Identite et droits ---------------------------------------------------

// On interroge Supabase avec le jeton DE L'ELEVE plutot que de verifier la
// signature nous-memes : Supabase sait seul si le jeton a ete revoque, et
// une verification locale laisserait passer un jeton d'un compte supprime.
async function compteDuJeton(requete, env) {
  const entete = requete.headers.get('authorization') || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : '';
  if (!jeton) return null;

  const reponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${jeton}`,
    },
  });
  if (!reponse.ok) return null;
  const utilisateur = await reponse.json().catch(() => null);
  return utilisateur?.id || null;
}

async function abonnementActif(compteId, env) {
  const reponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${compteId}` +
    '&select=statut,valide_jusqu_au',
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  if (!reponse.ok) return false;
  const lignes = await reponse.json().catch(() => []);
  const profil = Array.isArray(lignes) ? lignes[0] : null;
  if (!profil) return false;

  if (!['active', 'trialing'].includes(profil.statut)) return false;
  // valide_jusqu_au absent = abonnement en cours sans fin connue.
  if (!profil.valide_jusqu_au) return true;
  return new Date(profil.valide_jusqu_au) > new Date();
}

// Incremente et renvoie ce qui reste, ou -1 si le plafond est atteint.
// L'operation est faite par une fonction SQL et non par un lire-puis-ecrire
// ici : deux scans lances en meme temps consommeraient sinon un seul credit.
async function consommerCredit(compteId, env) {
  const reponse = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/consommer_scan`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_compte: compteId, p_mois: moisCourant(), p_plafond: PLAFOND_MENSUEL,
    }),
  });
  if (!reponse.ok) return -1;
  const restant = await reponse.json().catch(() => -1);
  return typeof restant === 'number' ? restant : -1;
}

// --- Lecture --------------------------------------------------------------

async function lireLaFeuille(image, typeMedia, env) {
  const reponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image',
            source: { type: 'base64', media_type: typeMedia, data: image } },
          { type: 'text', text: CONSIGNE },
        ],
      }],
      output_config: {
        format: { type: 'json_schema', schema: SCHEMA_SORTIE },
      },
    }),
  });

  if (!reponse.ok) {
    // Le detail part dans les journaux, jamais dans la reponse : il peut
    // contenir des elements de la requete.
    console.error('scan', reponse.status, await reponse.text().catch(() => ''));
    return null;
  }

  const message = await reponse.json().catch(() => null);
  // Un refus de securite rend 200 avec stop_reason refusal : sans ce
  // controle on lirait content[0] qui n'existe pas.
  if (!message || message.stop_reason === 'refusal') return null;

  const bloc = (message.content || []).find((b) => b.type === 'text');
  if (!bloc) return null;
  try {
    return JSON.parse(bloc.text);
  } catch (e) {
    return null;
  }
}

// --- Route ----------------------------------------------------------------

export async function lireFeuille(requete, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return erreur('La lecture de feuille n’est pas configurée.', 503);
  }

  const compteId = await compteDuJeton(requete, env);
  if (!compteId) return erreur('Connectez-vous pour utiliser cette fonction.', 401);

  if (!await abonnementActif(compteId, env)) {
    return erreur('Cette fonction fait partie de l’offre complète.', 402);
  }

  const corps = await requete.json().catch(() => null);
  const image = corps?.image;
  const typeMedia = corps?.type_media;
  if (typeof image !== 'string' || !image) {
    return erreur('Image manquante.', 400);
  }
  if (!TYPES_ACCEPTES.includes(typeMedia)) {
    return erreur('Format d’image non pris en charge.', 400);
  }
  // La chaine base64 pese environ 4/3 de l'image. On refuse AVANT d'appeler
  // le modele : une image trop lourde serait facturee pour rien.
  if (image.length * 3 / 4 > TAILLE_MAX_OCTETS) {
    return erreur('Image trop lourde : réduisez-la avant l’envoi.', 413);
  }

  // Le credit est consomme AVANT la lecture. Dans l'autre ordre, un appel
  // qui echoue a mi-chemin serait gratuit, et il suffirait de couper la
  // connexion a chaque fois pour scanner sans limite.
  const restant = await consommerCredit(compteId, env);
  if (restant < 0) {
    return erreur(
      `Vous avez atteint les ${PLAFOND_MENSUEL} feuilles de ce mois.`, 429);
  }

  const resultat = await lireLaFeuille(image, typeMedia, env);
  if (!resultat) {
    return erreur('La feuille n’a pas pu être lue. Réessayez.', 502);
  }

  return json({
    mode: resultat.mode || 'incertain',
    paires: Array.isArray(resultat.paires) ? resultat.paires : [],
    restant,
  });
}
