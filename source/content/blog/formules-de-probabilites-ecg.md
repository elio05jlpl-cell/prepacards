---
title: Probabilités en ECG : les formules à savoir par cœur | PrépaCards
description: Les formules de probabilités à retenir en ECG : lois usuelles, espérance, variance, conditionnement, inégalités et approximations, en tableaux à apprendre.
date: 2026-11-15
slug: formules-de-probabilites-ecg
faq: true
filiere: commerciale
matiere: maths
---

# Les formules de probabilités à connaître par cœur en ECG

Les probabilités occupent une place importante du programme d'ECG, en
première comme en deuxième année, et elles reviennent aux écrits comme aux
oraux. Elles ont une particularité : presque tout y repose sur une dizaine de
résultats que l'on réutilise sans cesse. Si vous les avez en tête, les
exercices deviennent des enchaînements ; sinon, chaque question demande de
tout redémontrer.

Cet article rassemble l'essentiel, regroupé par situation. Ce n'est pas un
cours : il suppose que vous avez compris les notions, et sert à vérifier
que vous les savez sans regarder.

## Conditionnement et indépendance

<div class="tableau-enveloppe" markdown="1">

| Résultat | Formule |
|---|---|
| Probabilité conditionnelle | P(A ∣ B) = P(A ∩ B) / P(B) |
| Probabilités composées | P(A ∩ B) = P(B) × P(A ∣ B) |
| Probabilités totales | P(B) = Σ P(Aᵢ) P(B ∣ Aᵢ) |
| Formule de Bayes | P(A ∣ B) = P(B ∣ A) P(A) / P(B) |
| Indépendance de A et B | P(A ∩ B) = P(A) P(B) |
| Union | P(A ∪ B) = P(A) + P(B) − P(A ∩ B) |

</div>

La formule des probabilités totales s'applique à un **système complet
d'événements** : des événements deux à deux incompatibles dont la réunion
est tout l'univers. Pensez à vérifier cette condition avant de l'utiliser.

## Espérance, variance et covariance

<div class="tableau-enveloppe" markdown="1">

| Résultat | Formule |
|---|---|
| Espérance | E(X) = Σ xᵢ P(X = xᵢ) |
| Formule de transfert | E(g(X)) = Σ g(xᵢ) P(X = xᵢ) |
| Linéarité | E(aX + bY) = a E(X) + b E(Y) |
| Variance | V(X) = E(X²) − E(X)² |
| Transformation affine | V(aX + b) = a² V(X) |
| Covariance | Cov(X, Y) = E(XY) − E(X) E(Y) |
| Variance d'une somme | V(X + Y) = V(X) + V(Y) + 2 Cov(X, Y) |
| Indépendance | X, Y indépendantes ⇒ Cov(X, Y) = 0 |

</div>

Le sens de la dernière ligne est à retenir précisément : l'indépendance
entraîne une covariance nulle, mais la réciproque est fausse. C'est une
question d'oral classique.

## Les lois discrètes usuelles

<div class="tableau-enveloppe" markdown="1">

| Loi | P(X = k) | Espérance | Variance |
|---|---|---|---|
| Bernoulli B(p) | p ou 1 − p | p | p(1 − p) |
| Binomiale B(n, p) | C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ | np | np(1 − p) |
| Uniforme sur {1, …, n} | 1 / n | (n + 1) / 2 | (n² − 1) / 12 |
| Géométrique G(p) | (1 − p)ᵏ⁻¹ p, k ≥ 1 | 1 / p | (1 − p) / p² |
| Poisson P(λ) | e⁻λ λᵏ / k! | λ | λ |

</div>

Deux propriétés servent partout : la loi géométrique est **sans mémoire**
(P(X > n + k | X > n) = P(X > k)), et la somme de deux variables de Poisson
indépendantes de paramètres λ et μ suit une loi de Poisson de paramètre
λ + μ.

## Les lois à densité usuelles

<div class="tableau-enveloppe" markdown="1">

| Loi | Densité | Espérance | Variance |
|---|---|---|---|
| Uniforme sur [a, b] | 1 / (b − a) sur [a, b] | (a + b) / 2 | (b − a)² / 12 |
| Exponentielle E(λ) | λ e⁻λᵗ pour t ≥ 0 | 1 / λ | 1 / λ² |
| Normale N(m, σ²) | (1 / σ√(2π)) e^(−(t − m)² / 2σ²) | m | σ² |

