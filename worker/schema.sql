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

-- --------------------------------------------------------------------------
-- Un compte existe-t-il pour cette adresse ?
--
-- Appelee par le Worker (POST /api/compte/existe) avec la cle service_role,
-- jamais par le navigateur : la table auth.users ne doit pas etre lisible
-- depuis l'exterieur. Ne rend que trois booleens.
-- --------------------------------------------------------------------------
create or replace function public.compte_existe(p_email text)
returns jsonb
language sql
security definer
set search_path = public, auth
stable
as $$
    select coalesce(
        (select jsonb_build_object(
                    'existe', true,
                    'mot_de_passe', coalesce(bool_or(i.provider = 'email'), false),
                    'google', coalesce(bool_or(i.provider = 'google'), false))
           from auth.users u
           left join auth.identities i on i.user_id = u.id
          where lower(u.email) = lower(p_email)
          group by u.id
          limit 1),
        jsonb_build_object('existe', false, 'mot_de_passe', false, 'google', false));
$$;

revoke execute on function public.compte_existe(text) from public, anon, authenticated;
grant execute on function public.compte_existe(text) to service_role;

-- --------------------------------------------------------------------------
-- Liste d'attente : Mac, iPhone, Android
--
-- Alimentee par le Worker (POST /api/attente) avec la cle service_role.
-- Aucune policy : ni le navigateur ni l'application ne peuvent la lire ou
-- l'ecrire. Une adresse, une fois : une seconde inscription est ignoree.
-- Elle sert a decider de l'ordre des portages, puis a prevenir une fois.
-- --------------------------------------------------------------------------
create table if not exists public.liste_attente (
    id          bigint generated always as identity primary key,
    email       text not null unique,
    plateformes text[] not null default '{}',
    cree_le     timestamptz not null default now()
);

alter table public.liste_attente enable row level security;


-- --- Prepa d'origine ---------------------------------------------------
--
-- Renseignee par l'application a la premiere ouverture, via la route
-- /api/prepa du Worker (aucune policy d'ecriture pour l'utilisateur : c'est
-- ce qui protege le statut d'abonnement). Facultative.
--
-- Deja installe ? Executer seulement ce bloc, dans Supabase : SQL Editor.

alter table public.profiles
    add column if not exists filiere     text,
    add column if not exists prepa_uai   text,
    add column if not exists prepa_nom   text,
    add column if not exists prepa_ville text,
    add column if not exists prepa_le    timestamptz;

-- D'ou viennent les etudiants (a lancer dans le SQL Editor) :
--
--   select prepa_nom, prepa_ville, filiere, count(*) as etudiants
--   from public.profiles
--   where prepa_uai is not null
--   group by 1, 2, 3
--   order by etudiants desc;


-- --- Essai gratuit de 30 jours, sans carte bancaire -------------------------
--
-- Chaque compte dispose de 30 jours d'acces complet a partir de son
-- inscription. Au dela, il faut un abonnement actif. La date est posee par la
-- valeur par defaut : le declencheur d'inscription n'a rien a changer.
--
-- Deja installe ? Executer ce bloc une fois, dans Supabase : SQL Editor.
-- Les comptes existants recoivent 30 jours A PARTIR DE CETTE EXECUTION - c'est
-- le jour de la bascule vers l'offre payante, pas leur date d'inscription.

alter table public.profiles
    add column if not exists essai_fin timestamptz;

alter table public.profiles
    alter column essai_fin set default (now() + interval '30 days');

update public.profiles
   set essai_fin = now() + interval '30 days'
 where essai_fin is null;


-- --- Rapports d'erreurs de l'application ------------------------------------
--
-- Alimentee par POST /api/rapport (Worker, cle service_role). Aucune identite :
-- ni compte, ni adresse, ni IP. Aucune policy : ni le navigateur ni
-- l'application ne peuvent la lire ou y ecrire directement.
--
-- Deja installe ? Executer ce bloc une fois, dans Supabase : SQL Editor.
--
-- Lire les derniers rapports :
--   select recu_le, version, systeme, contenu->'erreurs'->0->>'type' as type,
--          contenu->'erreurs'->0->>'message' as message
--   from public.rapports_erreurs order by recu_le desc limit 50;

create table if not exists public.rapports_erreurs (
    id        bigint generated always as identity primary key,
    recu_le   timestamptz not null default now(),
    version   text not null,
    systeme   text not null default '',
    contenu   jsonb not null
);

alter table public.rapports_erreurs enable row level security;

create index if not exists rapports_erreurs_recu_le
    on public.rapports_erreurs (recu_le desc);


-- --- Un seul essai gratuit par boite aux lettres ----------------------------
--
-- Sans cela, « eleve+1@gmail.com », « eleve+2@gmail.com » ou « e.leve@gmail.com »
-- sont autant de comptes neufs, donc autant d'essais de 30 jours pour la meme
-- personne. On ramene l'adresse a sa forme canonique (partie « +etiquette »
-- retiree, points ignores chez Gmail) : si un AUTRE compte a deja la meme
-- adresse canonique, le nouveau compte se cree normalement mais sans essai
-- (essai_fin = maintenant).
--
-- Ce que cela ne fait PAS : empecher quelqu'un de creer une boite jetable
-- differente. Ce n'est pas le but ; il s'agit de couper le contournement
-- trivial, sans suivre les appareils ni conserver d'identifiant.
--
-- Le declencheur ne doit JAMAIS empecher une inscription : toute erreur
-- interne laisse la ligne passer telle quelle.
--
-- Deja installe ? Executer ce bloc une fois, dans Supabase : SQL Editor.

