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
au service, à la connexion, qui rend en échange un jeton de session valable
six mois. C'est ce jeton que l'application conserve : il lui permet de se
rouvrir ensuite sans rien vous demander, et sans réseau.

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
3. **Votre compte.** Voir la section suivante.
4. **Consultation de ce site.** Voir plus bas.

## Votre compte

Un compte gratuit est demandé **à la première ouverture** de l'application,
puis plus jamais, sauf si vous vous déconnectez. Il est le même pour
l'application, le site et une éventuelle application mobile : c'est ce qui
permet de retrouver son abonnement sur une autre machine.

**Ce que le serveur enregistre** : votre adresse e-mail, une empreinte de
votre mot de passe (PBKDF2-HMAC-SHA256, 200 000 itérations, avec un sel
aléatoire), l'état de votre abonnement et sa date d'échéance, l'identifiant
client transmis par Stripe, et — si vous vous connectez avec Google —
l'identifiant que Google attribue à votre compte. Les jetons de session et les
liens de réinitialisation n'y figurent que sous forme d'empreinte : une fuite
de la base ne donnerait aucun accès utilisable.

**Les services qui interviennent** :

- **Cloudflare** héberge le service et la base, dans l'Union européenne.
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
révision, vos statistiques, vos enregistrements vocaux, vos photos. Rien de
tout cela ne lui est transmis.

**La sauvegarde**, si vous la déclenchez, est chiffrée sur votre ordinateur
avec une clé dérivée de votre mot de passe. Le serveur reçoit un bloc
d'octets qu'il ne peut pas ouvrir. Conséquence à connaître : **réinitialiser
votre mot de passe rend la sauvegarde existante définitivement illisible**, y
compris pour nous — le nouveau mot de passe ne peut pas ouvrir ce que
l'ancien a chiffré. Vous retrouvez l'accès à votre compte et à votre
abonnement, pas à cette sauvegarde. C'est le prix de ce chiffrement, et nous
préférons ce défaut à la possibilité de lire vos cartes.

Le service est hébergé chez Cloudflare, dans l'Union européenne.

## Sur ce site

Ce site est statique : il ne dépose **aucun cookie** et n'utilise aucun outil
de suivi publicitaire. Il n'y a donc pas de bandeau de consentement, faute de
quoi consentir.

L'hébergeur conserve des journaux de connexion techniques (adresse IP, page
demandée, date), pour la sécurité et la mesure de charge, pendant une durée
limitée. C'est le traitement minimal inhérent au fonctionnement d'un serveur
web.

Si vous nous écrivez, votre adresse e-mail et le contenu de votre message sont
conservés le temps de traiter votre demande, puis supprimés.

## Base légale et durées

<div class="tableau-enveloppe" markdown="1">

| Traitement | Base légale | Durée |
|---|---|---|
| Compte (adresse, empreinte du mot de passe) | Exécution du contrat | Jusqu'à la suppression du compte |
| Abonnement et paiement | Exécution du contrat ; obligation légale pour les factures | [durée légale de conservation des pièces comptables] |
| E-mail de réinitialisation | Exécution du contrat | Le lien vaut une heure ; l'envoi est journalisé par Resend [durée à vérifier] |
| Journaux du serveur web | Intérêt légitime (sécurité) | [durée pratiquée par votre hébergeur] |
| Réponse à un message | Intérêt légitime | Le temps de l'échange, puis suppression |
| Liste d'attente Premium ou version Mac | Consentement | Jusqu'au retrait de votre consentement |

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

### Ce site utilise-t-il Google Analytics ?

Non. Aucun outil de mesure d'audience n'est installé.

<p style="color:var(--gris);font-size:.9rem">Dernière mise à jour :
[date de mise en ligne]</p>