</div>

Pour l'exponentielle, retenez la fonction de répartition F(x) = 1 − e⁻λˣ
et l'absence de mémoire. Pour la normale, ramenez-vous toujours à la loi
centrée réduite : si X suit N(m, σ²), alors (X − m) / σ suit N(0, 1), et
Φ(−x) = 1 − Φ(x).

## Inégalités, convergences et approximations

<div class="tableau-enveloppe" markdown="1">

| Résultat | Énoncé |
|---|---|
| Markov | X ≥ 0, a > 0 ⇒ P(X ≥ a) ≤ E(X) / a |
| Bienaymé-Tchebychev | P(∣X − E(X)∣ ≥ ε) ≤ V(X) / ε² |
| Loi faible des grands nombres | P(∣X̄ₙ − m∣ ≥ ε) → 0 |
| Théorème central limite | (X̄ₙ − m) / (σ / √n) converge en loi vers N(0, 1) |
| Binomiale par Poisson | n grand, p petit, np = λ : B(n, p) ≈ P(np) |
| Binomiale par normale | n grand : B(n, p) ≈ N(np, np(1 − p)) |

</div>

Les conditions pratiques d'approximation, souvent données dans les énoncés,
sont à connaître : binomiale vers normale quand n ≥ 30, np ≥ 5 et
n(1 − p) ≥ 5 ; binomiale vers Poisson quand n ≥ 30, p ≤ 0,1 et np ≤ 15.

## Estimation

Deux définitions suffisent à vous faire gagner du temps : le **biais** d'un
estimateur est E(θ̂) − θ, et son **risque quadratique** vaut
V(θ̂) + (biais)². Un estimateur sans biais a donc un risque égal à sa
variance. Pour une moyenne empirique de variables de même loi,
E(X̄ₙ) = m et V(X̄ₙ) = σ² / n, d'où l'intervalle de confiance bâti avec le
théorème central limite.

## Comment les retenir

Ces tableaux ne se retiennent pas en les relisant. Deux méthodes
fonctionnent mieux.

- **Poser la question, cacher la réponse.** « Variance de la loi
  géométrique ? » doit appeler 1 − p sur p² sans hésiter. C'est
  exactement ce que fait une flashcard, et la répétition espacée la
  représente au bon moment. L'article sur
  [les flashcards de formules de maths](/blog/flashcards-formules-de-maths/){: target="_blank" rel="noopener" }
  détaille comment les rédiger.
- **Relier chaque formule à une situation.** Un tirage avec remise, c'est
  une binomiale ; un temps d'attente avant un premier succès, c'est une
  géométrique ; une durée de vie sans usure, c'est une exponentielle.

PrépaCards propose ces résultats déjà rédigés, chapitre par chapitre :
[paquets de maths approfondies](/decks/#maths-approfondies) et
[paquets de maths appliquées](/decks/#maths-appliquees). Le chapitre
d'estimation et celui des convergences correspondent aux deux dernières
sections ci-dessus.

## Questions fréquentes

### Faut-il connaître les démonstrations ?

Pour les résultats les plus courts (espérance de la loi binomiale, formule de
Bayes), oui, car elles peuvent être demandées à l'oral. Pour les autres,
sachez surtout énoncer correctement les hypothèses : c'est ce qu'on vérifie
d'abord.

### Vaut-il mieux apprendre les tableaux ou les refaire ?

Les deux. Les refaire de mémoire sur une feuille est le meilleur test, et
ce qui manque devient une carte. Voir aussi
[l'article sur le cahier d'erreurs](/blog/cahier-d-erreurs-en-prepa/){: target="_blank" rel="noopener" }.

### Les formules sont-elles les mêmes en appliquées et en approfondies ?

Les lois usuelles, l'espérance, la variance et les inégalités sont communes.
Les différences portent sur la profondeur de certains chapitres.
[L'article sur le choix de l'option](/blog/maths-appliquees-ou-approfondies-ecg/){: target="_blank" rel="noopener" }
les compare.

<div class="encart">
  <p>PrépaCards s'essaie 30 jours gratuitement, sans carte bancaire, sur
  Windows 10 et 11.
  <a href="/telecharger/">Télécharger</a> ·
  <a href="/decks/#maths-approfondies">Les paquets de maths</a></p>
</div>
