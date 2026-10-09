---
title: Confidentialité et données personnelles — PrépaCards
description: Quelles données PrépaCards traite et où elles sont stockées. Vos cartes ne quittent jamais votre ordinateur, sauf sauvegarde chiffrée que nous ne pouvons pas lire.
slug: confidentialite
faq: true
---

# Confidentialité et données personnelles

<p class="chapeau">Position tenue par PrépaCards : un compte gratuit est
demandé à la première ouverture de l'application, et il ne connaît que votre
adresse e-mail et l'état de votre abonnement. Vos cartes, elles, restent sur
votre ordinateur. Cette page détaille chaque cas où une donnée le quitte.</p>

<div class="encart encart-attention">
  <p><strong>À relire avant la mise en ligne</strong>, et à faire vérifier si
  vous vendez des abonnements : la description doit correspondre exactement à
  ce que fait votre site au moment de sa publication, notamment si vous ajoutez
  un outil de mesure d'audience ou un prestataire de paiement.</p>
  <p><strong>Point à faire vérifier</strong> : Resend est établi aux
  États-Unis. L'envoi de l'adresse e-mail y constitue un transfert hors de
  l'Union européenne, qui doit reposer sur un mécanisme reconnu (Data Privacy
  Framework, clauses contractuelles types). Vérifiez lequel Resend applique
  et mentionnez-le ici.</p>
</div>

## Dans l'application

**Vos cartes et votre historique de révision** sont
enregistrés dans un fichier, sur votre ordinateur, à l'emplacement
`%APPDATA%\PrepaCards`. La répétition espacée, les statistiques et la
reconnaissance de votre prononciation sont calculées là, sur votre machine.

**Vos cartes ne sont jamais transmises**, à une exception que vous déclenchez
vous-même : la sauvegarde en ligne. Elle est **chiffrée sur votre ordinateur**
avant d'être envoyée, avec une clé dérivée de votre mot de passe. Nous
recevons des octets que nous ne pouvons pas ouvrir, et que vous seul pouvez
restaurer.

**Le fichier de cartes n'est pas chiffré.** Une personne ayant accès à votre
session Windows pourrait le lire. Le compte sert à vous identifier, pas à
protéger ce fichier.

**Votre mot de passe ne reste pas sur l'ordinateur.** Il part une seule fois
au service, à la connexion, qui rend en échange un jeton de session,
renouvelé automatiquement par notre prestataire d'authentification tant que
vous restez actif. C'est ce jeton que l'application conserve : il lui
permet de se rouvrir ensuite sans rien vous demander, et sans réseau.

**Votre voix et l'image de votre webcam** sont analysées en mémoire, sur votre
processeur, puis immédiatement abandonnées. Aucun enregistrement audio ni aucune
image n'est conservé sur le disque ni transmis.

**Aucune mesure d'audience, aucune télémétrie** n'est intégrée à
l'application : elle ne signale ni son installation, ni son usage.

## Les cas où une donnée sort de votre ordinateur

1. **Traduction automatique d'une carte.** Le mot à traduire — et lui seul —
   est envoyé au service MyMemory (Translated srl, Italie). Ni votre adresse
   e-mail, ni votre identifiant, ni le reste de votre collection ne sont
   transmis. Cette fonction est optionnelle.
2. **Téléchargement des modèles au premier usage.** L'application récupère les
   modèles de reconnaissance vocale, de suivi du visage et de reconnaissance de
   formules depuis Hugging Face, Google et GitHub. Ces téléchargements
   transmettent ce que transmet toute requête web : votre adresse IP et le
   fichier demandé.
3. **Lecture en ligne d'une feuille photographiée** (offre complète,
   optionnelle). Tant que la case « Lecture en ligne » reste cochée, la
   photo est réduite puis envoyée à notre serveur, hébergé par
   Cloudflare, qui la transmet à Anthropic (États-Unis), éditeur du modèle
   qui la lit. Anthropic la traite selon ses propres conditions
   d'utilisation. PrépaCards n'en conserve aucune copie : seul est
   enregistré le nombre de feuilles lues dans le mois, pour appliquer une
   limite mensuelle. Décochez la case et la photo reste sur votre
   ordinateur : la lecture se fait alors localement.
