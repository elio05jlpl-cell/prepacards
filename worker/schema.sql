-- Base des comptes PrepaCards (Supabase / Postgres)
-- ====================================================
--
-- Remplace l'ancien schema D1. L'authentification elle-meme (mots de
-- passe, jetons de session, connexion Google) est geree par Supabase Auth
-- (table interne auth.users, jamais touchee ici) : ce fichier ne cree que
-- les donnees PROPRES a PrepaCards, rattachees a chaque utilisateur.
--
-- Ce que la base contient, et surtout ce qu'elle NE contient PAS : une
-- adresse e-mail (dans auth.users), l'etat de l'abonnement, et si
-- l'eleve le demande, une sauvegarde CHIFFREE de ses paquets. Aucune
-- carte lisible : la sauvegarde est chiffree sur sa machine, avec une cle
-- derivee de son mot de passe, et le serveur ne recoit que des octets
-- qu'il ne peut pas ouvrir.
--
-- A executer une fois, dans Supabase : SQL Editor -> coller -> Run.

create extension if not exists pgcrypto;

-- --- Profils -----------------------------------------------------------
--
-- Un profil par utilisateur Supabase Auth, cree automatiquement a
-- l'inscription (voir le declencheur plus bas) : jamais de compte sans
-- profil, jamais l'inverse.

create table public.profiles (
    id                 uuid primary key references auth.users(id) on delete cascade,

    -- Identifiant transmis a Stripe dans le lien de paiement, rendu tel
    -- quel au webhook (client_reference_id). Permet de payer avec
    -- n'importe quelle adresse - celle de la carte, celle des parents -
    -- sans perdre le lien avec le compte. Pas secret : au pire, le
    -- connaitre permet d'OFFRIR un abonnement en payant pour ce compte.
    reference          text unique not null
                       default ('pc_' || replace(encode(gen_random_bytes(18), 'base64'), '/', '_')),

    -- Abonnement. « statut » suit le vocabulaire de Stripe pour qu'aucune
    -- traduction ne se perde entre les deux : trialing, active, past_due,
    -- canceled, ou vide quand la personne n'a jamais paye.
    statut             text not null default '',
    offre              text not null default '',   -- mensuel | annuel
    client_stripe      text,
    abonnement_stripe  text,
    -- Fin de la periode deja reglee : un abonnement resilie reste actif
    -- jusqu'a son terme, c'est elle qui fait foi cote application.
    valide_jusqu_au    timestamptz,
    maj_le             timestamptz,

    -- Rempli des l'inscription si Google avait deja verifie l'adresse, ou
    -- par le declencheur plus bas des que le lien de confirmation est
    -- suivi. Sert de repere au webhook de bienvenue : voir plus bas.
    confirme_le        timestamptz,
    -- Empeche un deuxieme envoi si Supabase rejoue la livraison du
    -- webhook de bienvenue - la mise a jour qui le pose a vrai ne reussit
    -- qu'une fois, voir gererWebhookProfil() cote Worker.
    accueil_envoye     boolean not null default false,

    cree_le            timestamptz not null default now()
);

create unique index idx_profiles_client_stripe on public.profiles (client_stripe);

alter table public.profiles enable row level security;

-- Chacun lit son propre profil, et seulement le sien.
create policy "profil_lecture_personnelle"
    on public.profiles for select
    using (auth.uid() = id);

-- Aucune policy d'ecriture pour les utilisateurs : le statut d'abonnement
-- ne doit changer que par le webhook Stripe, qui passe par la cle
-- service_role (laquelle contourne RLS). Un utilisateur qui pourrait
-- s'ecrire "active" s'offrirait l'abonnement gratuitement.

-- Creation automatique du profil des l'inscription (mot de passe ou
-- Google, Supabase Auth traite les deux de la meme facon en amont).
-- email_confirmed_at est deja rempli a cet instant pour un compte Google
-- (l'adresse est verifiee par Google avant meme d'atteindre Supabase) ;
-- il reste null pour une inscription par mot de passe, jusqu'au lien de
-- confirmation - voir le second declencheur juste apres.
create function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, confirme_le) values (new.id, new.email_confirmed_at);
    return new;
end;
$$;

create trigger apres_inscription
    after insert on auth.users
    for each row execute function public.gerer_nouvel_utilisateur();

-- Rattrape le cas d'une inscription par mot de passe : email_confirmed_at
-- passe de null a une date quand le lien recu par e-mail est suivi. La
-- condition WHEN ne se declenche qu'a ce changement precis, jamais sur les
-- innombrables autres mises a jour d'auth.users (derniere connexion, etc.).
create function public.gerer_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.profiles set confirme_le = new.email_confirmed_at where id = new.id;
    return new;
end;
$$;

create trigger apres_confirmation
    after update on auth.users
    for each row
    when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
    execute function public.gerer_confirmation_email();

-- --- Sauvegarde chiffree -------------------------------------------------
--
-- Une seule par compte : ce qu'on veut, c'est retrouver son travail sur
-- une machine neuve, pas tenir un historique de versions dont personne ne
-- se sert.

create table public.sauvegardes (
    compte_id   uuid primary key references public.profiles(id) on delete cascade,
    -- Chiffre cote client, illisible ici. En texte (base64) plutot qu'en
    -- bytea : c'est le format que l'application envoie deja, et cela evite
    -- toute surprise de representation cote PostgREST.
    contenu     text not null,
    -- Empreinte du contenu d'origine, verifiee a la reprise : une
    -- sauvegarde corrompue doit se signaler, jamais se rendre en silence.
    empreinte   text not null default '',
    octets      integer not null,
    cartes      integer not null default 0,   -- pour l'affichage seulement
    depose_le   timestamptz not null default now()
);

