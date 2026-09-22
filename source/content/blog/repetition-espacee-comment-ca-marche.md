---
title: La répétition espacée expliquée simplement | PrépaCards
description: Comment marche la répétition espacée, pourquoi elle bat la relecture, et ce que changent les algorithmes SM-2 et FSRS derrière Anki et PrépaCards.
date: 2026-09-05
slug: repetition-espacee-comment-ca-marche
filiere: toutes
matiere: methode
---

# La répétition espacée expliquée simplement

Si vous avez déjà relu un chapitre entier cinq fois de suite avant un
contrôle, pour ensuite tout oublier trois semaines plus tard sans
comprendre pourquoi, vous avez personnellement rencontré le problème
précis que la répétition espacée est conçue pour résoudre.

## Le constat de départ : on oublie vite, puis lentement

Après avoir appris quelque chose de nouveau, la probabilité de s'en
souvenir chute très rapidement dans les tout premiers jours, puis de
manière de plus en plus lente ensuite. C'est le phénomène que l'on désigne
couramment sous le nom de courbe de l'oubli, étudié dès la fin du
XIX<sup>e</sup> siècle par le psychologue allemand Hermann Ebbinghaus, à
partir d'expériences déjà rigoureuses pour l'époque.

L'observation la plus utile qui en découle est la suivante : **chaque
rappel réussi aplatit durablement la courbe**. Un souvenir que vous êtes
allé rechercher activement dans votre mémoire, juste avant de
l'oublier complètement, résiste ensuite beaucoup plus longtemps que le même
souvenir simplement relu passivement dix fois d'affilée sans effort de
récupération.

Deux effets psychologiques bien documentés se combinent en réalité ici :

- **l'effet de test** : se forcer activement à retrouver une information
  en mémoire ancre bien mieux celle-ci que la simple relecture passive.
  Relire est confortable et donne un sentiment de maîtrise souvent
  trompeur, sans effort réel de récupération ;
- **l'effet d'espacement** : espacer les rappels dans le temps, plutôt que
  de les regrouper, produit une mémorisation nettement plus durable que de
  les masser dans une seule et même session de révision.

La répétition espacée exploite systématiquement ces deux effets à la fois :
elle vous fait **retrouver** activement une information précise, et elle
le fait **au moment précis où vous êtes sur le point de l'oublier**, ni
trop tôt ni trop tard.

## Le principe pratique, et les algorithmes qui l'appliquent

Chaque carte, dans un système de répétition espacée, porte une date
précise de prochaine révision. Quand vous répondez à une carte :

- **vous saviez la réponse** → l'intervalle avant la prochaine révision
  s'allonge progressivement. Un jour, puis six, puis quinze, puis un mois,
  puis trois mois d'affilée ;
- **vous ne saviez pas la réponse** → l'intervalle repart immédiatement à
  un seul jour, sans pénalité au-delà de ce redémarrage.

Le résultat concret de ce mécanisme est que vous passez l'essentiel de
votre temps de révision sur ce que vous maîtrisez encore mal, et très peu
de temps sur ce que vous savez déjà solidement. C'est très exactement
l'inverse de la relecture linéaire d'un chapitre entier, où vous consacrez
mécaniquement autant de temps aux pages faciles qu'aux pages réellement
difficiles.
[Combien de cartes nouvelles par jour, concrètement →](/blog/combien-de-cartes-par-jour/){: target="_blank" rel="noopener" }

### Le système de Leitner (boîtes en carton)

C'est le système le plus ancien et le plus simple de tous : cinq boîtes
physiques suffisent. Une carte réussie passe dans la boîte suivante,
révisée moins fréquemment ; une carte ratée revient directement dans la
toute première boîte. On peut entièrement le mettre en œuvre sur papier,
sans aucun logiciel, et cela fonctionne réellement.

Sa limite principale : les intervalles entre chaque boîte restent grossiers
et strictement identiques pour toutes les cartes d'une même boîte, alors
que certaines notions sont objectivement bien plus difficiles à retenir
que d'autres pour un élève donné.

### SM-2

Publié par le chercheur Piotr Woźniak pour le logiciel SuperMemo dans les
années 1980, c'est l'algorithme qui a véritablement rendu populaire la
répétition espacée informatique, notamment via Anki pendant de très
longues années. C'est aussi celui qu'utilise directement PrépaCards.

Son principe de fonctionnement : chaque carte porte un **facteur de
facilité** qui lui est propre. À chaque révision, ce facteur monte ou
descend légèrement selon la note que vous donnez vous-même à votre
réponse, et le prochain intervalle est calculé comme l'intervalle courant
multiplié par ce facteur. Une carte jugée difficile voit ainsi ses
intervalles croître lentement au fil du temps, une carte facile beaucoup
plus rapidement.