create or replace function public.email_canonique(p_email text)
returns text
language sql
immutable
as $$
  select case
    when s.l = '' or s.d = '' then lower(coalesce(p_email, ''))
    when s.d in ('gmail.com', 'googlemail.com')
      then replace(split_part(s.l, '+', 1), '.', '') || '@gmail.com'
    else split_part(s.l, '+', 1) || '@' || s.d
  end
  from (
    select split_part(lower(coalesce(p_email, '')), '@', 1) as l,
           split_part(lower(coalesce(p_email, '')), '@', 2) as d
  ) s;
$$;

create or replace function public.limiter_essai_doublon()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_canon text;
begin
  select email into v_email from auth.users where id = new.id;
  if v_email is null then
    return new;
  end if;
  v_canon := public.email_canonique(v_email);
  if exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id <> new.id
       and public.email_canonique(u.email) = v_canon
  ) then
    new.essai_fin := now();
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists limiter_essai_doublon on public.profiles;
create trigger limiter_essai_doublon
    before insert on public.profiles
    for each row execute function public.limiter_essai_doublon();

-- Verifier la forme canonique (doit rendre 'eleve@gmail.com' quatre fois) :
--   select public.email_canonique(x) from (values
--     ('Eleve@gmail.com'), ('e.leve+2@gmail.com'), ('ELEVE+prepa@googlemail.com'),
--     ('eleve@gmail.com')) as t(x);


-- --- Phase 2 : consentement, e-mails d'essai, tableau de bord, administration -
--
-- Tout ce bloc est rejouable (create or replace, if not exists).
-- Deja installe ? Executer ce bloc une fois, dans Supabase : SQL Editor.

-- Consentement aux e-mails de conseils (J+1, J+7). Les rappels de fin d'essai
-- sont un service lie au compte et n'en dependent pas. Faux par defaut : on ne
-- pre-coche rien, et les comptes existants ne recoivent donc aucun conseil.
alter table public.profiles
    add column if not exists marketing_ok boolean not null default false,
    add column if not exists marketing_le timestamptz;

-- Le profil lit le consentement dans les metadonnees posees par le formulaire
-- d'inscription (options.data.marketing). Toute valeur illisible vaut « non ».
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_marketing boolean := false;
begin
    begin
        v_marketing := coalesce((new.raw_user_meta_data->>'marketing')::boolean, false);
    exception when others then
        v_marketing := false;
    end;
    insert into public.profiles (id, confirme_le, marketing_ok, marketing_le)
    values (new.id, new.email_confirmed_at, v_marketing,
            case when v_marketing then now() end);
    return new;
end;
$$;

-- Un e-mail, une fois : la cle (compte, type) empeche tout doublon, meme si le
-- planificateur tourne deux fois ou si deux instances se chevauchent.
create table if not exists public.emails_envoyes (
    user_id   uuid not null references auth.users(id) on delete cascade,
    type      text not null,
    envoye_le timestamptz not null default now(),
    primary key (user_id, type)
);

alter table public.emails_envoyes enable row level security;
-- Aucune policy : seule la cle service_role (le Worker) y touche.

