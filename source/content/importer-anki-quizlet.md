---
title: Importer ses paquets Anki ou Quizlet en 2 minutes | PrépaCards
description: Convertir un paquet Anki .apkg ou un jeu Quizlet en cartes PrépaCards, en gardant les sous-paquets et les textes à trous. Guide pas à pas, sans tableur.
slug: importer-anki-quizlet
nav_label: Importer
faq: true
---

<section class="import-bandeau">
  <div class="conteneur centre">
    <span class="eyebrow">Importer</span>
    <h1>Vous ne recommencez pas vos cartes à zéro</h1>
    <p class="chapeau">Anki et Quizlet s'importent directement : vos sous-paquets et vos textes à trous suivent, et rien ne quitte votre ordinateur.</p>
  </div>
</section>

<section class="section import-corps" id="import-onglets">
  <div class="conteneur">
    <h2 class="import-titre">Importer vos paquets en deux minutes</h2>
    <p class="import-intro">Choisissez d'où vous venez : les étapes s'adaptent. L'écran de PrépaCards vous montre exactement ce qui sera importé avant d'écrire quoi que ce soit.</p>
    <div class="import-onglets" role="tablist" aria-label="D'où venez-vous ?">
      <button type="button" role="tab" id="onglet-anki" aria-controls="panneau-anki" aria-selected="true">Depuis Anki</button>
      <button type="button" role="tab" id="onglet-quizlet" aria-controls="panneau-quizlet" aria-selected="false">Depuis Quizlet</button>
    </div>

    <div class="import-panneau" id="panneau-anki" role="tabpanel" aria-labelledby="onglet-anki">
      <div class="import-colonnes">
        <ol class="import-etapes">
          <li>
            <h3>Exportez le paquet dans Anki</h3>
            <p>Clic droit sur le paquet, <strong>Exporter</strong>, ou <em>Fichier → Exporter</em>. Choisissez le format <em>Paquet Anki (.apkg)</em>. Les médias cochés ou non, cela ne change rien pour l'import.</p>
            <p class="import-note">Si un message parle d'une <strong>version récente d'Anki</strong>, refaites l'export en cochant <em>Prendre en charge les anciennes versions d'Anki</em> : depuis la version 2.1.50, Anki compresse ses exports.</p>
          </li>
          <li>
            <h3>Ouvrez l'import dans PrépaCards</h3>
            <p>Bouton <strong>Importer</strong> de l'écran d'accueil, puis <em>Depuis Anki (.apkg) ou Quizlet</em> → <strong>Choisir un fichier</strong>. Ou <em>Fichier → Importer depuis Anki ou Quizlet</em> : <strong>Ctrl + Maj + I</strong>.</p>
          </li>
          <li>
            <h3>Relisez l'aperçu, puis importez</h3>
            <p>L'écran affiche le nombre de cartes, les paquets détectés, un aperçu des premières et la liste de ce qui ne sera pas repris. Rien n'est écrit tant que vous n'avez pas cliqué sur <strong>Importer</strong>.</p>
          </li>
          <li class="import-fin">
            <h3>Révisez dès aujourd'hui</h3>
            <p>Les cartes arrivent comme neuves : les intervalles d'Anki ne se transposent pas. Comptez trois semaines pour retrouver le bon rythme.</p>
          </li>
        </ol>
        <aside class="import-maquette" aria-label="Maquette de l'écran d'import">
          <div class="import-fenetre">
            <div class="import-fenetre-barre"><span class="import-fenetre-carre"></span>Importer depuis Anki</div>
            <div class="import-fenetre-corps">
              <div class="import-fenetre-titre">Paquet Anki détecté</div>
              <div class="import-fenetre-fichier">anglais-prepa.apkg</div>
              <div class="import-chiffres">
                <div><strong>1 248</strong><span>cartes</span></div>
                <div><strong>14</strong><span>paquets</span></div>
                <div class="import-chiffre-attention"><strong>23</strong><span>avec image</span></div>
              </div>
              <ul class="import-arbre">
                <li><span>Anglais::Vocabulaire::Économie</span><span>96</span></li>
                <li><span>Anglais::Civilisation::Brexit</span><span>84</span></li>
                <li><span>Géopolitique::Chine</span><span>61</span></li>
              </ul>
              <div class="import-fenetre-pied"><span class="import-faux-bouton">Importer 1 248 cartes</span><span>Rien n'est écrit avant ce clic</span></div>
            </div>
          </div>
          <p class="import-legende">Maquette de l'écran d'import de l'application Windows ; les chiffres sont un exemple.</p>
        </aside>
      </div>
    </div>

    <div class="import-panneau" id="panneau-quizlet" role="tabpanel" aria-labelledby="onglet-quizlet">
      <div class="import-colonnes">
        <ol class="import-etapes">
          <li>
            <h3>Exportez le jeu dans Quizlet</h3>
            <p>Quizlet ne produit pas de fichier : il affiche votre jeu sous forme de texte à copier. Ouvrez le jeu, menu <strong>⋯</strong> → <strong>Exporter</strong>.</p>
          </li>
          <li>
            <h3>Copiez le texte proposé</h3>
            <p>Sélectionnez tout le texte de la fenêtre d'export et copiez-le : <strong>Ctrl + C</strong>.</p>
            <p class="import-note">Si votre jeu vient d'un ancien export enregistré en fichier <code>.txt</code>, passez plutôt par <strong>Choisir un fichier</strong> : le résultat est le même.</p>
          </li>
          <li>
            <h3>Collez-le dans PrépaCards</h3>
            <p>Bouton <strong>Importer</strong> → <em>Depuis Anki (.apkg) ou Quizlet</em>, puis collez dans la zone de texte : <strong>Ctrl + V</strong>. Vous n'avez pas à toucher aux réglages de séparateurs : l'application les détecte en regardant lequel découpe le plus de lignes en deux colonnes — tabulation, tiret, point-virgule ou barre verticale. Une virgule dans une définition ne la trompe pas.</p>
          </li>
          <li class="import-fin">
            <h3>Choisissez où arrivent les cartes, puis importez</h3>
            <p>Un jeu Quizlet n'a qu'un seul niveau : <strong>tout mettre dans un seul paquet</strong> est le plus simple. Vérifiez l'aperçu, puis cliquez sur <strong>Importer</strong>.</p>
          </li>
        </ol>
        <aside class="import-maquette" aria-label="Maquette de l'écran d'import">
          <div class="import-fenetre">
            <div class="import-fenetre-barre"><span class="import-fenetre-carre"></span>Importer depuis Quizlet</div>
            <div class="import-fenetre-corps">
              <div class="import-fenetre-titre">Texte collé</div>
              <div class="import-fenetre-fichier">Séparateur détecté : tabulation</div>
              <pre class="import-texte">to curb	enrayer