SM-2 reste simple, robuste dans la durée, et parfaitement prévisible pour
l'utilisateur : on comprend toujours pourquoi l'algorithme propose telle
date précise plutôt qu'une autre.

### FSRS

Beaucoup plus récent, FSRS (*Free Spaced Repetition Scheduler*) est
l'algorithme utilisé aujourd'hui par défaut dans Anki. Au lieu d'un simple
facteur unique par carte, il modélise trois grandeurs distinctes —
difficulté, stabilité, récupérabilité — et ajuste continuellement ses
propres paramètres sur **votre** historique personnel de révision, carte
après carte.

Concrètement, il propose des intervalles nettement mieux calibrés
individuellement, ce qui réduit sensiblement le nombre total de révisions
nécessaires pour atteindre un même niveau de rétention à long terme. Sur
ce point technique précis, FSRS est réellement en avance sur SM-2, et il
faut le reconnaître honnêtement plutôt que de le minimiser par confort.

## Alors pourquoi PrépaCards utilise-t-il SM-2 ?

Par simple honnêteté sur ses priorités de développement réelles. SM-2 reste
largement suffisant pour un usage étudiant standard : la différence
pratique avec FSRS se mesure surtout en pourcentage de révisions
économisées sur la durée, pas en réussite ou en échec de la mémorisation
elle-même pour l'élève. Le facteur réellement limitant, pour un étudiant de
prépa concret, n'est presque jamais la finesse mathématique de
l'algorithme utilisé : c'est bien davantage la **régularité** de la
pratique et la **qualité** des cartes elles-mêmes.

L'effort de développement de PrépaCards est donc allé délibérément
ailleurs — vers la vérification de la prononciation à l'oral et la
création rapide de cartes de formules mathématiques, qui constituent des
manques pratiques bien plus concrets au quotidien pour un élève de prépa.
Si l'optimisation fine du calendrier de révision reste votre critère
décisif de choix, Anki avec FSRS demeure objectivement le meilleur choix
disponible, et notre [comparatif](/alternative-anki/) le dit d'ailleurs
sans détour ni faux-fuyant.

## Les quatre conditions pour que ça marche vraiment

La répétition espacée n'a rien de magique en elle-même. Elle repose sur
quatre prérequis concrets, sans lesquels son efficacité s'effondre :

1. **Des cartes atomiques.** Une seule information par carte, jamais
   davantage. Une carte qui contient un paragraphe entier est
   inévaluable, donc pratiquement inutile pour la révision.
2. **Un rappel réellement actif.** Il faut sincèrement chercher la
   réponse avant de retourner la carte. Retourner immédiatement et se
   dire « ah oui, je savais » sans avoir cherché ne produit strictement
   aucun bénéfice mémoriel.
3. **De la régularité dans le temps.** Sauter plusieurs jours d'affilée
   crée un arriéré de révisions qui s'accumule rapidement et devient
   décourageant.
4. **De la durée sur plusieurs mois.** Les intervalles vraiment longs
   n'existent qu'après plusieurs mois de pratique continue. Commencer
   seulement trois semaines avant un concours ne laisse tout simplement
   pas le temps au système de produire son plein effet.

[Appliquer la méthode en prépa, étape par étape →](/blog/reviser-avec-des-flashcards-en-prepa/){: target="_blank" rel="noopener" }

## Et la mémorisation par compréhension ?

Une objection revient très souvent dans les discussions sur le sujet :
apprendre systématiquement par cartes serait une forme de « par cœur »
directement opposée à la véritable compréhension. C'est en réalité un faux
dilemme, qui repose sur une confusion entre deux étapes distinctes du
travail.

La compréhension ne dispense jamais de la mémorisation pure et simple : un
étudiant qui comprend parfaitement le mécanisme économique d'une crise
financière, mais qui ne peut citer ni les dates ni les auteurs de référence
associés, perdra malgré tout des points concrets en ESH. Un étudiant qui
comprend intellectuellement un théorème, mais qui a oublié ses hypothèses
précises d'application, le démontrera tout simplement faux en khôlle.

Inversement, mémoriser mécaniquement sans jamais comprendre ne mène nulle
part de solide non plus. Les flashcards interviennent toujours **après**
la compréhension réelle d'une notion, pour empêcher ensuite l'oubli
naturel de ce que vous avez déjà compris. C'est tout ce qu'elles font, et
c'est déjà, en pratique, considérable sur la durée de deux années de
prépa.

<div class="encart">
  <p>PrépaCards applique SM-2 avec prévisualisation des intervalles sur chaque
  bouton de notation, et ajoute la vérification de la prononciation.
  <a href="/telecharger/">Télécharger gratuitement</a>.</p>
</div>
