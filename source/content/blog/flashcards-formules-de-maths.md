---
title: Flashcards de formules de maths : 3 méthodes | PrépaCards
description: Pourquoi les flashcards de maths sont abandonnées si vite, et trois façons de créer des cartes de formules vite : LaTeX, photo du cours, description.
date: 2026-09-02
slug: flashcards-formules-de-maths
---

# Faire des flashcards de formules de maths sans y passer la nuit

Demandez à n'importe quel étudiant de prépa scientifique pourquoi il n'a
pas de flashcards de maths, malgré toutes les qualités qu'on leur prête par
ailleurs : la réponse est presque toujours exactement la même. Il a
essayé une fois, il a passé quarante bonnes minutes à saisir laborieusement
six formules seulement, et il a définitivement arrêté là, découragé par le
temps perdu.

Le problème réel n'est pas la méthode de révision en elle-même, qui reste
solide. C'est le **coût de saisie** des formules qui décourage tout le
monde avant même d'avoir pu juger de l'efficacité de la méthode sur la
durée.

## Pourquoi c'est si pénible

Une formule d'analyse un peu sérieuse s'écrit, en LaTeX, de la façon
suivante :

```latex
\int_{0}^{+\infty} \frac{\sin t}{t}\,\mathrm{d}t = \frac{\pi}{2}
```

Vingt-huit caractères de syntaxe complète pour une formule qui n'en compte
que huit à l'écran une fois affichée correctement. Multiplié par les deux
cents formules environ que compte un programme complet de MPSI, cela
représente concrètement plusieurs soirées entières de travail — entièrement
consacrées à de la saisie technique, pas une seconde à de l'apprentissage
réel.

Trois mauvaises solutions circulent malgré tout couramment parmi les
élèves, chacune avec ses propres défauts :

- **écrire la formule directement en texte brut**, du type `integrale de 0
  a +inf de sin(t)/t = pi/2`. Le résultat est illisible au bout de
  quelques semaines, et on finit rapidement par ne plus reconnaître ses
  propres cartes ;
- **ne faire des cartes que pour les énoncés de théorèmes**, en sautant
  purement et simplement les formules elles-mêmes. On perd alors
  précisément ce qui s'oublie le plus vite dans la réalité des révisions ;
- **photographier la page entière du cours** et en faire une seule carte
  globale. La carte devient alors totalement inévaluable : on ne peut plus
  jamais dire honnêtement si l'on « savait » l'intégralité d'une page
  entière ou seulement une partie.

[Les règles générales pour réviser avec des flashcards →](/blog/reviser-avec-des-flashcards-en-prepa/){: target="_blank" rel="noopener" }

## Trois méthodes pour aller vite

### Méthode 1 : apprendre le LaTeX minimal

Si vous faites des mathématiques ou de la physique en prépa, apprendre une
petite dizaine de commandes LaTeX de base est un investissement rentable
bien au-delà du seul usage des flashcards — vous les retrouverez
inévitablement dans vos rapports de TIPE, puis à peu près partout ensuite
dans vos études supérieures.

Le strict nécessaire à connaître tient en huit lignes :

| Ce que vous voulez | Ce que vous tapez |
|---|---|
| Fraction | `\frac{a}{b}` |
| Exposant, indice | `x^2`, `x_i` |
| Racine | `\sqrt{x}` |
| Somme, produit | `\sum_{n=1}^{\infty}`, `\prod` |
| Intégrale | `\int_{a}^{b}` |
| Limite | `\lim_{x \to 0}` |
| Lettres grecques | `\alpha`, `\pi`, `\varepsilon` |
| Infini, appartient | `\infty`, `\in` |

Avec ces huit lignes apprises une bonne fois pour toutes, on écrit
directement plus de 90 % des formules d'un programme de prépa sans
chercher plus loin. Comptez environ une heure de pratique pour être
réellement à l'aise avec cette syntaxe de base.

### Méthode 2 : la photo du cours

C'est la méthode la plus rapide de toutes, et elle n'existait tout
simplement pas sous une forme accessible et fiable jusqu'à assez
récemment. Le principe est simple : photographier directement la formule
imprimée ou manuscrite, et laisser un logiciel spécialisé la convertir
automatiquement en LaTeX propre.

C'est exactement ce que fait PrépaCards. En pratique, la procédure se
déroule en quatre étapes rapides :

1. photographier la page du cours, ou coller directement une capture
   d'écran du polycopié numérique ;
2. l'application découpe automatiquement l'image en zones distinctes — une
   par formule repérée — présentées ensuite sous forme de vignettes
   cliquables ;
3. cliquer sur la formule voulue parmi ces vignettes, ou tracer soi-même
   un rectangle autour d'elle à la souris si le découpage automatique
   n'est pas parfait ;
