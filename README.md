# PrépaCards

**Des flashcards pour la prépa : vocabulaire, formules, et révision à l'oral.**

→ **[prepacards.fr](https://prepacards.fr)** · [Télécharger pour Windows](https://prepacards.fr/telecharger/) · [Le blog](https://prepacards.fr/blog/)

---

PrépaCards reprend la répétition espacée qui a fait la réputation d'Anki, et
ajoute ce qui manquait aux élèves de classes préparatoires : la vérification
de la prononciation, l'import d'une formule photographiée, et des paquets
prêts à l'emploi par filière.

L'application est **gratuite** et fonctionne **hors ligne**. Vos cartes
restent sur votre ordinateur : elles ne sont pas stockées sur un serveur.

## Ce que fait l'application

- **Répétition espacée complète** — réglages, profils, dates cibles avant une
  colle ou un concours, limites quotidiennes, jours de repos.
- **Cartes de maths** — les formules sont écrites en LaTeX et rendues comme
  telles, pas comme du texte.
- **Import depuis Anki et Quizlet**, ou depuis un fichier CSV.
- **Paquets fournis** par filière, à commencer par l'anglais en ECG.
- **Statistiques** — temps passé, cartes vues, taux de réussite, séries de
  jours.

Certaines fonctions font partie de l'offre complète : écouter la
prononciation, vérifier la sienne au micro, la lecture labiale par la
webcam, et la conversion d'une photo de formule ou d'une feuille de
vocabulaire en cartes. Tout le reste — vos cartes, la répétition espacée,
les réglages, les statistiques et les paquets fournis — reste accessible
sans abonnement. Les [tarifs sont ici](https://prepacards.fr/tarifs/).

## Plateformes

Windows 10 et 11 (64 bits), sans droits administrateur. La version macOS est
en construction. Rien sur iPhone ni Android pour l'instant, et nous
préférons le dire plutôt que de laisser croire le contraire : la
vérification de la prononciation et la lecture labiale s'appuient sur des
bibliothèques installées localement, ce qui rend le portage long.

## Ce que contient ce dépôt

**Le site [prepacards.fr](https://prepacards.fr)**, pas le code de
l'application.

| Dossier | Contenu |
|---|---|
| `source/content` | Les pages et les articles, en Markdown |
| `source/templates` | Les gabarits HTML et les scripts de page |
| `source/static` | Feuille de style, images, polices |
| `source/worker` | Le service Cloudflare : webhook Stripe, gestion de compte |
| la racine | Le site construit, servi tel quel par Cloudflare |

La racine est **entièrement régénérée** à chaque construction : les
modifications s'y perdent. Voir [`CLAUDE.md`](CLAUDE.md) pour les consignes
de travail, et `source/LISEZ-MOI.md` pour la documentation complète.

```sh
PREPACARDS_SORTIE="$(pwd)" python source/build_site.py
PREPACARDS_SORTIE="$(pwd)" python source/audit_site.py
```

Les **versions de l'application** sont publiées dans les
[releases](https://github.com/elio05jlpl-cell/prepacards/releases) de ce
dépôt.

## Un mot sur l'avertissement de Windows

L'application n'est pas signée numériquement : un certificat de signature de
code coûte plusieurs centaines d'euros par an, hors de portée d'un projet à
ce stade. Windows affiche donc un avertissement au premier lancement. Nous
l'annonçons [sur la page de téléchargement](https://prepacards.fr/telecharger/)
plutôt que de laisser découvrir un message inquiétant.