4. **Votre compte.** Voir la section suivante.
5. **Consultation de ce site.** Voir plus bas.

## Votre compte

Un compte gratuit est demandé **à la première ouverture** de l'application,
puis plus jamais, sauf si vous vous déconnectez. Il est le même pour
l'application, le site et une éventuelle application mobile : c'est ce qui
permet de retrouver son abonnement sur une autre machine.

**Ce que le serveur enregistre** : votre adresse e-mail, une empreinte de
votre mot de passe (calculée et vérifiée par Supabase, notre prestataire
d'authentification — nous ne voyons jamais le mot de passe lui-même),
l'état de votre abonnement et sa date d'échéance, l'identifiant client
transmis par Stripe, et — si vous vous connectez avec Google — l'identifiant
que Google attribue à votre compte. Les jetons de session et les liens de
réinitialisation ne sont jamais stockés en clair.

**Les services qui interviennent** :

- **Supabase** héberge le compte, l'authentification et la sauvegarde
  chiffrée, dans l'Union européenne.
- **Cloudflare** héberge le site et reçoit les paiements Stripe.
- **Stripe** traite le paiement. Vos coordonnées bancaires ne transitent
  jamais par PrépaCards.
- **Resend** (États-Unis) envoie l'e-mail de réinitialisation du mot de passe,
  et reçoit pour cela votre adresse e-mail — uniquement si vous en faites la
  demande.
- **Google**, si vous choisissez de vous connecter avec lui. Nous ne recevons
  que votre adresse e-mail, la confirmation qu'elle est vérifiée et
  l'identifiant de votre compte Google ; ni votre nom, ni votre photo, ni vos
  contacts. L'application ne demande à Google aucune autre autorisation.

**Ce qu'il n'enregistre pas** : vos cartes, vos paquets, votre historique de
révision, vos statistiques, vos enregistrements vocaux. Rien de tout cela
ne lui est transmis. Les photos de feuilles, si vous choisissez la lecture
en ligne, ne vont pas chez lui : voir le cas 3 plus haut.

**La sauvegarde**, si vous la déclenchez, est chiffrée sur votre ordinateur
avec une clé dérivée de votre mot de passe. Le serveur reçoit un bloc
d'octets qu'il ne peut pas ouvrir. Conséquence à connaître : **réinitialiser
votre mot de passe rend la sauvegarde existante définitivement illisible**, y
compris pour nous — le nouveau mot de passe ne peut pas ouvrir ce que
l'ancien a chiffré. Vous retrouvez l'accès à votre compte et à votre
abonnement, pas à cette sauvegarde. C'est le prix de ce chiffrement, et nous
préférons ce défaut à la possibilité de lire vos cartes.

## Sur ce site

Ce site dépose **un seul cookie**, `pc_consent`, qui retient votre choix
sur les cookies pendant six mois, et n'utilise aucun outil de suivi
publicitaire. Avec votre accord, il retient aussi, **dans votre navigateur
seulement**, votre filière, vos filtres du blog et le dernier article lu. Si vous vous connectez, votre session est rangée dans le
stockage de session de votre navigateur, où elle s'efface à la fermeture de
l'onglet, sauf si vous cochez « Rester connecté » : elle reste alors dans le
stockage local jusqu'à votre déconnexion. Ces deux éléments sont nécessaires au service, donc sans
consentement. Le détail, et le moyen de changer d'avis, sont dans la page
[Cookies et stockage local](/cookies/).

Une mesure d'audience facultative est proposée : **Cloudflare Web
Analytics**, chargée **seulement si vous l'acceptez** dans le bandeau. Elle compte les pages vues et les sites qui nous envoient des
visiteurs. Elle ne pose pas de cookie, ne vous attribue pas d'identifiant, ne
vous suit pas d'un site à l'autre, et ne transmet rien à un annonceur. Nous ne
voyons que des totaux, jamais une visite individuelle.

Nous l'avons choisie précisément pour cela : savoir si une page sert à quelque
chose ne nécessite pas de savoir qui l'a lue.

L'hébergeur conserve des journaux de connexion techniques (adresse IP, page
demandée, date), pour la sécurité et la mesure de charge, pendant une durée
limitée. C'est le traitement minimal inhérent au fonctionnement d'un serveur
web.

