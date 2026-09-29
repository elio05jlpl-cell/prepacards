# Site prepacards.fr — mode d'emploi

Site statique complet : 16 pages, dont 4 articles de blog. Poids total du site
publié : environ 490 Ko, sans aucun framework JavaScript.

---

## 1. Mettre le site en ligne (10 minutes)

### Le nom de domaine

Vérifié disponible au moment de la rédaction, via les registres eux-mêmes
(RDAP) : `prepacards.fr`, `prepacards.com`, `prepacards.app`, `prepacards.net`.

Recommandation : **`prepacards.fr`** en principal (public français, « prépa »
et droit français n'ont pas de sens à l'international, et le `.fr` inspire
confiance sur ce créneau), plus `prepacards.com` en défensif. Comptez environ
7 à 15 € par an et par domaine. Vérifiez de nouveau la disponibilité au moment
de l'achat : elle peut avoir changé.

Registrars corrects pour un `.fr` : OVH, Gandi, Infomaniak, Cloudflare
Registrar (le moins cher, mais il faut déjà utiliser Cloudflare).

### L'hébergement — vous avez le domaine chez OVH

Acheter un domaine chez OVH ne fournit pas d'hébergement : il faut encore un
endroit qui serve les fichiers. Deux chemins, selon ce que vous préférez.

#### ⚠️ À faire AVANT toute manipulation DNS

Ouvrez OVH → *Noms de domaine* → `prepacards.fr` → onglet **Zone DNS**, et
**notez ou faites une capture de tous les enregistrements existants**, en
particulier les lignes **MX** (la messagerie) et **TXT**.

Si vous avez activé l'adresse e-mail incluse avec le domaine OVH, changer les
serveurs DNS (chemin A) **coupe votre messagerie** tant que vous n'avez pas
recréé ces MX ailleurs. C'est l'erreur la plus fréquente, et la plus pénible à
diagnostiquer après coup.

#### Chemin A — Cloudflare Pages (recommandé)

Gratuit, très rapide partout dans le monde, HTTPS automatique. Le seul point
d'attention : pour que `prepacards.fr` (sans `www`) fonctionne, il faut confier
les serveurs DNS à Cloudflare. Le DNS d'OVH ne sait pas pointer un domaine
racine vers un service comme Pages.

1. Créez un compte sur `dash.cloudflare.com`, puis *Add a domain* →
   `prepacards.fr` → offre **Free**.
2. Cloudflare analyse la zone existante et affiche **deux serveurs de noms**
   (du type `xxx.ns.cloudflare.com`). Copiez-les.
3. Dans OVH : *Noms de domaine* → `prepacards.fr` → onglet **Serveurs DNS** →
   *Modifier les serveurs DNS* → remplacez par les deux de Cloudflare.
4. **Si vous aviez des MX**, recréez-les dans Cloudflare (*DNS* → *Records*)
   avec les valeurs notées à l'étape précédente.
5. Attendez la propagation : souvent une à deux heures, parfois jusqu'à 24 h.
   Cloudflare vous envoie un e-mail quand c'est actif.
6. Dans Cloudflare : *Workers & Pages* → *Create* → **Pages** →
   *Upload assets*.

   **Ouvrez le dossier `public/`, faites Ctrl+A, et glissez la sélection.**
   Ne glissez PAS le dossier `prepacards-site` : vous publieriez vos sources
   Markdown, vos gabarits et vos scripts de génération, et l'upload échouerait
   si une archive volumineuse s'y trouvait. Le dossier `public/` compte
   32 fichiers pour environ 500 Ko — si l'interface annonce beaucoup plus,
   c'est que vous avez glissé le mauvais dossier.
7. Dans le projet créé : *Custom domains* → ajoutez `prepacards.fr` **et**
   `www.prepacards.fr`. Cloudflare crée les enregistrements DNS tout seul.
8. Le certificat HTTPS s'active en quelques minutes. Rien à configurer.

Les fichiers `_headers` et `_redirects` du site sont pris en compte
automatiquement : en-têtes de sécurité, mise en cache, et redirection de
`www` vers l'adresse sans `www`.

Pour les mises à jour suivantes : *Deployments* → *Create new deployment* →
vous reglissez `public/`.

#### Chemin B — un hébergement OVH

Plus simple si vous ne voulez rien changer au DNS, et si votre messagerie OVH
doit continuer à fonctionner sans intervention. En revanche c'est payant, et
plus lent qu'un réseau de diffusion mondial.

