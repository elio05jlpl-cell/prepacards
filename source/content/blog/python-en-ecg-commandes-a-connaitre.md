---
title: Python en ECG : les commandes à connaître par cœur | PrépaCards
description: Les commandes Python exigibles en ECG : numpy, matrices, algèbre linéaire, simulations, graphiques. Ce qu'il faut savoir écrire sans aide, et comment l'apprendre.
date: 2026-11-20
slug: python-en-ecg-commandes-a-connaitre
faq: true
filiere: commerciale
matiere: maths, informatique
---

# Python en ECG : les commandes à connaître par cœur

L'informatique de la voie ECG ne demande pas de devenir programmeur.
Le programme officiel fixe une liste précise de **commandes exigibles** :
celles qu'un candidat doit savoir écrire sans documentation. Tout ce qui n'y
figure pas est rappelé dans l'énoncé. Cette liste est courte, ce qui rend
l'apprentissage par cœur raisonnable, et elle compte : une question
d'informatique rapporte des points réguliers aux écrits.

## Ce qui est exigible, par famille

Le programme découpe les commandes par bibliothèque. Les imports usuels sont
`import numpy as np`, `import numpy.linalg as al`,
`import numpy.random as rd` et `import matplotlib.pyplot as plt`.

<div class="tableau-enveloppe" markdown="1">

| Famille | Commandes exigibles |
|---|---|
| Création de tableaux | `np.array`, `np.zeros`, `np.ones`, `np.eye`, `np.linspace`, `np.arange` |
| Taille et produit | `np.shape`, `np.dot`, `np.transpose` |
| Calculs sur tableaux | `np.sum`, `np.min`, `np.max`, `np.mean`, `np.cumsum`, `np.median`, `np.var`, `np.std` |
| Fonctions usuelles | `np.exp`, `np.log`, `np.sqrt`, `np.abs`, `np.floor` |
| Constantes | `np.e`, `np.pi` |
| Algèbre linéaire | `al.inv`, `al.rank`, `al.matrix_power`, `al.solve`, `al.eig` |
| Simulation | `rd.random`, `rd.binomial`, `rd.randint`, `rd.geometric`, `rd.poisson`, `rd.exponential`, `rd.normal`, `rd.gamma` |
| Graphiques | `plt.plot`, `plt.show`, `plt.hist` |

</div>

La liste précise varie légèrement entre la première et la deuxième année :
en seconde année s'ajoutent par exemple des tracés de lignes de niveau pour
les fonctions de deux variables. Le programme officiel de votre année fait
foi.

## Ce qu'il faut savoir *faire*

Connaître les noms ne suffit pas : le sujet demande d'écrire un petit
programme. Quatre gestes reviennent presque chaque année.

- **Écrire une fonction** : `def f(x):` avec un `return`. Un oubli du
  `return` est la faute la plus fréquente.
- **Boucler** : `for k in range(n):` pour une somme ou un terme de suite,
  `while` pour un seuil à atteindre.
- **Simuler** : écrire une simulation d'une loi à partir de `rd.random`, ou
  utiliser directement `rd.binomial(n, p)` ou `rd.geometric(p)`.
- **Tracer** : calculer un tableau de valeurs avec `np.linspace`, puis
  `plt.plot(x, y)` et `plt.show()`.

Un exemple, le plus classique : approcher une espérance par une moyenne de
simulations.

    import numpy as np
    import numpy.random as rd

    n = 10000
    x = rd.binomial(10, 0.2, n)
    print(np.mean(x))

On vérifie que la valeur obtenue est proche de n × p = 2. C'est un motif qui
revient sous mille formes : une fois celui-ci su, les variantes se
reconnaissent d'un coup d'œil.

## Les fautes qui coûtent des points

- **Les indices.** Python compte à partir de 0 : `range(n)` va de 0 à
  n − 1. C'est le piège de toutes les sommes.
- **`np.dot` ou `*`.** L'opérateur `*` multiplie coefficient par
  coefficient ; le produit matriciel, c'est `np.dot`.
- **Les paramètres de `rd.binomial`.** Dans l'ordre : le nombre d'essais,
  la probabilité, éventuellement la taille de l'échantillon.
- **L'indentation.** Un bloc mal décalé change le sens, ou ne s'exécute pas.
- **Les parenthèses de `np.shape`.** Elle renvoie deux valeurs : on écrit
  `a, b = np.shape(M)`.

## Comment l'apprendre

Le piège est de la traiter comme une matière à lire. L'informatique de
prépa s'apprend en **écrivant**, et ce qui doit être su est de l'ordre du
vocabulaire : un nom, sa signification, sa syntaxe.

1. **Une carte par commande**, avec au recto ce que vous voulez faire
   (« générer 100 tirages d'une loi binomiale de paramètres 10 et 0,2 ») et
   au verso la commande exacte.
2. **Un programme par semaine**, écrit à la main sur papier, comme au
   concours : pas d'éditeur, pas de correction automatique.
3. **Les annales**, en commençant par les questions d'informatique seules,
   qui se traitent en quelques minutes chacune.

L'article sur
[la révision des maths en ECG](/blog/reviser-les-maths-en-ecg/){: target="_blank" rel="noopener" }
place l'informatique dans l'organisation générale de la matière, et celui
sur
[les erreurs à éviter dans les flashcards](/blog/rediger-ses-flashcards/){: target="_blank" rel="noopener" }
rappelle pourquoi le recto doit poser une question précise. Pour les
sections scientifiques, l'équivalent est décrit dans
[l'article sur l'informatique en prépa scientifique](/blog/reviser-linformatique-en-prepa-scientifique/){: target="_blank" rel="noopener" }.

## Questions fréquentes

### Faut-il connaître la syntaxe par cœur ou comprendre la logique ?

Les deux, dans cet ordre : la syntaxe est ce qui s'oublie, la logique ce
qui se raisonne. Les commandes de la liste doivent être sues sans effort ;
l'algorithme, lui, se reconstruit.

### Que faire si j'oublie un nom de fonction pendant l'épreuve ?

Écrivez-la comme vous pensez qu'elle s'appelle et expliquez ce qu'elle fait
en commentaire. Un correcteur valorise un programme dont la logique est
juste, même avec une erreur de nom.

### Les commandes sont-elles identiques en première et deuxième année ?

La base est la même ; la deuxième année en ajoute (tracés de courbes de
niveau, gradient, par exemple). Reprenez la liste de votre année dans le
programme officiel.

### Faut-il s'entraîner sur ordinateur ?

Au début oui, pour tester. Avant les concours, entraînez-vous aussi sur
papier : c'est la condition de l'épreuve.

<div class="encart">
  <p>PrépaCards s'essaie 30 jours gratuitement, sans carte bancaire, sur
  Windows 10 et 11.
  <a href="/telecharger/">Télécharger</a> ·
  <a href="/blog/flashcards-formules-de-maths/">Flashcards de formules de maths</a></p>
</div>
