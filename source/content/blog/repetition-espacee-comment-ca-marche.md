---
title: La répétition espacée expliquée simplement | PrépaCards
description: Comment marche la répétition espacée, pourquoi elle bat la relecture, et ce que changent les algorithmes SM-2 et FSRS derrière Anki et PrépaCards.
date: 2026-09-05
slug: repetition-espacee-comment-ca-marche
---

# La répétition espacée expliquée simplement

Si vous avez déjà relu un chapitre cinq fois avant un contrôle pour tout
oublier trois semaines plus tard, vous avez rencontré le problème que la
répétition espacée résout.

## Le constat de départ : on oublie vite, puis lentement

Après avoir appris quelque chose, la probabilité de s'en souvenir chute
rapidement les premiers jours, puis de plus en plus lentement. C'est le
phénomène que l'on désigne souvent sous le nom de courbe de l'oubli, étudié dès
la fin du XIX<sup>e</sup> siècle par Hermann Ebbinghaus.

L'observation utile est la suivante : **chaque rappel réussi aplatit la
courbe**. Un souvenir que vous êtes allé rechercher activement, juste avant de
l'oublier, résiste beaucoup plus longtemps que le même souvenir relu passivement
dix fois d'affilée.

Deux effets se combinent donc :

- **l'effet de test** : se forcer à retrouver une information ancre mieux que la
  relire. Relire est confortable et donne un sentiment de maîtrise trompeur ;
- **l'effet d'espacement** : espacer les rappels dans le temps produit une
  mémorisation plus durable que les masser dans la même session.

La répétition espacée exploite les deux : elle vous fait **retrouver** une
information, **au moment où vous êtes sur le point de l'oublier**.

## Le principe pratique

Chaque carte porte une date de prochaine révision. Quand vous répondez :

- **vous saviez** → l'intervalle s'allonge. Un jour, puis six, puis quinze,
  puis un mois, puis trois ;
- **vous ne saviez pas** → l'intervalle repart à un jour.

Résultat : vous passez l'essentiel de votre temps sur ce que vous maîtrisez
mal, et très peu sur ce que vous savez déjà. C'est exactement l'inverse de la
relecture d'un chapitre, où vous consacrez autant de temps aux pages faciles
qu'aux difficiles.
[Combien de cartes nouvelles par jour, concrètement →](/blog/combien-de-cartes-par-jour/)

## Les trois algorithmes que vous rencontrerez

### Le système de Leitner (boîtes en carton)

Le plus ancien et le plus simple : cinq boîtes. Une carte réussie passe dans la
boîte suivante, révisée moins souvent ; une carte ratée revient dans la
première. On peut le faire entièrement en papier, et cela fonctionne.

Sa limite : les intervalles sont grossiers et identiques pour toutes les cartes,
alors que certaines notions sont bien plus difficiles que d'autres.

### SM-2

Publié par Piotr Woźniak pour SuperMemo dans les années 1980, c'est l'algorithme
qui a rendu la répétition espacée informatique populaire, notamment via Anki
pendant de longues années. C'est celui qu'utilise PrépaCards.

Son principe : chaque carte porte un **facteur de facilité**. À chaque
révision, ce facteur monte ou descend selon la note que vous donnez, et le
prochain intervalle est l'intervalle courant multiplié par ce facteur. Une
carte difficile voit ses intervalles croître lentement, une carte facile
rapidement.

SM-2 est simple, robuste, et prévisible : on comprend pourquoi il propose telle
date.

### FSRS

Beaucoup plus récent, FSRS (*Free Spaced Repetition Scheduler*) est
l'algorithme utilisé aujourd'hui par défaut dans Anki. Au lieu d'un facteur par
carte, il modélise trois grandeurs — difficulté, stabilité, récupérabilité — et
ajuste ses paramètres sur **votre** historique de révision.

Concrètement, il propose des intervalles mieux calibrés, ce qui réduit le
nombre de révisions nécessaires pour un même niveau de rétention. Sur ce point
précis, FSRS est en avance sur SM-2, et il faut le dire.

## Alors pourquoi PrépaCards utilise-t-il SM-2 ?

Par honnêteté sur ses priorités. SM-2 est largement suffisant pour un usage
étudiant : la différence avec FSRS se mesure en pourcentage de révisions
économisées, pas en réussite ou échec de la mémorisation. Le facteur limitant,
pour un étudiant de prépa, n'est presque jamais la finesse de l'algorithme :
c'est la **régularité** et la **qualité des cartes**.

L'effort de développement de PrépaCards est donc allé ailleurs — vers la
vérification de la prononciation à l'oral et la création rapide de cartes de
maths, qui sont des manques pratiques concrets. Si l'optimisation fine du
calendrier est votre critère décisif, Anki avec FSRS est le meilleur choix, et
notre [comparatif](/alternative-anki/) le dit sans détour.

## Les quatre conditions pour que ça marche vraiment

La répétition espacée n'est pas magique. Elle a des prérequis :

1. **Des cartes atomiques.** Une information par carte. Une carte qui contient
   un paragraphe est inévaluable, donc inutile.
2. **Un rappel actif.** Il faut réellement chercher la réponse avant de
   retourner la carte. Retourner tout de suite et se dire « ah oui » ne
   produit aucun bénéfice.
3. **De la régularité.** Sauter des jours crée un arriéré qui s'accumule.
4. **De la durée.** Les intervalles longs n'existent qu'après plusieurs mois.
   Commencer trois semaines avant un concours ne laisse pas le temps au système
   de produire son effet.

[Appliquer la méthode en prépa, étape par étape →](/blog/reviser-avec-des-flashcards-en-prepa/)

## Et la mémorisation par compréhension ?

Une objection revient souvent : apprendre par cartes serait du « par cœur »
opposé à la compréhension. C'est un faux dilemme.

La compréhension ne dispense pas de la mémorisation : un étudiant qui comprend
parfaitement le mécanisme d'une crise financière mais ne peut citer ni les
dates ni les auteurs perdra des points en ESH. Un étudiant qui comprend un
théorème mais a oublié ses hypothèses le démontrera faux.

Inversement, mémoriser sans comprendre ne mène nulle part. Les flashcards
interviennent **après** la compréhension, pour empêcher l'oubli de ce que vous
avez compris. C'est tout, et c'est déjà beaucoup.

<div class="encart">
  <p>PrépaCards applique SM-2 avec prévisualisation des intervalles sur chaque
  bouton de notation, et ajoute la vérification de la prononciation.
  <a href="/telecharger/">Télécharger gratuitement</a>.</p>
</div>