-- Qui doit recevoir quoi aujourd'hui. Les fenetres de temps bornent chaque
-- envoi : a la mise en service, un compte vieux de deux mois ne recoit pas un
-- « bienvenue » tardif.
--   essai_j1   conseils, le lendemain de l'inscription        (consentement)
--   essai_j7   conseils, une semaine apres                    (consentement)
--   essai_j25  rappel : l'essai se termine dans quelques jours
--   essai_j31  l'essai est termine, rien n'est perdu (export possible)
-- Les comptes abonnes n'en recoivent aucun.
create or replace function public.emails_essai_a_envoyer()
returns table (uid uuid, adresse text, genre text, jours integer, promo boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
    with base as (
        select p.id, u.email, p.marketing_ok, p.essai_fin,
               p.essai_fin - interval '30 days' as debut
          from public.profiles p
          join auth.users u on u.id = p.id
         where p.confirme_le is not null
           and u.email is not null
           and p.essai_fin is not null
           and not (p.statut in ('trialing', 'active', 'past_due')
                    and coalesce(p.valide_jusqu_au, now() + interval '1 day') > now())
    ), candidats as (
        select id, email, 'essai_j1'::text as genre, true as promo, essai_fin
          from base
         where marketing_ok
           and now() >= debut + interval '1 day' and now() < debut + interval '4 days'
        union all
        select id, email, 'essai_j7', true, essai_fin
          from base
         where marketing_ok
           and now() >= debut + interval '7 days' and now() < debut + interval '10 days'
        union all
        select id, email, 'essai_j25', false, essai_fin
          from base
         where now() >= debut + interval '25 days' and now() < essai_fin
        union all
        select id, email, 'essai_j31', false, essai_fin
          from base
         where now() >= essai_fin + interval '1 day'
           and now() < essai_fin + interval '4 days'
    )
    select c.id, c.email, c.genre,
           greatest(0, ceil(extract(epoch from (c.essai_fin - now())) / 86400))::integer,
           c.promo
      from candidats c
     where not exists (select 1 from public.emails_envoyes e
                        where e.user_id = c.id and e.type = c.genre);
$$;

-- Reserve l'envoi AVANT de l'effectuer : si deux executions se chevauchent,
-- une seule obtient « vrai ». Si l'envoi echoue, liberer_email() rend la place
-- et le lendemain retentera.
create or replace function public.reserver_email(p_user uuid, p_type text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    n integer;
begin
    insert into public.emails_envoyes (user_id, type) values (p_user, p_type)
    on conflict do nothing;
    get diagnostics n = row_count;
    return n > 0;
end;
$$;

create or replace function public.liberer_email(p_user uuid, p_type text)
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.emails_envoyes where user_id = p_user and type = p_type;
$$;

revoke execute on function public.emails_essai_a_envoyer() from public, anon, authenticated;
revoke execute on function public.reserver_email(uuid, text) from public, anon, authenticated;
revoke execute on function public.liberer_email(uuid, text) from public, anon, authenticated;
grant execute on function public.emails_essai_a_envoyer() to service_role;
grant execute on function public.reserver_email(uuid, text) to service_role;
grant execute on function public.liberer_email(uuid, text) to service_role;

-- Tableau de bord : une seule requete, un seul objet JSON. Une FONCTION et non
-- une vue : une vue du schema public serait lisible par n'importe qui via
-- l'API tant qu'on ne l'a pas verrouillee, une fonction dont l'execution est
-- reservee a service_role ne l'est jamais.
-- Lecture : python source/outils/tableau_de_bord.py
create or replace function public.tableau_de_bord()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
    with p as (
        select *,
               (statut in ('trialing', 'active', 'past_due')
                and coalesce(valide_jusqu_au, now() + interval '1 day') > now()) as abonne
          from public.profiles
    )
    select jsonb_build_object(
        'genere_le', now(),
        'comptes', (select count(*) from p),
        'confirmes', (select count(*) from p where confirme_le is not null),
        'inscrits_7j', (select count(*) from p where cree_le > now() - interval '7 days'),
        'inscrits_30j', (select count(*) from p where cree_le > now() - interval '30 days'),
        'en_essai', (select count(*) from p
                      where not abonne and essai_fin > now() and confirme_le is not null),
        'essai_termine_sans_abonnement', (select count(*) from p
                      where not abonne and essai_fin <= now()),
        'abonnes_actifs', (select count(*) from p where abonne),
        'abonnes_mensuels', (select count(*) from p where abonne and offre = 'mensuel'),
        'abonnes_annuels', (select count(*) from p where abonne and offre = 'annuel'),
        'revenu_mensuel_estime_eur', (select round(
              coalesce(sum(case when offre = 'annuel' then 95.90 / 12 else 9.99 end), 0)::numeric, 2)
              from p where abonne),
        'resilies', (select count(*) from p where statut = 'canceled'),
        -- Part de ceux qui ont fini l'essai et sont devenus abonnes.
        'conversion_pct', (select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where statut <> '') / count(*), 1) end
              from p where essai_fin <= now() or abonne),
        -- Activation (approximation) : a depose une sauvegarde, ou lu une feuille.
        'avec_sauvegarde', (select count(*) from public.sauvegardes),
        'ont_scanne', (select count(distinct compte_id) from public.usages_scan),
        'consentement_conseils', (select count(*) from p where marketing_ok),
        'emails_envoyes_par_type', coalesce((select jsonb_object_agg(type, n) from (
              select type, count(*) as n from public.emails_envoyes group by type) t), '{}'::jsonb),
        'prepas_principales', coalesce((select jsonb_agg(x) from (
              select coalesce(prepa_nom, '(non renseigne)') as prepa, filiere, count(*) as comptes
                from p group by 1, 2 order by 3 desc limit 10) x), '[]'::jsonb),
        'rapports_erreurs_7j_par_version', coalesce((select jsonb_object_agg(version, n) from (
              select version, count(*) as n from public.rapports_erreurs
               where recu_le > now() - interval '7 days' group by version) r), '{}'::jsonb),
        'liste_attente', coalesce((select jsonb_object_agg(pf, n) from (
              select pf, count(*) as n from public.liste_attente, unnest(plateformes) as pf
               group by pf) l), '{}'::jsonb)
    );
