---
title: Flashcards de formules de maths : 3 méthodes | PrépaCards
description: Pourquoi les flashcards de maths sont abandonnées si vite, et trois façons de créer des cartes de formules vite : LaTeX, photo du cours, description.
date: 2026-09-02
slug: flashcards-formules-de-maths
---

# Faire des flashcards de formules de maths sans y passer la nuit

Demandez à un étudiant de prépa scientifique pourquoi il n'a pas de flashcards
de maths : la réponse est presque toujours la même. Il a essayé, il a passé
quarante minutes à saisir six formules, et il a arrêté.

Le problème n'est pas la méthode. C'est le **coût de saisie**.

## Pourquoi c'est si pénible

Une formule d'analyse un peu sérieuse s'écrit, en LaTeX :

```latex
\int_{0}^{+\infty} \frac{\sin t}{t}\,\mathrm{d}t = \frac{\pi}{2}
```

Vingt-huit caractères de syntaxe pour une formule qui en compte huit à
l'écran. Multiplié par les deux cents formules d'un programme de MPSI, cela
représente plusieurs soirées entières — consacrées à de la saisie, pas à de
l'apprentissage.

Trois mauvaises solutions circulent :

- **écrire la formule en texte brut** (`integrale de 0 a +inf de sin(t)/t = pi/2`).
  Illisible, et on finit par ne plus reconnaître ses propres cartes ;
- **ne faire des cartes que pour les énoncés**, en sautant les formules. On perd
  précisément ce qui s'oublie le plus vite ;
- **photographier la page entière du cours** et en faire une seule carte. La
  carte devient inévaluable : on ne peut pas dire si on « savait » toute une
  page.

[Les règles générales pour réviser avec des flashcards →](/blog/reviser-avec-des-flashcards-en-prepa/)

## Méthode 1 : apprendre le LaTeX minimal

Si vous faites des maths, apprendre une dizaine de commandes LaTeX est un
investissement rentable au-delà des flashcards — vous les retrouverez dans vos
rapports de TIPE et à peu près partout ensuite.

Le strict nécessaire :

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

Avec ces huit lignes, on écrit 90 % des formules d'une prépa. Comptez une
heure pour être à l'aise.

## Méthode 2 : la photo du cours

C'est la méthode la plus rapide, et elle n'existait pas de façon simple jusqu'à
récemment. Le principe : photographier la formule, et laisser un logiciel la
convertir en LaTeX.

C'est ce que fait PrépaCards. En pratique :

1. photographier la page, ou coller une capture d'écran du polycopié ;
2. l'application découpe l'image en zones — une par formule — présentées en
   vignettes ;
3. cliquer la formule voulue, ou tracer un rectangle autour d'elle à la souris ;
4. **relire le code obtenu**, corriger si besoin, enregistrer.

Deux avertissements, parce qu'ils déterminent si la méthode vous sera utile ou
frustrante.

**Le cadrage compte énormément.** Ces modèles lisent *une* formule à la fois.
Donnez-leur une page entière avec un titre et quatre équations, et ils ne
produisent pas un résultat imprécis : ils produisent du texte incohérent. D'où
l'étape de découpage, qu'il ne faut pas sauter.

**La relecture n'est pas optionnelle.** Sur des formules imprimées et bien
cadrées, la conversion est correcte dans l'ensemble, mais elle se trompe
régulièrement sur une lettre isolée : un `a` italique lu `∂`, un `n` lu `η`.
Une formule fausse apprise par répétition espacée est bien pire qu'une absence
de carte — vous la réviserez trente fois.

## Méthode 3 : la carte en deux temps

Astuce peu connue, et gratuite. Au lieu d'écrire la formule au verso, écrivez
**sa description en mots** :

> **Recto** — Intégrale de Dirichlet : valeur de ∫₀^∞ sin(t)/t dt ?
> **Verso** — π/2

Le recto peut rester en texte simple : il suffit qu'il identifie la formule.
Seul le résultat, souvent court, a besoin d'être écrit proprement. Cette
approche divise le temps de saisie par trois et fonctionne pour tout ce qui est
« quelle est la valeur de », « quelle est la condition de », « quelle est la
dérivée de ».

## Quelles formules mettre en cartes

Toutes ne le méritent pas. Celles qui rapportent :

- **les formules à retenir sèchement** : développements limités usuels,
  dérivées et primitives de référence, valeurs d'intégrales classiques ;
- **les conditions d'application** d'un théorème, plus souvent oubliées que son
  énoncé ;
- **les contre-exemples** classiques. « Quelle fonction est continue partout et
  dérivable nulle part ? » est une excellente carte ;
- **les constantes et ordres de grandeur** en physique et en chimie.

Celles qui ne le méritent pas :

- les formules que l'on **redémontre en trois lignes**. Autant savoir les
  redémontrer ;
- les démonstrations complètes. Une démonstration n'est pas une flashcard :
  elle s'entraîne en la refaisant sur une feuille.

[Reconnaître quel théorème appliquer face à un exercice →](/blog/reconnaissance-de-schemas-en-prepa/)

## En résumé

| Méthode | Temps par formule | Quand la choisir |
|---|---|---|
| LaTeX à la main | 1 à 2 min | Peu de formules, ou vous savez déjà le LaTeX |
| Photo convertie | 15 à 30 s | Beaucoup de formules depuis un cours ou un PDF |
| Description en mots | 20 s | La réponse est courte (une valeur, une condition) |

<div class="encart">
  <p>La reconnaissance de formules en photo fait partie de l'offre Premium de
  PrépaCards ; la répétition espacée et la vérification à l'oral sont
  gratuites. <a href="/telecharger/">Télécharger</a> ·
  <a href="/tarifs/">Voir les tarifs</a></p>
</div>
