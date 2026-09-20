-- Base des comptes PrepaCards (Cloudflare D1)
-- ===========================================
--
-- Ce que cette base contient, et surtout ce qu'elle NE contient PAS.
--
-- Elle stocke une adresse e-mail, une empreinte de mot de passe, l'etat de
-- l'abonnement et, si l'utilisateur le demande, une sauvegarde CHIFFREE de
-- ses paquets. Elle ne contient aucune carte lisible : la sauvegarde est
-- chiffree sur la machine de l'eleve, avec une cle derivee de son mot de
-- passe, et le serveur ne recoit que des octets qu'il ne peut pas ouvrir.
--
-- C'est ce qui permet de continuer a dire que les cartes ne sortent pas de
-- l'ordinateur : ce qui sort est illisible sans le mot de passe, lequel
-- n'est jamais transmis en clair et n'est pas conserve.
--
-- Application :  npx wrangler d1 execute prepacards --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS comptes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Toujours en minuscules : « Elio@… » et « elio@… » sont la meme
    -- personne, et deux comptes pour une seule boite aux lettres rendraient
    -- l'abonnement introuvable au moment ou on en a besoin.
    email           TEXT NOT NULL UNIQUE,
    sel             TEXT NOT NULL,   -- base64
    empreinte       TEXT NOT NULL,   -- base64, PBKDF2-HMAC-SHA256
    iterations      INTEGER NOT NULL,
    cree_le         TEXT NOT NULL,

    -- Abonnement. « statut » suit le vocabulaire de Stripe pour qu'aucune
    -- traduction ne se perde entre les deux : trialing, active, past_due,
    -- canceled, ou vide quand la personne n'a jamais payé.
    statut          TEXT NOT NULL DEFAULT '',
    offre           TEXT NOT NULL DEFAULT '',   -- mensuel | annuel
    client_stripe   TEXT,
    abonnement_stripe TEXT,
    -- Fin de la periode deja reglee. C'est elle qui fait foi cote
    -- application : un abonnement resilie reste actif jusqu'a son terme.
    valide_jusqu_au TEXT,
    maj_le          TEXT,

    -- Identifiant opaque transmis a Stripe dans le lien de paiement, et
    -- rendu tel quel par le webhook (client_reference_id). Il permet de
    -- payer avec n'importe quelle adresse - celle de la carte, celle des
    -- parents - sans perdre le lien avec le compte.
    --
    -- Il n'est pas secret et n'ouvre rien : le connaitre permet au mieux
    -- d'OFFRIR un abonnement a ce compte en payant pour lui. Il est
    -- neanmoins tire au hasard plutot que derive de l'identifiant, qui se
    -- compte de 1 en 1 et laisserait deviner combien de comptes existent.
    reference       TEXT
);

CREATE INDEX IF NOT EXISTS idx_comptes_client
    ON comptes (client_stripe);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comptes_reference
    ON comptes (reference);

-- Identifiant Google stable (« sub »). Conserve pour retrouver le compte
-- meme si la personne change l'adresse de son compte Google, ce que
-- l'adresse seule ne permettrait pas.
ALTER TABLE comptes ADD COLUMN google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comptes_google
    ON comptes (google_sub);

-- Codes a usage unique remis au navigateur au retour de Google.
--
-- Le jeton de session ne voyage PAS dans l'adresse : une adresse reste
-- dans l'historique, dans les journaux d'un proxy, dans une capture
-- d'ecran envoyee a un camarade. Le navigateur recoit donc un code qui ne
-- sert qu'une fois et ne vaut que quelques minutes, et l'echange contre le
-- vrai jeton par une requete POST.
CREATE TABLE IF NOT EXISTS codes_connexion (
    empreinte  TEXT PRIMARY KEY,   -- SHA-256 du code, jamais le code
    compte_id  INTEGER NOT NULL,
    cree_le    TEXT NOT NULL,
    expire_le  TEXT NOT NULL,
    FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE
);

-- Liens de reinitialisation du mot de passe.
--
-- Meme principe que ci-dessus, et les memes raisons : seule l'empreinte du
-- jeton est conservee, si bien qu'une fuite de la base ne donne aucun lien
-- utilisable. Un lien vaut une heure et ne sert qu'une fois.
--
-- « demande_le » sert a limiter les envois : sans cela, n'importe qui peut
-- faire pleuvoir des e-mails sur l'adresse de quelqu'un d'autre en
-- rechargeant une page.
CREATE TABLE IF NOT EXISTS reinitialisations (
    empreinte   TEXT PRIMARY KEY,
    compte_id   INTEGER NOT NULL,
    cree_le     TEXT NOT NULL,
    expire_le   TEXT NOT NULL,
    utilise_le  TEXT,
    FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reinit_compte
    ON reinitialisations (compte_id, cree_le);

-- Jetons de session, remis a l'application et au site apres connexion.
-- Stockes haches : une fuite de la base ne doit pas donner des sessions
-- utilisables, exactement comme pour les mots de passe.
CREATE TABLE IF NOT EXISTS sessions (
    empreinte_jeton TEXT PRIMARY KEY,
    compte_id       INTEGER NOT NULL,
    cree_le         TEXT NOT NULL,
    expire_le       TEXT NOT NULL,
    origine         TEXT NOT NULL DEFAULT '',  -- application | site
    FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_compte
    ON sessions (compte_id);

-- Sauvegarde chiffree des paquets. Une seule par compte : ce qu'on veut,
-- c'est retrouver son travail sur une machine neuve, pas tenir un
-- historique de versions dont personne ne se sert.
CREATE TABLE IF NOT EXISTS sauvegardes (
    compte_id     INTEGER PRIMARY KEY,
    -- En base64 et non en BLOB. D1 ne rend pas les colonnes binaires sous
    -- une forme exploitable telle quelle : un essai de bout en bout a
    -- rendu une sauvegarde VIDE, sans la moindre erreur. Sur des donnees
    -- irremplacables, la previsibilite vaut mieux que les 33 % d'espace
    -- economises.
    contenu       TEXT NOT NULL,     -- chiffre cote client, illisible ici
    -- Empreinte du contenu d'origine, verifiee a la reprise : une
    -- sauvegarde corrompue doit se signaler, jamais se rendre en silence.
    empreinte     TEXT NOT NULL DEFAULT '',
    octets        INTEGER NOT NULL,
    cartes        INTEGER NOT NULL DEFAULT 0,   -- pour l'affichage seulement
    depose_le     TEXT NOT NULL,
    FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE
);

-- Evenements Stripe deja traites. Stripe peut rejouer un evenement, et
-- appliquer deux fois une resiliation n'est pas anodin.
CREATE TABLE IF NOT EXISTS evenements_stripe (
    id        TEXT PRIMARY KEY,
    recu_le   TEXT NOT NULL
);
