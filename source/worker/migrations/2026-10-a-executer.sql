-- A EXECUTER UNE FOIS dans Supabase : SQL Editor -> New query -> coller -> Run
-- ============================================================================
-- Regroupe, dans l'ordre, les trois blocs recents de schema.sql :
--   1. rapports d'erreurs de l'application
--   2. un seul essai gratuit par boite aux lettres
--   3. phase 2 : consentement, e-mails d'essai, tableau de bord, administration
-- Tout est rejouable sans dommage (create or replace / if not exists).
-- Genere depuis schema.sql : ne pas editer ici.
-- ============================================================================

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
