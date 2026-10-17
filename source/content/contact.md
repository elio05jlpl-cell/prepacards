---
title: Contacter PrépaCards : une question, un problème | PrépaCards
description: Une question sur PrépaCards, un problème d'installation ou une suggestion ? Écrivez-nous depuis ce formulaire : nous lisons tous les messages et répondons par mail.
slug: contact
---

# Nous écrire

<p class="chapeau">Une question, un problème d'installation, une idée ?
Nous lisons tous les messages et répondons par e-mail, en général sous
deux jours ouvrés.</p>

<div id="contact-app" class="attente-zone">
<form id="contact-form" class="attente-form" novalidate>
<label for="contact-nom" class="attente-etiquette">Votre prénom (facultatif)</label>
<input id="contact-nom" name="nom" type="text" autocomplete="given-name" maxlength="80">
<label for="contact-email" class="attente-etiquette">Votre adresse e-mail</label>
<input id="contact-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="vous@exemple.fr" required>
<label for="contact-sujet" class="attente-etiquette">Sujet</label>
<select id="contact-sujet" name="sujet">
<option>Une question sur l'application</option>
<option>Un problème d'installation ou de plantage</option>
<option>Mon abonnement ou un paiement</option>
<option>Mes données personnelles</option>
<option>Une suggestion</option>
<option>Autre</option>
</select>
<label for="contact-message" class="attente-etiquette">Votre message</label>
<textarea id="contact-message" name="message" rows="7" maxlength="4000" required></textarea>
<div class="attente-piege" aria-hidden="true"><label>Ne pas remplir<input id="contact-piege" name="site_web" type="text" tabindex="-1" autocomplete="off"></label></div>
<div id="contact-turnstile"></div>
<p id="contact-message-etat" class="compte-message" hidden></p>
<button class="bouton" type="submit" id="contact-valider">Envoyer</button>
<p class="attente-note">Votre adresse ne sert qu'à vous répondre. Si l'application
a planté, joignez la version affichée dans <em>À propos</em> : sans elle, un
problème est souvent impossible à reproduire. Voir la
<a href="/confidentialite/">politique de confidentialité</a>.</p>
</form>
</div>
