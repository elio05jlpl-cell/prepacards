---
title: Vérification à l'oral et formules en photo | PrépaCards
description: Ce que fait PrépaCards : répétition espacée SM-2, vérification de la prononciation au micro, lecture labiale à la webcam et photo de formule convertie en LaTeX.
slug: fonctionnalites
faq: true
---

# Les fonctionnalités de PrépaCards

<p class="chapeau">Cette page décrit ce que l'application fait réellement
aujourd'hui, y compris ses limites. Rien de ce qui suit n'est « à venir ».</p>

## Répétition espacée

PrépaCards utilise **SM-2**, l'algorithme de répétition espacée que rendu
célèbre SuperMemo puis Anki. Après chaque carte, vous notez votre réponse sur
quatre niveaux — *Again*, *Hard*, *Good*, *Easy* — et l'intervalle avant la
prochaine révision s'ajuste. Chaque bouton affiche par avance l'intervalle qu'il
produira.
[Le principe de la répétition espacée, expliqué simplement →](/blog/repetition-espacee-comment-ca-marche/){: target="_blank" rel="noopener" }

Les paquets acceptent des sous-paquets imbriqués, avec la même convention
qu'Anki (`Matière::Chapitre::Sous-partie`). Un paquet parent affiche le cumul
de ce qu'il reste à réviser dans tous ses enfants, et se replie d'un clic.
Chaque paquet a ses propres limites quotidiennes de cartes nouvelles et de
révisions.

<div class="encart">
  <p>À savoir : Anki utilise depuis plusieurs années un algorithme plus récent
  (FSRS), qui planifie mieux les révisions que SM-2. Si l'optimisation fine du
  calendrier de révision est votre critère principal, Anki reste devant sur ce
  point précis.</p>
</div>

## Vérification de la prononciation

Appuyez sur **R**, dites la réponse. L'application :

1. enregistre le micro et **s'arrête dès que vous vous taisez** — le seuil de
   silence est calibré sur le bruit ambiant, donc cela fonctionne aussi près
   d'un ventilateur ;
2. transcrit ce que vous avez dit avec un modèle de reconnaissance vocale qui
   tourne **sur votre ordinateur**, pas sur un serveur ;
3. compare à la réponse attendue et note la carte automatiquement.

C'est le dos de la carte qui est prononcé, dans sa propre langue : une carte
dont le recto est allemand et le verso français se récite en français.
Cinq langues sont gérées : français, anglais, espagnol, allemand, italien.

## Lecture labiale par la webcam

Fonction optionnelle, à cocher pendant l'étude. La webcam suit le mouvement de
vos lèvres, le convertit en suite de formes de bouche et le compare à celle
attendue pour le mot.

<figure>
  <img src="/img/retour-camera.png" width="320" height="240"
       alt="Retour vidéo de PrépaCards : maillage discret du visage, contour des lèvres en bleu et jauges d'ouverture, arrondi et étirement"
       loading="lazy">
  <figcaption>Le retour vidéo montre ce que l'application mesure réellement :
    contour des lèvres et trois grandeurs comparées au mot attendu.</figcaption>
</figure>

**La règle de notation est stricte** : la carte n'est validée que si le micro
et la bouche sont d'accord. En cas de désaccord, rien n'est enregistré et c'est
vous qui choisissez la note.

Une limite qu'aucun logiciel ne franchira : plusieurs sons ont une image
identique. `p`, `b` et `m` sont le même geste des lèvres. « pain », « bain » et
« main » sont donc **indiscernables** à la caméra. Quand le cas se présente,
PrépaCards le dit explicitement au lieu de trancher au hasard.

## Photo de formule convertie en LaTeX

Choisissez une image ou collez une capture d'écran. L'application découpe la
page en zones, présentées en vignettes cliquables, et convertit celle que vous
désignez. Vous pouvez aussi tracer un rectangle à la souris pour isoler une
formule vous-même.

Le code LaTeX obtenu est **toujours modifiable**, avec un aperçu de la formule
rendue en dessous. Sur des formules imprimées et bien cadrées, la
reconnaissance est correcte dans l'ensemble mais se trompe régulièrement sur
une lettre isolée — un `a` italique lu `∂`, un `n` lu `η`. La relecture n'est
pas une précaution facultative : c'est une étape du processus.

## Traduction automatique des cartes

À la création d'une carte de vocabulaire, un bouton traduit le mot vers l'une
des cinq langues gérées et détecte sa langue d'origine. La langue détectée est
enregistrée sur la carte : c'est elle qui servira ensuite à la reconnaissance
vocale.

Cette fonction nécessite une connexion internet. Seul le mot est envoyé au
service de traduction — jamais votre adresse e-mail ni le reste de votre
collection.

## Vos données restent chez vous

Il n'y a **aucun serveur PrépaCards**. Vos cartes, votre historique de
révision et votre compte sont dans un fichier sur votre disque
(`%APPDATA%\PrepaCards`). Le compte demandé au premier lancement verrouille
l'ouverture de l'application ; il ne chiffre pas le fichier, et nous le disons
plutôt que de laisser croire le contraire.

Import et export au format CSV, dans les deux sens.

## Questions fréquentes

### La reconnaissance vocale fonctionne-t-elle hors ligne ?

Oui, après un premier téléchargement. Le modèle de reconnaissance vocale (environ 500 Mo) et celui de suivi du visage sont récupérés au premier usage, puis conservés sur votre ordinateur. Ensuite, tout fonctionne sans connexion. Seule la traduction automatique reste en ligne.

### Quelle configuration faut-il ?

Windows 10 ou 11, environ 1,5 Go d'espace disque au total avec les modèles, un micro pour l'oral et une webcam pour la lecture labiale. Aucune carte graphique dédiée n'est nécessaire : tout tourne sur le processeur.

### Y a-t-il une synchronisation entre plusieurs ordinateurs ?

Non. C'est la contrepartie directe de l'absence de serveur. Pour transférer votre collection, copiez le fichier `vocab.db` ou passez par un export CSV.

### L'application est-elle open source ?

Pas à ce jour.
