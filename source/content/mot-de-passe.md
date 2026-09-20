---
title: Choisir un nouveau mot de passe — PrépaCards
description: Choisissez un nouveau mot de passe PrépaCards depuis le lien reçu par e-mail. Il vous servira sur l'application, le site et le téléphone, avec le même compte.
slug: mot-de-passe
robots: noindex, nofollow
---

<section class="section" markdown="1">
<div class="conteneur-texte" markdown="1">

<div id="mdp-app" class="compte-zone">

  <h1>Nouveau mot de passe</h1>

  <div id="mdp-formulaire" hidden>
    <p class="chapeau">Choisissez un mot de passe d'au moins 8 caractères.
      Il vous servira sur l'application, le site et le téléphone.</p>

    <form id="mdp-form" class="compte-form" autocomplete="on">
      <label for="mdp-nouveau">Nouveau mot de passe</label>
      <input id="mdp-nouveau" name="mot_de_passe" type="password" required
             autocomplete="new-password" placeholder="8 caractères minimum">

      <label for="mdp-confirme">Confirmer</label>
      <input id="mdp-confirme" name="confirmation" type="password" required
             autocomplete="new-password" placeholder="Le même, à nouveau">

      <p id="mdp-message" class="compte-message" hidden></p>

      <button class="bouton" type="submit" id="mdp-valider">Enregistrer</button>
    </form>
  </div>

  <div id="mdp-sans-jeton" hidden>
    <p class="chapeau">Cette page s'ouvre depuis le lien reçu par e-mail.</p>
    <div class="encart">
      <p>Le lien est valable <strong>une heure</strong> et ne fonctionne
        qu'une fois. S'il a expiré, demandez-en un nouveau depuis
        l'application ou depuis la page de votre compte.</p>
      <p><a class="bouton-secondaire" href="/compte/">Aller à mon compte</a></p>
    </div>
  </div>

  <div id="mdp-fini" hidden>
    <div class="encart">
      <p><strong>Mot de passe modifié.</strong> Vous pouvez vous connecter
        avec le nouveau, dans l'application comme sur le site.</p>
      <p>Par précaution, toutes les sessions ouvertes ont été fermées :
        il faudra vous reconnecter sur vos autres appareils.</p>
      <p><a class="bouton" href="/compte/">Se connecter</a></p>
    </div>
  </div>

</div>

</div>
</section>