1. Dans OVH, commandez un **hébergement web**. L'offre la plus modeste suffit
   très largement : le site pèse moins de 600 Ko.
2. Rattachez `prepacards.fr` à cet hébergement (OVH le propose pendant la
   commande, ou ensuite via *Multisite*).
3. Récupérez les identifiants **FTP** (OVH → *Hébergements* → *FTP - SSH*).
4. Avec FileZilla, connectez-vous et déposez le **contenu** de `public/` dans
   le dossier `www/`.
5. Activez le **certificat SSL gratuit** (onglet *Multisite* ou *SSL*), puis
   attendez sa délivrance.

Le fichier `.htaccess` fourni s'occupe du reste : redirection vers HTTPS,
suppression du `www`, compression, mise en cache et page 404.

**Avantage de ce chemin** : vous pouvez aussi y déposer l'archive
d'installation (258 Mo) dans un dossier `www/telechargements/`, et vous évitez
d'avoir à passer par GitHub. Mettez alors `DOWNLOAD_URL` à
`https://prepacards.fr/telechargements/PrepaCards-installateur.zip`.

#### Quel chemin choisir

| | Cloudflare Pages | Hébergement OVH |
|---|---|---|
| Prix | Gratuit | Payant, abonnement |
| Vitesse | Excellente, réseau mondial | Correcte, un seul serveur |
| Changement DNS | Oui, serveurs de noms | Aucun |
| Risque pour la messagerie | Réel si MX non recréés | Aucun |
| Fichier d'installation de 258 Mo | À héberger ailleurs | Sur le même hébergement |

### L'hébergement — autres plateformes

**Cloudflare Pages** est le meilleur choix ici : gratuit, très rapide,
certificat HTTPS automatique, et il sert des fichiers statiques mieux que
n'importe quel hébergement mutualisé.

1. Créez un compte sur `dash.cloudflare.com`.
2. *Workers & Pages* → *Create* → *Pages* → *Upload assets*.
3. Glissez le contenu du dossier **`public/`** (pas le dossier lui-même : son
   contenu).
4. *Custom domains* → ajoutez `prepacards.fr`, puis suivez les instructions de
   délégation DNS.

Netlify fonctionne exactement pareil (`app.netlify.com/drop`).

### Le fichier d'installation ne peut pas être hébergé sur le site

**Point important.** Cloudflare Pages refuse les fichiers de plus de 25 Mo, et
l'archive de PrépaCards en fait 258. Elle est donc rangée **hors du dossier du
site**, dans `Bureau\PrepaCards-archive\`, précisément pour qu'elle ne puisse
pas être emportée par un glisser-déposer. Il faut l'héberger ailleurs :

- **Releases GitHub** (recommandé) : gratuit, jusqu'à 2 Go par fichier. Créez
  un dépôt, *Releases* → *Draft a new release*, joignez l'archive.
- Cloudflare R2, ou un espace de stockage classique.

Ensuite, ouvrez `build_site.py` et remplacez `DOWNLOAD_URL` par l'adresse
réelle, puis relancez `python build_site.py`.

---

## 1 bis. Prévisualiser en local

```
python -m http.server 8765 --directory public
```

puis ouvrez `http://localhost:8765` dans votre navigateur.

---

## 2. Ajouter un article de blog

Créez `content/blog/mon-sujet.md` :

```markdown
---
title: Titre de moins de 60 caractères
description: Une phrase de 120 à 160 caractères qui donne envie de cliquer.
date: 2026-09-20
---

Le texte en Markdown.
```

Puis `python build_site.py`. Le sommaire du blog, le plan du site et les
métadonnées se mettent à jour seuls. Redéposez `public/` sur Cloudflare.

Contraintes à respecter, vérifiables avec l'audit (voir plus bas) :
titre ≤ 65 caractères, description entre 70 et 165, un seul `# Titre` par page.

### Un piège à connaître si vous mettez du HTML dans le Markdown

Python-Markdown **n'interprète pas** le Markdown placé à l'intérieur d'un bloc
HTML. Un tableau écrit dans un `<div>` ressort tel quel, barres verticales
comprises. Il faut ajouter `markdown="1"` sur le bloc, et sur chaque niveau
englobant :

```html
<section class="section" markdown="1">
<div class="conteneur-texte" markdown="1">

## Un titre

| a | b |
|---|---|

</div>
</section>
```

