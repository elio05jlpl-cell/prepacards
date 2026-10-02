---
title: Importer ses paquets Anki ou Quizlet en 2 minutes | PrépaCards
description: Convertir un paquet Anki .apkg ou un jeu Quizlet en cartes PrépaCards, en gardant les sous-paquets et les textes à trous. Guide pas à pas, sans tableur.
slug: importer-anki-quizlet
nav_label: Importer
faq: true
---

# Importer ses paquets Anki et Quizlet

Changer d'outil de révision en milieu d'année n'a d'intérêt que si l'on ne
recommence pas ses cartes de zéro. PrépaCards lit directement les paquets
d'Anki et les jeux Quizlet — sans passer par un tableur.

<div class="encart">
  <p>Tout se fait depuis le bouton <strong>Importer</strong> de l'écran
  d'accueil, ou par <em>Fichier → Importer depuis Anki ou Quizlet</em>
  (Ctrl+Maj+I).</p>
</div>

## Depuis Anki

1. Dans Anki, clic droit sur le paquet → **Exporter**, ou *Fichier → Exporter*.
2. Choisissez le format **Paquet Anki (.apkg)**. Laissez les médias cochés ou
   non, cela ne change rien pour l'import.
3. Dans PrépaCards : **Importer** → *Depuis Anki (.apkg) ou Quizlet* →
   **Choisir un fichier**.

L'écran affiche alors le nombre de cartes, les paquets détectés, un aperçu des
premières, et la liste de ce qui ne sera pas repris. Rien n'est écrit tant que
vous n'avez pas cliqué sur **Importer**.

### Ce qui est conservé

- **Vos sous-paquets**, à l'identique. *Anglais::Vocabulaire::Économie* reste
  rangé de la même façon.
- **Les cartes à trous** (*cloze*). Le trou est masqué au recto par `[...]` et
  révélé au verso — exactement le comportement d'Anki. C'est important pour les
  paquets d'histoire, de géopolitique et de culture générale, souvent composés
  presque uniquement de ces cartes.
- **La mise en forme**, ramenée en texte simple. Le gras, les listes et les
  sauts de ligne sont convertis proprement.
- **Les cartes en cours de révision**, y compris celles qui se trouvaient dans
  un paquet filtré : elles retournent dans leur paquet d'origine.

### Ce qui ne l'est pas

**Les images et les sons.** PrépaCards ne stocke que du texte. Une carte dont
le verso était un schéma arrivera avec son texte seul. L'application compte
exactement combien de cartes sont concernées et vous l'indique avant l'import,
plutôt que de vous le laisser découvrir à la trentième révision.

**L'historique de révision.** Anki calcule ses intervalles avec FSRS,
PrépaCards avec SM-2. Transposer les dates d'un algorithme à l'autre
produirait des échéances fausses — une carte annoncée acquise pour six mois
alors qu'elle ne l'est pas. Vos cartes arrivent donc comme neuves. C'est une
perte réelle, assumée : mieux vaut trois semaines pour retrouver le bon rythme
qu'un calendrier de révision erroné.

**Les modèles à plusieurs champs.** Anki fabrique plusieurs cartes à partir
d'une note de six champs. PrépaCards n'a qu'un recto et un verso : le premier
champ devient le recto, les autres sont regroupés au verso. Les modèles
courants (Basique, Basique inversé, vocabulaire) passent sans perte.

### « Ce fichier vient d'une version récente d'Anki »

Depuis la version 2.1.50, Anki compresse ses exports. PrépaCards sait les lire,
mais si ce message apparaît, refaites l'export en cochant **Prendre en charge
les anciennes versions d'Anki** dans la fenêtre d'export.

## Depuis Quizlet

Quizlet ne produit pas de fichier : il affiche votre jeu sous forme de texte à
copier.

1. Ouvrez le jeu, menu **⋯** → **Exporter**.
2. Copiez le texte proposé (Ctrl+C).
3. Dans PrépaCards : **Importer** → *Depuis Anki (.apkg) ou Quizlet*, et collez
   dans la zone de texte (Ctrl+V).

Vous n'avez pas à toucher aux réglages de séparateurs. L'application les
détecte en regardant lequel découpe le plus de lignes en exactement deux
colonnes — tabulation, tiret, point-virgule ou barre verticale. Une virgule
présente dans une définition ne la trompe pas.

Si votre jeu vient d'un export ancien enregistré en fichier `.txt`, passez
plutôt par **Choisir un fichier** : le résultat est le même.

## Choisir où arrivent les cartes

Deux options, dans la même fenêtre :

- **Conserver les paquets d'origine** — recommandé pour un import Anki, qui
  apporte souvent toute une arborescence.
- **Tout mettre dans un seul paquet** — plus simple pour un jeu Quizlet, qui
  n'a de toute façon qu'un seul niveau.

## Questions fréquentes

### PrépaCards lit-il vraiment les fichiers .apkg ?

Oui, les trois variantes du format produites par Anki au fil des versions : `collection.anki2`, `collection.anki21` et la version compressée `collection.anki21b` des versions 2.1.50 et suivantes. Les fichiers `.colpkg`, qui sauvegardent une collection entière, sont également lus.

### Mes cartes Anki vont-elles garder leur avancement ?

Non. Les intervalles d'Anki sont calculés par l'algorithme FSRS, PrépaCards utilise SM-2 : les transposer donnerait des dates de révision fausses. Vos cartes repartent comme neuves. C'est la seule perte que nous considérons comme vraiment gênante, et nous préférons l'annoncer plutôt que d'inventer une conversion approximative.

### Et si mon paquet contient des images ?

Les cartes sont importées avec leur texte, sans l'image. Avant de valider, l'application affiche le nombre exact de cartes concernées, ce qui permet de décider en connaissance de cause — et de garder Anki en parallèle si ces cartes vous sont indispensables.

### Puis-je importer plusieurs paquets ?

Oui, un fichier à la fois. Rien n'est écrasé : un import ajoute des cartes aux paquets existants sans toucher à celles qui s'y trouvent déjà. Les doublons exacts présents dans le fichier source sont écartés automatiquement.

### L'import fonctionne-t-il hors ligne ?

Oui. La conversion se fait entièrement sur votre ordinateur, rien n'est envoyé à un serveur. Vos cartes ne quittent pas votre machine.

<div class="encart">
  <p>PrépaCards est gratuit pour Windows 10 et 11.
  <a href="/telecharger/">Télécharger</a> ·
  <a href="/alternative-anki/">Comparatif avec Anki</a> ·
  <a href="/alternative-quizlet/">Comparatif avec Quizlet</a></p>
</div>