a loophole	une faille
the turnout	le taux de participation
to ban	interdire</pre>
              <div class="import-chiffres">
                <div><strong>36</strong><span>cartes</span></div>
                <div><strong>1</strong><span>paquet</span></div>
                <div><strong>0</strong><span>à vérifier</span></div>
              </div>
              <div class="import-fenetre-pied"><span class="import-faux-bouton">Importer 36 cartes</span><span>Rien n'est écrit avant ce clic</span></div>
            </div>
          </div>
          <p class="import-legende">Maquette de l'écran d'import de l'application Windows ; les chiffres sont un exemple.</p>
        </aside>
      </div>
    </div>

    <div class="import-garanties">
      <div><strong>Hors ligne</strong><span>La conversion se fait sur votre ordinateur. Vos cartes ne quittent pas votre machine.</span></div>
      <div><strong>Rien n'est écrasé</strong><span>Un import ajoute des cartes sans toucher à celles qui s'y trouvent déjà. Les doublons exacts sont écartés.</span></div>
      <div><strong>Un fichier à la fois</strong><span>Importez plusieurs paquets l'un après l'autre : ils s'ajoutent dans leur arborescence.</span></div>
    </div>
  </div>
</section>

<section class="section" markdown="1">
<div class="conteneur-texte" markdown="1">

