// Textes des e-mails de l'essai gratuit
// =====================================
//
// Quatre messages, voir essais.js pour le calendrier. Ton : court, concret,
// aucune pression. Chaque message dit ce qu'il faut faire et tient en un
// ecran. Les messages de conseils (J+1, J+7) portent un lien de
// desinscription ; ceux qui portent sur le compte (J+25, J+31) disent
// seulement pourquoi ils sont envoyes.

import { enveloppe } from './courriel.js';

const BOUTON = 'display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;'
  + 'font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px';
const PARA = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155';
const PIED = 'margin:22px 0 0;font-size:12.5px;line-height:1.55;color:#64748b';

function echapper(texte) {
  return String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pluriel(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

function pied(promo, lien) {
  if (promo) {
    const l = lien
      ? `<a href="${echapper(lien)}" style="color:#64748b">Ne plus recevoir ces conseils</a>`
      : 'Répondez « stop » pour ne plus recevoir ces conseils';
    return {
      texte: lien
        ? `Vous recevez ce message car vous avez accepté nos conseils d’utilisation.\nNe plus en recevoir : ${lien}`
        : 'Vous recevez ce message car vous avez accepté nos conseils d’utilisation.\nRépondez « stop » pour ne plus en recevoir.',
      html: `<p style="${PIED}">Vous recevez ce message car vous avez accepté nos conseils d’utilisation. ${l}.</p>`,
    };
  }
  return {
    texte: 'Ce message est lié à votre compte PrépaCards (essai gratuit).',
    html: `<p style="${PIED}">Ce message est lié à votre compte PrépaCards (essai gratuit).</p>`,
  };
}

/** genre : essai_j1 | essai_j7 | essai_j25 | essai_j31.
 *  options : { jours, lienDesinscription, promo }. Rend { sujet, texte, html }
 *  ou null si le genre est inconnu. */
export function messageEssai(genre, { jours = 0, lienDesinscription = '', promo = false } = {}) {
  const p = pied(promo, lienDesinscription);

  if (genre === 'essai_j1') {
    return {
      sujet: 'Bien démarrer avec PrépaCards en 5 minutes',
      texte: [
        'Bonjour,',
        '',
        'Voici comment tirer parti de votre essai dès aujourd’hui :',
        '',
        '1. Importez une liste existante : photographiez votre feuille de',
        '   vocabulaire ou de formules, PrépaCards en fait des cartes.',
        '2. Choisissez un paquet gratuit prêt à l’emploi :',
        '   https://prepacards.fr/decks/',
        '3. Fixez le rythme : 10 à 20 nouvelles cartes par jour suffisent.',
        '',
        'Télécharger l’application : https://prepacards.fr/telecharger/',
        '',
        p.texte,
      ].join('\n'),
      html: enveloppe(`
<p style="margin:0 0 16px;font-size:19px;font-weight:700">Bien démarrer en 5 minutes</p>
<p style="${PARA}">Voici comment tirer parti de votre essai dès aujourd’hui :</p>
<ol style="${PARA};padding-left:20px">
<li><strong>Importez une liste existante</strong> : photographiez votre feuille de vocabulaire ou de formules, PrépaCards en fait des cartes.</li>
<li><strong>Choisissez un paquet gratuit</strong> prêt à l’emploi, parmi <a href="https://prepacards.fr/decks/" style="color:#1e3a8a">les paquets gratuits</a>.</li>
<li><strong>Fixez le rythme</strong> : 10 à 20 nouvelles cartes par jour suffisent.</li>
</ol>
<p style="margin:0 0 8px"><a href="https://prepacards.fr/telecharger/" style="${BOUTON}">Ouvrir l’application</a></p>
${p.html}`),
    };
  }

  if (genre === 'essai_j7') {
    return {
      sujet: 'Une semaine avec PrépaCards : 20 minutes par jour',
      texte: [
        'Bonjour,',
        '',
        'Une semaine déjà. Ce qui fait la différence ensuite, ce n’est pas la',
        'durée des séances mais leur régularité : 20 minutes par jour, au même',
        'moment, battent deux heures le dimanche.',
        '',
        'Notre méthode en détail :',
        'https://prepacards.fr/blog/routine-de-revision-de-20-minutes/',
        '',
        'Si des cartes s’accumulent, suspendez les nouvelles quelques jours :',
        'la file se vide d’elle-même.',
        '',
        p.texte,
      ].join('\n'),
      html: enveloppe(`
<p style="margin:0 0 16px;font-size:19px;font-weight:700">Une semaine déjà</p>
<p style="${PARA}">Ce qui fait la différence ensuite, ce n’est pas la durée des séances mais leur <strong>régularité</strong> : 20 minutes par jour, au même moment, battent deux heures le dimanche.</p>
<p style="margin:0 0 16px"><a href="https://prepacards.fr/blog/routine-de-revision-de-20-minutes/" style="${BOUTON}">Lire la méthode</a></p>
<p style="${PARA}">Si des cartes s’accumulent, suspendez les nouvelles quelques jours : la file se vide d’elle-même.</p>
${p.html}`),
    };
  }

  if (genre === 'essai_j25') {
    const reste = jours <= 0 ? 'se termine aujourd’hui'
      : `se termine dans ${pluriel(jours, 'jour')}`;
    return {
      sujet: jours <= 0 ? 'Votre essai PrépaCards se termine aujourd’hui'
        : `Votre essai PrépaCards se termine dans ${pluriel(jours, 'jour')}`,
      texte: [
        'Bonjour,',
        '',
        `Votre essai gratuit de PrépaCards ${reste}.`,
        '',
        'Pour continuer sans interruption : 9,99 € par mois, ou 95,90 € par an',
        '(l’équivalent de 7,99 € par mois). Sans engagement, résiliable à tout',
        'moment. Si vous vous abonnez avant la fin de l’essai, vous ne payez',
        'qu’à la date de fin : aucun jour offert n’est perdu.',
        '',
        'S’abonner : https://prepacards.fr/tarifs/',
        '',
        'Vous ne souhaitez pas continuer ? Vos cartes restent sur votre',
        'ordinateur, et vous pouvez toutes les exporter depuis l’application.',
        '',
        p.texte,
      ].join('\n'),
      html: enveloppe(`
<p style="margin:0 0 16px;font-size:19px;font-weight:700">Votre essai ${reste}</p>
<p style="${PARA}">Pour continuer sans interruption : <strong>9,99 € par mois</strong>, ou <strong>95,90 € par an</strong> (7,99 € par mois). Sans engagement, résiliable à tout moment.</p>
<p style="${PARA}">Si vous vous abonnez avant la fin de l’essai, vous ne payez qu’à la date de fin : aucun jour offert n’est perdu.</p>
<p style="margin:0 0 16px"><a href="https://prepacards.fr/tarifs/" style="${BOUTON}">S’abonner</a></p>
<p style="${PARA}">Vous ne souhaitez pas continuer ? Vos cartes restent sur votre ordinateur, et vous pouvez toutes les exporter depuis l’application.</p>
${p.html}`),
    };
  }

  if (genre === 'essai_j31') {
    return {
      sujet: 'Votre essai PrépaCards est terminé — rien n’est perdu',
      texte: [
        'Bonjour,',
        '',
        'Votre essai gratuit de PrépaCards est terminé.',
        '',
        'Vos cartes, vos paquets et votre progression sont conservés sur votre',
        'ordinateur. Pour reprendre là où vous en étiez : 9,99 € par mois ou',
        '95,90 € par an, sans engagement.',
        '',
        'S’abonner : https://prepacards.fr/tarifs/',
        '',
        'Pour récupérer vos cartes, l’application permet d’exporter tous vos',
        'paquets depuis l’écran d’accès.',
        '',
        'Une raison de ne pas continuer ? Répondez à ce message, nous lisons',
        'tout.',
        '',
        p.texte,
      ].join('\n'),
      html: enveloppe(`
<p style="margin:0 0 16px;font-size:19px;font-weight:700">Votre essai est terminé</p>
<p style="${PARA}">Vos cartes, vos paquets et votre progression sont <strong>conservés</strong> sur votre ordinateur. Pour reprendre là où vous en étiez : 9,99 € par mois ou 95,90 € par an, sans engagement.</p>
<p style="margin:0 0 16px"><a href="https://prepacards.fr/tarifs/" style="${BOUTON}">Reprendre</a></p>
<p style="${PARA}">Pour récupérer vos cartes, l’application permet d’exporter tous vos paquets depuis l’écran d’accès.</p>
<p style="${PARA}">Une raison de ne pas continuer ? Répondez à ce message, nous lisons tout.</p>
${p.html}`),
    };
  }

  return null;
}