$$;

-- Administration : agir sur un compte par son adresse. Reserve a service_role,
-- appelees par python source/outils/admin.py avec la cle gardee dans votre
-- environnement - jamais depuis le site.
create or replace function public.admin_etat_compte(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
    select coalesce((
        select jsonb_build_object(
            'id', u.id, 'email', u.email, 'cree_le', p.cree_le,
            'confirme_le', p.confirme_le, 'essai_fin', p.essai_fin,
            'statut', p.statut, 'offre', p.offre,
            'valide_jusqu_au', p.valide_jusqu_au,
            'client_stripe', p.client_stripe,
            'conseils', p.marketing_ok,
            'emails_envoyes', coalesce((select jsonb_agg(e.type order by e.envoye_le)
                from public.emails_envoyes e where e.user_id = u.id), '[]'::jsonb))
          from auth.users u join public.profiles p on p.id = u.id
         where lower(u.email) = lower(p_email)
         limit 1), jsonb_build_object('erreur', 'aucun compte'));
$$;

create or replace function public.admin_prolonger_essai(p_email text, p_jours integer)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_id uuid;
begin
    if p_jours is null or p_jours < -365 or p_jours > 365 then
        return jsonb_build_object('erreur', 'jours hors limites (-365 a 365)');
    end if;
    select u.id into v_id from auth.users u where lower(u.email) = lower(p_email) limit 1;
    if v_id is null then
        return jsonb_build_object('erreur', 'aucun compte');
    end if;
    update public.profiles
       set essai_fin = greatest(coalesce(essai_fin, now()), now()) + make_interval(days => p_jours)
     where id = v_id;
    -- Un essai prolonge doit pouvoir rappeler sa fin a nouveau.
    delete from public.emails_envoyes
     where user_id = v_id and type in ('essai_j25', 'essai_j31');
    return public.admin_etat_compte(p_email);
end;
$$;

revoke execute on function public.tableau_de_bord() from public, anon, authenticated;
revoke execute on function public.admin_etat_compte(text) from public, anon, authenticated;
revoke execute on function public.admin_prolonger_essai(text, integer) from public, anon, authenticated;
grant execute on function public.tableau_de_bord() to service_role;
grant execute on function public.admin_etat_compte(text) to service_role;
grant execute on function public.admin_prolonger_essai(text, integer) to service_role;
