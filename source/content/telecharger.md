---
title: Télécharger gratuitement pour Windows | PrépaCards
description: Télécharger PrépaCards pour Windows 10 et 11 : installation en deux minutes, sans droits administrateur ni compte en ligne. Vos cartes restent sur votre ordinateur.
slug: telecharger
faq: true
---

# Télécharger PrépaCards

<p class="chapeau">Gratuit, pour Windows 10 et 11. Aucun compte en ligne à
créer, aucun droit administrateur nécessaire.</p>

{{bloc_telechargement}}

<div class="encart encart-attention">
  <p><strong>Windows va afficher un avertissement au premier lancement.</strong>
  L'application n'est pas signée numériquement — un certificat de signature de
  code coûte plusieurs centaines d'euros par an, hors de portée d'un projet
  à ce stade. Cliquez sur <em>Informations complémentaires</em> puis
  <em>Exécuter quand même</em>. Nous préférons l'annoncer ici plutôt que de
  vous laisser découvrir un message inquiétant.</p>
</div>

## Installation

1. Décompressez l'archive téléchargée.
2. Double-cliquez sur **Installer PrépaCards.bat**.
3. L'application se copie dans votre profil utilisateur, avec un raccourci sur
   le Bureau et une entrée dans le menu Démarrer.
4. Lancez-la depuis le raccourci. Au premier démarrage, créez votre compte
   local (e-mail + mot de passe) : il ne sert qu'à verrouiller l'ouverture de
   l'application sur votre machine.

L'installation ne demande pas de droits administrateur : tout se fait dans
votre dossier utilisateur. Pour désinstaller, lancez `Desinstaller.ps1` depuis
le dossier d'installation — vos cartes sont conservées.

## Configuration requise

<div class="tableau-enveloppe" markdown="1">

| | |
|---|---|
| Système | Windows 10 ou 11, 64 bits |
| Espace disque | 700 Mo pour l'application, environ 1,5 Go avec les modèles |
| Mémoire | 4 Go suffisent |
| Micro | Nécessaire pour la vérification à l'oral |
| Webcam | Optionnelle, pour la lecture labiale |
| Internet | Au premier lancement seulement, pour télécharger les modèles |

</div>

## Premier lancement : ce qui se télécharge

PrépaCards ne contient pas les modèles d'intelligence artificielle, afin de ne
pas distribuer un fichier d'un gigaoctet à tout le monde. Ils sont récupérés au
premier usage de la fonction concernée, puis conservés :

- **reconnaissance vocale** : environ 500 Mo, au lancement de votre première
  session de révision ;
- **suivi du visage** : environ 4 Mo, à la première activation de la webcam ;
- **reconnaissance de formules** : environ 170 Mo, à votre premier import de
  formule, et seulement après votre accord explicite.

Ensuite, l'application fonctionne hors ligne.

<h2 id="autres-systemes">Mac, iPhone, Android</h2>

PrépaCards **n'existe pas encore** sur ces systèmes, et nous ne voulons pas
laisser croire le contraire. La vérification de la prononciation et la lecture
labiale s'appuient sur des bibliothèques installées localement, ce qui rend le
portage long — particulièrement sur mobile.

Si vous êtes sur Mac ou si une version mobile vous serait utile, dites-le :
c'est le nombre de demandes qui décidera de l'ordre des priorités.

<p><a class="bouton-secondaire" href="mailto:contact@prepacards.fr?subject=Version%20Mac%20ou%20mobile">Demander une version Mac ou mobile</a></p>

## Questions fréquentes

### Pourquoi le téléchargement est-il si lourd ?

L'archive contient Python et toutes les bibliothèques nécessaires — interface graphique, reconnaissance vocale, traitement d'image, rendu de formules. C'est le prix d'une application qui fonctionne sans rien installer d'autre et sans dépendre d'un serveur. En contrepartie, elle démarre en un peu plus d'une seconde.

### L'installation peut-elle casser quelque chose sur mon ordinateur ?

L'installateur copie des fichiers dans votre dossier utilisateur et crée deux raccourcis. Il ne touche ni aux fichiers système, ni aux paramètres de Windows, et ne demande pas de droits administrateur. Par défaut, il n'écrit rien dans le registre.

### Mes cartes sont-elles perdues si je désinstalle ?

Non. Le désinstallateur supprime le programme et les raccourcis, mais conserve volontairement vos cartes et votre compte dans `%APPDATA%\PrepaCards`. À vous de supprimer ce dossier si vous voulez vraiment tout effacer.

### Comment mettre à jour ?

Téléchargez la nouvelle archive et relancez l'installateur : il remplace le programme sans toucher à vos cartes.