Et **sans jamais indenter** les lignes à l'intérieur : dans un bloc
`markdown="1"`, quatre espaces en début de ligne créent un bloc de code, et
votre balise s'affiche en clair au visiteur.

`audit_site.py` détecte les deux cas.

---

## 3. Avant la mise en ligne : ce qui doit être complété

| Fichier | À faire |
|---|---|
| `content/mentions-legales.md` | Votre identité, adresse, statut, **et le nom de l'hébergeur retenu**. Obligation légale. |
| `content/confidentialite.md` | Relire, compléter les durées de conservation |
| `content/cgv.md` | À compléter et **faire relire** avant toute vente |
| `build_site.py` → `DOWNLOAD_URL` | L'adresse réelle de l'archive. Tant qu'elle contient `VOTRE-COMPTE`, la page de téléchargement affiche un encadré « bientôt disponible » au lieu d'un lien mort, et la construction vous le signale. |
| Adresse `contact@prepacards.fr` | À créer chez votre registrar (redirection suffit) |

---

## 4. Ce qu'il reste à construire pour vendre Premium

La page `/tarifs/` est prête et présente l'offre, mais **l'encaissement n'est
pas branché**, et l'application ne vérifie aucune licence. Dans l'ordre :

1. **Un prestataire qui gère la TVA à votre place.** Lemon Squeezy ou Paddle
   agissent comme revendeur (*merchant of record*) : ils facturent, collectent
   la TVA européenne et la déclarent. Sans cela, vendre à des particuliers dans
   plusieurs pays de l'UE vous impose de gérer la TVA de chacun.
2. **Des clés de licence.** Ces deux prestataires en génèrent et fournissent
   une adresse de vérification.
3. **La vérification dans l'application.** Un champ « clé de licence » dans les
   réglages, une vérification en ligne au premier usage puis une validité mise
   en cache. C'est le seul développement réellement nécessaire côté
   application.
4. **Le bridage effectif.** Aujourd'hui, rien n'est limité : la reconnaissance
   de formules et la traduction fonctionnent pour tout le monde.

Tant que ce n'est pas en place, le bouton Premium invite à laisser son e-mail.
C'est volontaire : un bouton d'achat qui ne fonctionne pas coûte plus cher en
crédibilité qu'une liste d'attente assumée.

---

## 5. Plan de référencement — ce qui est réaliste

### Ce qui est déjà fait techniquement

Titres et descriptions uniques et à la bonne longueur, `canonical`, Open Graph
et Twitter Card, données structurées JSON-LD (`SoftwareApplication`, `Article`,
`FAQPage`), `sitemap.xml`, `robots.txt`, un seul H1 par page, images avec
attribut `alt`, maillage interne entre les pages, pages qui s'affichent
instantanément, affichage mobile vérifié.

Aucun `aggregateRating` n'est déclaré dans les données structurées : inventer
une note moyenne sans avis réels est une violation des règles de Google, qui
peut coûter l'affichage enrichi de tout le site.

### Ce qui ne l'est pas, et qu'il faut faire à la main

1. **Google Search Console** — `search.google.com/search-console`, ajoutez la
   propriété, soumettez `https://prepacards.fr/sitemap.xml`. Sans cela,
   l'indexation peut prendre des semaines au lieu de jours.
2. **Bing Webmaster Tools** — même démarche, cinq minutes, et cela alimente
   aussi les réponses de plusieurs assistants IA.

### Les délais réels

Il faut être clair, parce que les promesses de « première page en un mois »
sont fausses. Sur un domaine neuf, sans historique ni liens entrants :

| Requête | Difficulté | Délai raisonnable |
|---|---|---|
| `prepacards` | immédiat dès l'indexation | quelques jours |
| `flashcards droit des obligations` | faible (longue traîne) | 1 à 3 mois |
| `réviser crfpa flashcards` | faible | 1 à 3 mois |
| `alternative anki français` | moyenne | 3 à 8 mois |
| `flashcards prépa` | forte | 6 à 12 mois |
| `anki` / `quizlet` | hors d'atteinte | — |

Ce qui fait bouger ces délais n'est pas une astuce technique : c'est le
**nombre d'articles utiles** et le **nombre de sites qui vous citent**.

### La stratégie qui marche ici : la longue traîne

Ne visez pas « flashcards prépa ». Visez les questions précises que personne
ne traite bien, où vous pouvez être le meilleur résultat en un article :

