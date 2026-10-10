---
title: Télécharger pour Windows : 30 jours offerts | PrépaCards
description: Télécharger PrépaCards pour Windows 10 et 11 : 30 jours d'essai sans carte bancaire, installation en deux minutes. Vos cartes restent sur votre ordinateur.
slug: telecharger
faq: true
---

# Télécharger PrépaCards

<p class="chapeau">30 jours gratuits, sans carte bancaire, pour Windows
10 et 11. Aucun droit administrateur nécessaire. Vos cartes restent sur votre
ordinateur.</p>

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

1. Téléchargez **PrepaCards-installateur.exe** avec le bouton ci-dessus.
2. Double-cliquez dessus. Si Windows affiche l'avertissement décrit plus haut,
   cliquez sur *Informations complémentaires* puis *Exécuter quand même*.
3. Suivez l'assistant : une seule question (un raccourci sur le Bureau ?),
   puis l'installation, qui prend environ une minute. L'application se copie
   dans votre profil utilisateur, avec une entrée dans le menu Démarrer.
4. Lancez-la depuis le raccourci et connectez-vous avec le compte que vous
   avez créé sur le site. Votre essai de 30 jours court depuis la création du
   compte. La connexion n'est demandée qu'une fois : les lancements suivants
   l'ouvrent directement, même sans réseau ; l'application vérifie votre
   accès en ligne de temps en temps.

L'installation ne demande pas de droits administrateur : tout se fait dans
votre dossier utilisateur. Pour désinstaller : *Paramètres* de Windows, puis
*Applications*, puis PrépaCards — vos cartes sont conservées.

## Configuration requise

<div class="tableau-enveloppe" markdown="1">

| | |
|---|---|
| Système | Windows 10 ou 11, 64 bits |
| Espace disque | 700 Mo pour l'application, environ 1,5 Go avec les modèles |
| Mémoire | 4 Go suffisent |
| Micro | Nécessaire pour la vérification à l'oral |
| Webcam | Optionnelle, pour la lecture labiale |
| Internet | Au premier lancement, pour le compte et les modèles. Ensuite, facultatif |

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

Ensuite, l'application fonctionne hors ligne, hormis la traduction automatique.

<h2 id="autres-systemes">Mac, iPhone, Android</h2>

PrépaCards **n'existe pas encore** sur ces systèmes, et nous ne voulons pas
laisser croire le contraire. La vérification de la prononciation et la lecture
labiale s'appuient sur des bibliothèques installées localement, ce qui rend le
portage long — particulièrement sur mobile.

Si une version Mac ou mobile vous serait utile, dites-le : c'est le nombre de
demandes qui décidera de l'ordre des priorités, et nous vous écrirons **une
seule fois**, le jour où la version que vous attendez existe.

<div id="attente-app" class="attente-zone">
<form id="attente-form" class="attente-form" novalidate>
<fieldset class="attente-choix">
<legend>Je voudrais PrépaCards sur</legend>
<label><input type="checkbox" name="plateformes" value="mac"> Mac</label>
<label><input type="checkbox" name="plateformes" value="iphone"> iPhone et iPad</label>
<label><input type="checkbox" name="plateformes" value="android"> Android</label>
</fieldset>
<label for="attente-email" class="attente-etiquette">Adresse e-mail</label>
<input id="attente-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="vous@exemple.fr" required>
<div class="attente-piege" aria-hidden="true"><label>Ne pas remplir<input id="attente-piege" name="site_web" type="text" tabindex="-1" autocomplete="off"></label></div>
<p id="attente-message" class="compte-message" hidden></p>
<button class="bouton" type="submit" id="attente-valider">Me prévenir</button>
<p class="attente-note">Votre adresse ne sert qu'à vous prévenir de cette sortie, jamais à
autre chose, et n'est transmise à personne. Pour la faire retirer, écrivez à
<a href="mailto:contact@prepacards.fr">contact@prepacards.fr</a>. Voir la
<a href="/confidentialite/">politique de confidentialité</a>.</p>
</form>
</div>

## Questions fréquentes

### Pourquoi le téléchargement est-il si lourd ?

Le programme contient Python et toutes les bibliothèques nécessaires — interface graphique, reconnaissance vocale, traitement d'image, rendu de formules. C'est le prix d'une application qui fonctionne sans rien installer d'autre et sans dépendre d'un serveur. En contrepartie, elle démarre en un peu plus d'une seconde.

### L'installation peut-elle casser quelque chose sur mon ordinateur ?

L'installateur copie des fichiers dans votre dossier utilisateur, crée une entrée dans le menu Démarrer (et un raccourci sur le Bureau si vous le voulez) et ajoute PrépaCards à la liste des applications installées de Windows, ce qui permet de la désinstaller depuis les Paramètres. Il ne touche ni aux fichiers système, ni aux paramètres de Windows, et ne demande pas de droits administrateur. Au premier lancement, l'application demande à se lancer avec Windows pour vous envoyer ses rappels de révision ; vous pouvez le refuser ou le retirer à tout moment dans ses paramètres.

### Mes cartes sont-elles perdues si je désinstalle ?

Non. Le désinstallateur supprime le programme et les raccourcis, mais conserve volontairement vos cartes et votre compte dans `%APPDATA%\PrepaCards`. À vous de supprimer ce dossier si vous voulez vraiment tout effacer.

### Comment mettre à jour ?

Téléchargez le nouvel installateur et lancez-le : il remplace le programme sans toucher à vos cartes.