## Ce qui est conservé

- **Vos sous-paquets**, à l'identique. *Anglais::Vocabulaire::Économie* reste
  rangé de la même façon.
- **Les cartes à trous** (*cloze*). Le trou est masqué au recto par `[...]` et
  révélé au verso — exactement le comportement d'Anki. C'est important pour les
  paquets d'histoire, de géopolitique et de culture générale, souvent composés
  presque uniquement de ces cartes.
- **La mise en forme**, ramenée en texte simple. Le gras, les listes et les
  sauts de ligne sont convertis proprement.
- **Les cartes en cours de révision**, y compris celles qui se trouvaient dans
  un paquet filtré : elles retournent dans leur paquet d'origine.

## Ce qui ne l'est pas

**Les images et les sons.** PrépaCards ne stocke que du texte. Une carte dont
le verso était un schéma arrivera avec son texte seul. L'application compte
exactement combien de cartes sont concernées et vous l'indique avant l'import,
plutôt que de vous le laisser découvrir à la trentième révision.

**L'historique de révision.** Anki calcule ses intervalles avec FSRS,
PrépaCards avec SM-2. Transposer les dates d'un algorithme à l'autre
produirait des échéances fausses — une carte annoncée acquise pour six mois
alors qu'elle ne l'est pas. Vos cartes arrivent donc comme neuves. C'est une
perte réelle, assumée : mieux vaut trois semaines pour retrouver le bon rythme
qu'un calendrier de révision erroné.

**Les modèles à plusieurs champs.** Anki fabrique plusieurs cartes à partir
d'une note de six champs. PrépaCards n'a qu'un recto et un verso : le premier
champ devient le recto, les autres sont regroupés au verso. Les modèles
courants (Basique, Basique inversé, vocabulaire) passent sans perte.

## Choisir où arrivent les cartes

Deux options, dans la même fenêtre :

- **Conserver les paquets d'origine** — recommandé pour un import Anki, qui
  apporte souvent toute une arborescence.
- **Tout mettre dans un seul paquet** — plus simple pour un jeu Quizlet, qui
  n'a de toute façon qu'un seul niveau.

## Questions fréquentes

### PrépaCards lit-il vraiment les fichiers .apkg ?

Oui, les trois variantes du format produites par Anki au fil des versions : `collection.anki2`, `collection.anki21` et la version compressée `collection.anki21b` des versions 2.1.50 et suivantes. Les fichiers `.colpkg`, qui sauvegardent une collection entière, sont également lus.

### Mes cartes Anki vont-elles garder leur avancement ?

Non. Les intervalles d'Anki sont calculés par l'algorithme FSRS, PrépaCards utilise SM-2 : les transposer donnerait des dates de révision fausses. Vos cartes repartent comme neuves. C'est la seule perte que nous considérons comme vraiment gênante, et nous préférons l'annoncer plutôt que d'inventer une conversion approximative.

### Et si mon paquet contient des images ?

Les cartes sont importées avec leur texte, sans l'image. Avant de valider, l'application affiche le nombre exact de cartes concernées, ce qui permet de décider en connaissance de cause — et de garder Anki en parallèle si ces cartes vous sont indispensables.

### Puis-je importer plusieurs paquets ?

Oui, un fichier à la fois. Rien n'est écrasé : un import ajoute des cartes aux paquets existants sans toucher à celles qui s'y trouvent déjà. Les doublons exacts présents dans le fichier source sont écartés automatiquement.

### L'import fonctionne-t-il hors ligne ?

Oui. La conversion se fait entièrement sur votre ordinateur, rien n'est envoyé à un serveur. Vos cartes ne quittent pas votre machine.

<div class="encart">
  <p>PrépaCards est gratuit pour Windows 10 et 11.
  <a href="/telecharger/">Télécharger</a> ·
  <a href="/alternative-anki/">Comparatif avec Anki</a> ·
  <a href="/alternative-quizlet/">Comparatif avec Quizlet</a></p>
</div>

</div>
</section>
