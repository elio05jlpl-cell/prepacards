# Consignes de travail sur prepacards.fr

Ce dépôt est développé **depuis deux comptes Claude à la fois** : un poste
Windows et une session cloud. Tout ce qui suit existe pour que les deux
puissent publier sans s'écraser.

---

## 1. Avant de toucher à quoi que ce soit

```
git fetch origin && git merge --ff-only origin/main
```

Puis commiter et pousser en fin de travail. **Rien ne se synchronise tout
seul** : un fichier écrit sur un disque n'existe pour l'autre compte
qu'après un `push`, et l'autre compte ne le voit qu'après son `fetch`.

Si un fichier semble avoir « régressé », c'est probablement une décision de
l'autre compte. Regarder `git log -- <fichier>` **avant** de le corriger.

En cas de travail simultané, se répartir les fichiers. Deux articles
différents ne posent aucun problème ; le même fichier, si.

---

## 2. Où sont les choses

| Quoi | Où |
|---|---|
| Sources à éditer | `source/content`, `source/templates`, `source/static`, `source/worker` |
| Site construit, servi par Cloudflare | la racine du dépôt |
| Documentation complète | `source/LISEZ-MOI.md` |

La racine est **entièrement régénérée** à chaque construction : n'y modifier
aucun fichier à la main, il serait effacé. Seuls `.git`, `.gitignore`,
`.gitattributes`, `source/` et `.github/` survivent.

**Piège :** le workflow `publier.yml` existe en deux exemplaires. Le build
recopie `source/static/` à la racine, ce qui écrase `.github/workflows/`.
La source de vérité est `source/static/.github/workflows/publier.yml`.

---

## 3. Construire et vérifier

Depuis la racine du dépôt :

```
PREPACARDS_SORTIE="$(pwd)" python source/build_site.py
PREPACARDS_SORTIE="$(pwd)" python source/audit_site.py
```

L'audit doit dire « Aucun problème détecté » avant tout `push`. Il vérifie
les liens morts, les titres trop longs, les descriptions hors bornes.

Pour vérifier aussi les articles **en attente**, avant de les livrer :

```
PREPACARDS_TOUT=1 PREPACARDS_SORTIE="$(pwd)" python source/build_site.py
PREPACARDS_TOUT=1 PREPACARDS_SORTIE="$(pwd)" python source/audit_site.py
```

Sans quoi un titre trop long dans un article qui paraît dans dix jours fera
échouer l'audit **ce jour-là**, donc bloquera la publication automatique —
et celle de tous les articles qui attendent derrière.

`PREPACARDS_TOUT` ne sert **jamais** à publier : cela sortirait la file
entière d'un coup.

### Avant de pousser des fichiers générés

Commiter d'abord, puis :

```
python source/verifier.py
```

Le script clone le **dernier commit** dans un dossier temporaire, y reconstruit
le site avec le script du commit, lance l'audit, et compare à ce qui est
commité : c'est exactement ce que fera l'action. Il échoue sur un fichier
généré dont le contenu diffère, une page produite mais jamais ajoutée au
commit, ou une page qui référence un fichier inexistant. Il ne regarde pas le
dossier de travail, d'où le « commiter d'abord ».

Une nuance : un article daté **avant** son commit prend la date du commit comme
`lastmod` (voir `derniere_modification`). Construit avant d'être commité puis
reconstruit après, il change donc de date, et le script signale l'écart :
reconstruire après le commit, puis commiter le résultat. Un article daté du
jour ou d'un jour futur, le cas ordinaire, n'est pas concerné.

Pourquoi : **un build local n'est pas celui de l'action.** Le 2 et le 4
octobre 2026, un `index.html` construit en local référençait des `.png` non
suivis par Git (le build essaie `.png` avant `.webp`) : neuf logos en 404 en
production, environ vingt heures. Ne laissez aucun fichier non suivi dans
`source/static/`.

---

## 4. Les articles

Un fichier par article dans `source/content/blog/`, avec en tête :

```
---
title: Titre de 65 caractères maximum, suffixe « | PrépaCards » compris
description: Entre 140 et 165 caractères.
date: 2026-10-05
slug: mon-article
---
```

Une date **postérieure à aujourd'hui** met l'article en file d'attente : il
reste dans le dépôt sans être construit ni listé, et paraît tout seul le
jour dit, grâce à l'action `.github/workflows/publier.yml` qui reconstruit
le site chaque matin à 6 h 05 UTC.

**Un article ne peut citer qu'un article paru avant lui.** La construction
le vérifie et s'arrête sinon : un lien vers un article pas encore publié
vaudrait 404 le jour de sa parution, l'audit arrêterait l'action
quotidienne, et plus rien ne sortirait — sans aucun signal ce jour-là.

---

## 5. Ne pas réintroduire de calcul dépendant de la machine

Trois défauts ont fait diverger les constructions des deux postes. Ils
étaient invisibles dans `git status`, et suffisaient à provoquer un conflit
à chaque publication croisée :

- **Empreintes de cache (`?v=`)** calculées sur les octets bruts. Les
  visuels d'articles sont des SVG, donc du texte : Git les rend en CRLF sous
  Windows et en LF sur Linux. Les fins de ligne sont désormais normalisées
  avant le calcul — **pour les fichiers texte seulement**, car normaliser un
  binaire changerait son empreinte sans raison.
- **`lastmod` du plan du site** pris sur la date du fichier, c'est-à-dire la
  date à laquelle chaque machine avait récupéré le dépôt. Il vient
  maintenant du dernier commit.
- **`.gitattributes`** impose LF à toutes les copies de travail.

Règle générale : la sortie doit dépendre **uniquement** du contenu des
sources. Jamais de l'horloge, jamais des dates de fichiers, jamais des
réglages Git locaux.

---

## 6. Secrets

Aucun secret dans le dépôt. Ils se déposent par
`npx wrangler secret put NOM`, qui les demande sans les afficher.

Ne jamais demander à l'utilisateur de coller un secret dans la
conversation : un secret qui transite par un message est à considérer comme
compromis et doit être renouvelé.

---

## 7. Architecture, au 29 septembre 2026

- **Comptes et authentification : Supabase**, appelé depuis le navigateur
  (`source/static/vendor/supabase.js`).
- **Worker Cloudflare** (`source/worker/index.js`) : uniquement le webhook
  Stripe, la suppression de compte et le webhook de profil. Tout le reste du
  trafic va aux fichiers statiques.
- **Paiement : Stripe**, par liens de paiement. Le rattachement au compte
  passe par `client_reference_id`.

Une première version des comptes reposait sur Cloudflare D1 ; elle a été
remplacée. Si du code D1 subsiste (`source/worker/schema.sql`, hachage
PBKDF2), c'est du code mort.
