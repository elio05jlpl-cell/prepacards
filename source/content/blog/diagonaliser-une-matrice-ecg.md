---
title: Diagonaliser une matrice en ECG : la méthode | PrépaCards
description: Diagonaliser une matrice en ECG : valeurs propres, sous-espaces propres, critère de diagonalisabilité, puissances de matrice, et les cartes à connaître sur le sujet.
date: 2026-11-19
slug: diagonaliser-une-matrice-ecg
faq: true
filiere: commerciale
matiere: maths
---

# Diagonaliser une matrice en ECG : la méthode à retenir

La diagonalisation est un des chapitres où l'on peut tout comprendre en cours
et se perdre en devoir : le calcul est long, les étapes s'enchaînent, et une
erreur au début contamine la suite. Pourtant la démarche est toujours la même.
Elle se retient comme une **recette en quatre temps**, et ce qui se mémorise
vraiment tient en quelques énoncés précis.

## À quoi sert la diagonalisation

Une matrice carrée A est diagonalisable s'il existe une matrice inversible
P et une matrice diagonale D telles que A = PDP⁻¹. L'intérêt est
pratique : les puissances deviennent faciles, puisque
Aⁿ = PDⁿP⁻¹ et que élever une matrice diagonale à la puissance n
revient à élever ses coefficients. On s'en sert pour les suites récurrentes
linéaires, les chaînes de Markov, les systèmes différentiels et les
endomorphismes en général.

## La recette en quatre temps

1. **Trouver les valeurs propres.** On cherche les réels λ pour
   lesquels A − λI n'est pas inversible. En pratique, on cherche un
   polynôme annulateur, ou on résout un système par échelonnement.
2. **Déterminer les sous-espaces propres.** Pour chaque valeur propre
   λ, on résout AX = λX et on donne une base du noyau de
   A − λI.
3. **Compter les dimensions.** La matrice est diagonalisable si et seulement
   si la somme des dimensions des sous-espaces propres vaut la taille de la
   matrice.
4. **Écrire P et D.** P a pour colonnes les vecteurs propres, D les
   valeurs propres correspondantes, **dans le même ordre**.

L'ordre des colonnes est la source d'erreur la plus fréquente : si vous
permutez deux colonnes de P, permutez les mêmes coefficients de D.

## Les critères à avoir en tête

Plusieurs résultats permettent de conclure vite, sans calculer :

- Une matrice carrée d'ordre n qui a **n valeurs propres distinctes** est
  diagonalisable.
- Une matrice **symétrique réelle** est diagonalisable.
- Une matrice qui possède un **polynôme annulateur scindé à racines simples**
  est diagonalisable.
- Une matrice triangulaire à coefficients diagonaux deux à deux distincts est
  diagonalisable ; une matrice triangulaire à diagonale constante et non
  diagonale ne l'est pas.

Ces critères valent d'être appris tels quels : ils économisent un calcul
complet, et le jury de concours attend qu'on les cite correctement.

## Les cartes à écrire

Le sujet se prête bien à la révision par cartes, parce que beaucoup
d'éléments sont de pures définitions. Voici une base de six cartes :

<div class="tableau-enveloppe" markdown="1">

| Recto | Verso |
|---|---|
| Quand dit-on que λ est valeur propre de A ? | Quand il existe un vecteur X non nul tel que AX = λX. |
| Que vaut Aⁿ si A = PDP⁻¹ ? | Aⁿ = PDⁿP⁻¹. |
| Condition suffisante de diagonalisabilité en fonction des valeurs propres ? | n valeurs propres distinctes pour une matrice d'ordre n. |
| Critère de diagonalisabilité avec les sous-espaces propres ? | La somme de leurs dimensions est égale à n. |
| Une matrice symétrique réelle est-elle diagonalisable ? | Oui. |
| Comment lire les valeurs propres avec un polynôme annulateur ? | Elles sont parmi les racines de ce polynôme. |

</div>

Pour la formulation des cartes, l'article sur
[les formules de maths en flashcards](/blog/flashcards-formules-de-maths/){: target="_blank" rel="noopener" }
détaille comment rédiger recto et verso quand il y a des symboles. Le
paquet gratuit de maths approfondies, sur
[la page des paquets](/decks/#maths), reprend ces énoncés avec le rendu des
formules.

## Les pièges du calcul

- **Oublier la vérification.** Avant de conclure, contrôlez que AX = λX
  pour chaque vecteur trouvé, et que P est bien inversible.
- **Confondre valeur propre et vecteur propre.** Une valeur propre est un
  scalaire, un vecteur propre est un vecteur non nul.
- **Conclure trop vite avec une valeur propre double.** Une valeur propre
  de multiplicité deux n'entraîne pas un sous-espace propre de dimension deux.
  C'est le point à vérifier, pas à supposer.
- **Inverser P sans nécessité.** Pour Aⁿ on a besoin de P⁻¹, mais
  pour beaucoup de questions, D suffit.

Si vous tenez un cahier d'erreurs, ces quatre points y ont leur place : voir
[l'article sur le cahier d'erreurs](/blog/cahier-d-erreurs-en-prepa/){: target="_blank" rel="noopener" }.
Et pour la mise en perspective avec les probabilités et les chaînes de
Markov, voir
[l'article sur les formules de probabilités](/blog/formules-de-probabilites-ecg/){: target="_blank" rel="noopener" }.

## Comment s'y entraîner

La méthode se retient en la pratiquant, pas en la lisant. Un bon
rythme : une diagonalisation complète par semaine, chronométrée, sur une
matrice d'ordre 3, puis la vérification de Aⁿ pour n = 2. À côté, dix
minutes de cartes sur les critères et les définitions suffisent à les garder
disponibles. Le principe général de la révision des maths est détaillé dans
[l'article sur la révision des maths en ECG](/blog/reviser-les-maths-en-ecg/){: target="_blank" rel="noopener" }.

## Questions fréquentes

### Une matrice non diagonalisable est-elle inutile ?

Non. Elle se traite autrement, souvent par une trigonalisation ou en
cherchant un polynôme annulateur. En première année, les sujets restent
cependant dans le cadre où la diagonalisation est possible ou à justifier.

### Faut-il savoir calculer le polynôme caractéristique ?

Le programme d'ECG ne l'exige pas ; on travaille avec les polynômes
annulateurs et la résolution directe de systèmes. Suivez la méthode donnée
par votre professeur.

### Comment savoir si je dois chercher les valeurs propres par un polynôme annulateur ?

Quand l'énoncé fournit une relation du type A² − 3A + 2I = 0, c'est le
signal : les valeurs propres sont à chercher parmi les racines du
polynôme associé.

### Combien de matrices d'entraînement faut-il ?

Une dizaine de matrices bien choisies, avec leurs corrections refaites sans
regarder, valent mieux que trente matrices survolées.

<div class="encart">
  <p>PrépaCards s'essaie 30 jours gratuitement, sans carte bancaire, sur
  Windows 10 et 11, avec le rendu des formules de maths.
  <a href="/telecharger/">Télécharger</a> ·
  <a href="/decks/#maths">Les paquets de maths</a></p>
</div>