- *réviser le vocabulaire d'allemand en prépa ECG*
- *comment faire des flashcards de droit des obligations*
- *anki ou quizlet pour la prépa*
- *combien de flashcards par jour en prépa*
- *réviser les formules de maths MPSI*
- *flashcards pour le grand oral du CRFPA*
- *comment retenir la jurisprudence*
- *exporter quizlet vers anki*

Un article par requête, 1 000 à 1 500 mots, qui répond vraiment. Deux articles
par mois valent mieux que dix bâclés.

### Les premiers visiteurs ne viendront pas de Google

Pendant les trois premiers mois, l'essentiel du trafic viendra d'ailleurs :

- **Reddit** : r/prepas, r/Anki, r/etudiants. Participez réellement avant de
  citer votre outil, sinon vous serez supprimé — et à juste titre.
- **Discord de prépas et de facs de droit**, très actifs.
- **Groupes Facebook** de promo et d'entraide CRFPA.
- **Bouche-à-oreille direct** : vos propres camarades de promo sont vos
  premiers utilisateurs, et leurs retours valent plus que tout référencement.

Ces visiteurs produisent aussi les premiers liens entrants, qui sont
précisément ce qui débloque le référencement ensuite.

### Deux pièges à éviter

- **N'achetez pas de liens.** C'est le moyen le plus rapide de faire
  déclasser un domaine neuf.
- **Ne dupliquez pas vos textes** sur plusieurs pages en changeant deux mots
  pour « couvrir plus de requêtes ». C'est exactement ce que les mises à jour
  récentes de Google sanctionnent.

---

## 6. Vérifier le site avant chaque mise en ligne

```
python build_site.py
python audit_site.py
```

L'audit contrôle : titres et descriptions uniques et de bonne longueur, liens
internes valides, images présentes et pourvues d'un `alt`, un seul H1 par page,
JSON-LD analysable, Markdown effectivement interprété, **aucun fichier de plus
de 25 Mo** (la limite de Cloudflare Pages) et **aucun fichier source** qui
partirait en ligne par erreur. Il doit afficher « Aucun problème détecté ».

Pour prévisualiser localement :

```
python -m http.server 8765 --directory public
```

puis ouvrez `http://localhost:8765`.

---

## 7. Organisation des fichiers

```
prepacards-site/
├── build_site.py         générateur (adresse du site, navigation, lien de téléchargement)
├── audit_site.py         contrôle technique avant publication
├── content/              les pages, en Markdown
│   ├── index.md          accueil
│   ├── prepa.md          page pour les prépas
│   ├── droit.md          page pour le droit
│   ├── fonctionnalites.md
│   ├── tarifs.md
│   ├── telecharger.md
│   ├── alternative-anki.md
│   ├── alternative-quizlet.md
│   ├── mentions-legales.md, confidentialite.md, cgv.md
│   └── blog/             un fichier = un article
├── templates/            base.html (pages) et article.html (blog)
├── static/               style.css et images, copiés tels quels
└── public/               LE SITE GÉNÉRÉ — c'est ce dossier qu'on met en ligne
```

Ne modifiez jamais `public/` à la main : il est effacé et reconstruit à chaque
exécution de `build_site.py`.

## Ajouter les logos des écoles au bandeau de l'accueil

Le bandeau défilant de la page d'accueil affiche par défaut le **nom** de
chaque école. Déposer un fichier dans `static/img/ecoles/` le remplace
automatiquement par le logo, sans rien modifier d'autre :

```
hec.svg            essec.svg        escp.svg
em-lyon.svg        edhec.svg        polytechnique.svg
centrale.svg       mines.svg        ens.svg
```

Le `.svg` est préféré, sinon `.png` ou `.webp`. Puis `python build_site.py`.

Toute école sans fichier reste affichée en toutes lettres : le bandeau est
complet même si vous n'obtenez que deux ou trois logos. Les logos sont
normalisés à 38 px de haut et désaturés, pour ne pas capter l'attention au
détriment du bouton de téléchargement.

**Avant de déposer un fichier.** Ces logos sont des marques déposées. Chaque
école publie un kit média — cherchez « kit média », « charte graphique » ou
« brand guidelines » suivi du nom de l'école — qui fixe ses conditions.
Certaines autorisent l'usage descriptif, d'autres demandent un accord écrit
au service communication. Conservez la réponse obtenue : c'est elle qui vous
protège, pas la mention affichée sous le bandeau.

La liste des écoles se modifie dans `ECOLES`, au début de `build_site.py`.
