---
title: Anki en français, avec la vérification à l'oral | PrépaCards
description: Anki ou PrépaCards ? Comparatif franc : algorithme, plateformes, prise en main, vérification à l'oral et formules de maths. Avec les limites de chacun, sans détour.
slug: alternative-anki
faq: true
---

# PrépaCards ou Anki : le comparatif

<p class="chapeau">Anki est un excellent logiciel. Si vous cherchez une page
qui explique qu'il est mauvais, ce n'est pas celle-ci. Voici honnêtement où
chacun est meilleur, pour que vous choisissiez le bon outil.</p>

## Le tableau

<div class="tableau-enveloppe" markdown="1">

| | PrépaCards | Anki |
|---|---|---|
| Prix | 30 jours gratuits, puis 9,99 € par mois | Gratuit sur ordinateur et Android ; application iOS payante |
| Code ouvert | Non | Oui |
| Plateformes | Windows uniquement | Windows, macOS, Linux, Android, iOS |
| Synchronisation | <span class="non">Non</span> | <span class="oui">Oui, gratuite via AnkiWeb</span> |
| Algorithme de révision | SM-2 | FSRS, plus récent et plus efficace |
| Prise en main | Quelques minutes | Plusieurs heures, tutoriels nécessaires |
| Modules complémentaires | Non | <span class="oui">Oui, très nombreux</span> |
| Bibliothèque de paquets partagés | Non | <span class="oui">Oui, immense</span> |
| Vérification de la prononciation au micro | <span class="oui">Oui, intégrée</span> | Non, hors module tiers |
| Lecture labiale par webcam | <span class="oui">Oui</span> | <span class="non">Non</span> |
| Photo de formule convertie en LaTeX | <span class="oui">Oui, intégrée</span> | Non, hors module tiers |
| Données hors ligne | <span class="oui">Oui, tout en local</span> | Oui, avec synchronisation optionnelle |
| Interface en français | <span class="oui">Oui, conçue en français</span> | Oui, traduite |

</div>

## Ce qu'Anki fait mieux, sans discussion

Autant l'écrire clairement, parce que ce sont des avantages décisifs pour
beaucoup de gens.

**Il est partout.** Windows, Mac, Linux, Android, iPhone, et une synchronisation
gratuite entre tous. Réviser dans le métro ou entre deux cours est un usage
majeur des flashcards, et PrépaCards ne le permet pas aujourd'hui.

**Son algorithme est meilleur.** Anki utilise FSRS, qui modélise l'oubli plus
finement que le SM-2 de PrépaCards et réduit le nombre de révisions nécessaires
pour un même résultat. Sur ce point précis, il est en avance.

**Sa bibliothèque de paquets partagés est irremplaçable.** Des milliers de
paquets prêts à l'emploi, y compris pour la médecine et les langues.
PrépaCards n'a rien d'équivalent.

**Il est open source, et gratuit sans réserve.** Aucune fonction n'est derrière
un abonnement sur ordinateur.

## Ce que PrépaCards fait mieux

**Il vous écoute prononcer.** C'est la différence de fond. Anki vous montre la
réponse et vous demande si vous la saviez — vous êtes juge et partie.
PrépaCards enregistre votre voix, transcrit ce que vous avez dit et compare.
Pour du vocabulaire de langue ou une définition d'ESH destinée à être
récitée en colle, l'écart est considérable.

Des modules complémentaires d'Anki proposent de la reconnaissance vocale, mais
il faut les trouver, les installer, les configurer, et ils cassent à chaque mise
à jour majeure d'Anki.

**Les formules de maths ne demandent pas de taper du LaTeX.** Photographiez la
page du cours, l'application la découpe en formules et convertit celle que vous
désignez. En prépa scientifique, c'est la différence entre avoir des cartes de
maths et abandonner au bout de trois.

**Il ne demande pas d'apprendre à s'en servir.** Anki expose ses types de
notes, ses préréglages, ses filtres de recherche, ses options de paquet sur
quatre onglets. Cette puissance a un prix : beaucoup d'étudiants abandonnent
pendant la configuration, avant d'avoir créé leur première carte. PrépaCards
fait moins de choses, et les fait sans manuel.

## Comment choisir

**Prenez Anki si** vous révisez sur plusieurs appareils, si vous voulez la
meilleure planification possible des révisions, si vous comptez utiliser des
paquets partagés, ou si vous êtes sur Mac, Linux ou mobile.

**Prenez PrépaCards si** vous travaillez sur un PC Windows, que vous voulez
réviser à l'oral pour préparer des colles ou un grand oral, que vous avez
beaucoup de formules à mémoriser, ou qu'Anki vous a découragé avant que vous
n'ayez commencé.

**Les deux ne sont pas exclusifs.** Les deux applications importent et exportent
du CSV : rien n'empêche de garder Anki pour le mobile et d'utiliser PrépaCards
pour les séances d'oral devant son PC.

## Passer d'Anki à PrépaCards

1. Dans Anki : *Fichier → Exporter*, choisissez **Paquet Anki (.apkg)**.
2. Dans PrépaCards : bouton **Importer** de l'accueil → *Depuis Anki (.apkg)
   ou Quizlet*.
3. Un aperçu s'affiche : nombre de cartes, paquets détectés, et ce qui ne sera
   pas repris. Vous validez avant que quoi que ce soit ne soit écrit.

Vos sous-paquets sont conservés tels quels — *Anglais::Vocabulaire* reste
*Anglais::Vocabulaire*. Les cartes à trous sont converties : le trou est masqué
au recto et révélé au verso, comme dans Anki.

Deux choses ne sont pas reprises, et l'application vous dit combien de cartes
sont concernées avant l'import. Les **images et les sons** : PrépaCards ne
stocke que du texte. L'**historique de révision** : Anki calcule ses intervalles
avec un autre algorithme, les transposer produirait des échéances fausses. Vos
cartes arrivent donc comme neuves.

Voir le [guide détaillé de l'import](/importer-anki-quizlet/).

## Questions fréquentes

### PrépaCards est-il un clone d'Anki ?

Il reprend volontairement l'organisation qui a fait la réussite d'Anki — paquets, sous-paquets, compteurs de cartes nouvelles, en cours et à réviser, notation sur quatre niveaux — parce que cette organisation fonctionne et que la réapprendre n'apporterait rien. Ce qui change, c'est l'ajout de la vérification à l'oral, de la reconnaissance de formules, et une interface qui ne demande pas de tutoriel. PrépaCards est un projet indépendant, sans aucun lien avec Anki ni ses auteurs.

### Anki est gratuit : pourquoi payer pour PrépaCards ?

Si Anki vous suffit, gardez-le : il est excellent et gratuit. PrépaCards se paie parce qu'il fait ce qu'Anki ne fait pas : la vérification de la prononciation à voix haute, la photo de formule ou de liste transformée en cartes, 119 paquets prêts pour la prépa, et une prise en main sans tutoriel. Vous pouvez l'essayer 30 jours, sans carte bancaire, avant de décider.

### Puis-je utiliser mes paquets partagés Anki dans PrépaCards ?

Seulement s'ils contiennent du texte et si vous les convertissez en CSV. Les paquets partagés riches en images et en sons perdront ces éléments.

### Mon historique de révision Anki est-il conservé à l'import ?

Non. L'import CSV crée des cartes neuves, qui repartent au début du cycle de révision. C'est une limite réelle si vous avez plusieurs années d'historique dans Anki.