4. **relire attentivement le code obtenu**, corriger si besoin le moindre
   détail, puis enregistrer la carte.

Deux avertissements sérieux s'imposent ici, parce qu'ils déterminent à eux
seuls si la méthode vous sera réellement utile au quotidien ou simplement
frustrante à l'usage.

**Le cadrage compte énormément dans la qualité du résultat.** Ces modèles
de reconnaissance lisent correctement *une* formule isolée à la fois, pas
plus. Donnez-leur une page entière avec un titre et quatre équations
mélangées, et ils ne produisent pas un résultat simplement imprécis : ils
produisent carrément du texte incohérent et inutilisable. D'où
l'importance réelle de l'étape de découpage préalable, qu'il ne faut
surtout pas chercher à sauter pour gagner du temps.

**La relecture n'est absolument pas optionnelle.** Sur des formules
imprimées et correctement cadrées, la conversion automatique reste
globalement correcte dans l'ensemble, mais elle se trompe encore
régulièrement sur une lettre isolée mal reconnue : un `a` en italique lu
comme un `∂`, un `n` confondu avec un `η` par exemple. Or une formule
fausse apprise ensuite par répétition espacée pendant des mois est
nettement pire qu'une simple absence de carte sur le sujet — vous la
réviserez fidèlement trente fois avant de vous rendre compte de l'erreur,
le jour où elle vous coûtera des points.

### Méthode 3 : la carte en deux temps

C'est une astuce peu connue, et pourtant entièrement gratuite à mettre en
œuvre. Au lieu d'écrire la formule complète au verso de la carte, écrivez
plutôt **sa description en mots simples** :

> **Recto** — Intégrale de Dirichlet : valeur de ∫₀^∞ sin(t)/t dt ?
> **Verso** — π/2

Le recto peut alors rester en texte simple, sans aucune mise en forme
particulière : il suffit qu'il identifie sans ambiguïté la formule visée.
Seul le résultat final, souvent bien plus court que l'énoncé complet, a
réellement besoin d'être écrit proprement en notation mathématique. Cette
approche divise le temps de saisie par trois environ, et elle fonctionne
particulièrement bien pour tout ce qui prend la forme « quelle est la
valeur de », « quelle est la condition de », ou encore « quelle est la
dérivée de ».

## Quelles formules mettre en cartes

Toutes les formules d'un programme ne méritent pas systématiquement une
carte dédiée. Celles qui rapportent réellement à la révision sont
principalement :

- **les formules à retenir sèchement**, sans autre choix possible :
  développements limités usuels, dérivées et primitives de référence,
  valeurs d'intégrales classiques du programme ;
- **les conditions d'application** précises d'un théorème, bien plus
  souvent oubliées en pratique que son énoncé principal lui-même ;
- **les contre-exemples** classiques du cours. « Quelle fonction est
  continue partout et dérivable nulle part ? » constitue par exemple une
  excellente carte, révélatrice d'une vraie compréhension ;
- **les constantes et ordres de grandeur** usuels en physique et en
  chimie, qui reviennent sans cesse dans les applications numériques.

À l'inverse, celles qui ne le méritent généralement pas sont :

- les formules que l'on **redémontre soi-même en trois lignes** sans
  effort particulier. Autant, dans ce cas précis, savoir simplement les
  redémontrer plutôt que de les mémoriser séparément ;
- les démonstrations complètes d'un théorème. Une démonstration n'est
  jamais une bonne flashcard en tant que telle : elle s'entraîne
  efficacement en la refaisant intégralement sur une feuille, pas en la
  récitant par cœur.

[Reconnaître quel théorème appliquer face à un exercice →](/blog/reconnaissance-de-schemas-en-prepa/){: target="_blank" rel="noopener" }

## En résumé

| Méthode | Temps par formule | Quand la choisir |
|---|---|---|
| LaTeX à la main | 1 à 2 min | Peu de formules, ou vous savez déjà le LaTeX |
| Photo convertie | 15 à 30 s | Beaucoup de formules depuis un cours ou un PDF |
| Description en mots | 20 s | La réponse est courte (une valeur, une condition) |

Ces trois méthodes ne s'excluent d'ailleurs pas mutuellement : la plupart
des élèves finissent par les combiner selon le type de formule rencontrée,
en gardant la photo pour le gros du volume et la description en mots pour
les résultats les plus courts à retenir.

<div class="encart">
  <p>La reconnaissance de formules en photo fait partie de l'offre Premium de
  PrépaCards ; la répétition espacée et la vérification à l'oral sont
  gratuites. <a href="/telecharger/">Télécharger</a> ·
  <a href="/tarifs/">Voir les tarifs</a></p>
</div>