Si vous nous écrivez, votre adresse e-mail et le contenu de votre message sont
conservés le temps de traiter votre demande, puis supprimés.

**La liste d'attente** (page [Télécharger](/telecharger/#autres-systemes)) : si
vous demandez une version Mac, iPhone ou Android, nous enregistrons **votre
adresse e-mail et les systèmes que vous avez cochés**, rien d'autre — ni date de
visite, ni identifiant. Elle sert à décider de l'ordre des portages, puis à
vous écrire **une fois**, à la sortie de la version attendue. Elle est stockée
chez Supabase, comme le compte, et n'est transmise à personne. Pour être
retiré de la liste, écrivez à [contact@prepacards.fr](mailto:contact@prepacards.fr) ;
la liste est de toute façon supprimée une fois les versions annoncées.

## Base légale et durées

<div class="tableau-enveloppe" markdown="1">

| Traitement | Base légale | Durée |
|---|---|---|
| Compte (adresse, empreinte du mot de passe) | Exécution du contrat | Jusqu'à la suppression du compte |
| Abonnement et paiement | Exécution du contrat ; obligation légale pour les factures | [durée légale de conservation des pièces comptables] |
| E-mail de réinitialisation | Exécution du contrat | Le lien vaut une heure ; l'envoi est journalisé par Resend [durée à vérifier] |
| Journaux du serveur web | Intérêt légitime (sécurité) | [durée pratiquée par votre hébergeur] |
| Réponse à un message | Intérêt légitime | Le temps de l'échange, puis suppression |
| Liste d'attente (Mac, iPhone, Android) | Consentement | Jusqu'au retrait de votre consentement, ou à l'annonce de la version attendue |

</div>

## Vos droits

Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation
et d'opposition sur les données vous concernant, ainsi que d'un droit à la
portabilité. Pour l'exercer :
<a href="mailto:contact@prepacards.fr">contact@prepacards.fr</a>.

En cas de désaccord, vous pouvez saisir la CNIL (Commission nationale de
l'informatique et des libertés), 3 place de Fontenoy, 75334 Paris Cedex 07,
<a href="https://www.cnil.fr" rel="nofollow">www.cnil.fr</a>.

S'agissant de vos cartes, la portabilité est immédiate et ne demande aucune
démarche : *Fichier → Exporter en CSV* dans l'application.

## Questions fréquentes

### Mes enregistrements vocaux sont-ils conservés ?

Non. L'audio est transcrit en mémoire puis abandonné. Aucun fichier audio n'est écrit sur le disque, et rien n'est envoyé sur internet : la reconnaissance vocale fonctionne sur votre processeur.

### Les images de ma webcam sont-elles enregistrées ?

Non. Les images servent uniquement à mesurer le mouvement de vos lèvres, image par image, en mémoire. L'application n'écrit aucune capture et la caméra se referme quand vous quittez la session.

### Faut-il un compte pour utiliser l'application ?

Oui, un compte gratuit, demandé une seule fois à la première ouverture. Il est le même sur l'application, le site et une éventuelle application mobile. Si vous oubliez votre mot de passe, un lien de réinitialisation est envoyé à l'adresse du compte. Vos cartes, elles, restent sur votre ordinateur : le compte vous identifie, il ne les emporte pas.

### Puis-je supprimer mon compte ?

Oui, vous-même et immédiatement, depuis [votre espace compte](/compte/) — aucune demande à nous envoyer. La suppression efface votre profil et votre sauvegarde chiffrée. Si un abonnement est actif, résiliez-le d'abord depuis le lien reçu par e-mail lors du paiement : supprimer le compte n'arrête pas les prélèvements Stripe.

### Ce site utilise-t-il Google Analytics ?

Non. La mesure d'audience, si vous l'acceptez, passe par Cloudflare Web
Analytics, qui ne dépose aucun cookie et ne construit aucun profil : elle compte des pages vues, pas
des personnes. Aucune donnée n'est transmise à Google ni à un annonceur.

### Comment changer mon choix sur les cookies ?

Avec le lien « Gérer mes choix sur les cookies » en pied de page, ou sur la
page [Cookies et stockage local](/cookies/). Refuser est aussi simple
qu'accepter.

<p style="color:var(--gris);font-size:.9rem">Dernière mise à jour :
[date de mise en ligne]</p>