alter table public.sauvegardes enable row level security;

-- Chacun gere sa propre sauvegarde (lecture, depot, remplacement) : ce
-- n'est plus le Worker qui s'en charge, l'application et le site parlent
-- directement a Supabase avec le jeton de l'utilisateur connecte.
create policy "sauvegarde_personnelle"
    on public.sauvegardes for all
    using (auth.uid() = compte_id)
    with check (auth.uid() = compte_id);

-- --- Evenements Stripe deja traites --------------------------------------
--
-- Stripe peut rejouer un evenement en cas de doute sur la livraison :
-- appliquer deux fois une resiliation n'est pas anodin.

create table public.evenements_stripe (
    id        text primary key,
    recu_le   timestamptz not null default now()
);

alter table public.evenements_stripe enable row level security;
-- Aucune policy : seule la cle service_role (Worker, webhook Stripe) y
-- touche, et elle contourne RLS.

-- --- Fonctions pour le webhook Stripe -------------------------------------
--
-- Le Worker n'ecrit jamais une ligne de profils au nom de Stripe : il
-- appelle ces deux fonctions avec la cle service_role. La logique de
-- rattachement (par reference, par adresse, par identifiant client) vit
-- ici, en SQL, plutot que dans le Worker : plus facile a relire et a
-- tester d'un bloc, exactement comme avant dans l'ancien Worker D1.
--
-- Le EXECUTE est retire a anon/authenticated juste apres leur creation :
-- un utilisateur qui pourrait s'auto-crediter un abonnement en appelant
-- directement la fonction annulerait toute la protection de RLS.

create function public.trouver_compte_stripe(
    p_reference text, p_email text, p_client_stripe text
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_id uuid;
begin
    if p_reference is not null and p_reference <> '' then
        select id into v_id from public.profiles where reference = p_reference;
        if v_id is not null then return v_id; end if;
    end if;
    if p_email is not null and p_email <> '' then
        select id into v_id from auth.users where lower(email) = lower(p_email);
        if v_id is not null then return v_id; end if;
    end if;
    if p_client_stripe is not null and p_client_stripe <> '' then
        select id into v_id from public.profiles where client_stripe = p_client_stripe;
        if v_id is not null then return v_id; end if;
    end if;
    return null;
end;
$$;

create function public.appliquer_maj_stripe(
    p_id uuid, p_statut text, p_offre text, p_client_stripe text,
    p_abonnement_stripe text, p_valide_jusqu_au timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.profiles set
        statut = coalesce(p_statut, statut),
        offre = coalesce(p_offre, offre),
        client_stripe = coalesce(p_client_stripe, client_stripe),
        abonnement_stripe = coalesce(p_abonnement_stripe, abonnement_stripe),
        valide_jusqu_au = coalesce(p_valide_jusqu_au, valide_jusqu_au),
        maj_le = now()
    where id = p_id;
end;
$$;

revoke execute on function public.trouver_compte_stripe(text, text, text)
    from public, anon, authenticated;
revoke execute on function public.appliquer_maj_stripe(uuid, text, text, text, text, timestamptz)
    from public, anon, authenticated;
grant execute on function public.trouver_compte_stripe(text, text, text) to service_role;
grant execute on function public.appliquer_maj_stripe(uuid, text, text, text, text, timestamptz) to service_role;


-- ---------------------------------------------------------------------------
-- Quota de lecture de feuilles photographiees
-- ---------------------------------------------------------------------------
--
-- Chaque lecture appelle un modele de vision, qui se facture. Le plafond
-- protege contre l'abus : sans lui, un seul compte peut consommer en une
-- soiree ce que rapportent plusieurs abonnements.
--
-- Le compteur vit cote serveur et non dans l'application : l'application
-- est sur la machine de l'eleve, et tout ce qu'elle compte est modifiable.

create table if not exists public.usages_scan (
    compte_id uuid not null references public.profiles(id) on delete cascade,
    mois      text not null,              -- 'AAAA-MM', en UTC
    nombre    integer not null default 0,
    primary key (compte_id, mois)
);

alter table public.usages_scan enable row level security;
-- Aucune policy : seule la cle service_role (le Worker) y touche.

-- Incremente et renvoie ce qui RESTE, ou -1 si le plafond est atteint.
--
-- Tout tient dans une seule instruction, et c'est le point important : un
-- « lire puis ecrire » depuis le Worker laisserait deux scans lances en
-- meme temps ne consommer qu'un credit. Le « where » de la clause de
-- conflit fait echouer la mise a jour au plafond, ce qui ne renvoie aucune
-- ligne - d'ou le nombre nul teste ensuite.
create or replace function public.consommer_scan(
    p_compte uuid, p_mois text, p_plafond integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nombre integer;
begin
    insert into public.usages_scan (compte_id, mois, nombre)
    values (p_compte, p_mois, 1)
    on conflict (compte_id, mois) do update
        set nombre = public.usages_scan.nombre + 1
        where public.usages_scan.nombre < p_plafond
    returning nombre into v_nombre;

    if v_nombre is null then
        return -1;
    end if;
    return p_plafond - v_nombre;
end;
$$;

revoke execute on function public.consommer_scan(uuid, text, integer)
    from public, anon, authenticated;
grant execute on function public.consommer_scan(uuid, text, integer) to service_role;
