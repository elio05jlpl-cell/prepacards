// Limitation de debit, en memoire de l'instance du Worker
// =======================================================
//
// Une fenetre glissante par cle (en pratique l'adresse IP). Elle freine un
// enchainement de requetes depuis un meme poste ; elle ne remplace pas une
// vraie limitation de debit cote Cloudflare (Securite > WAF > Regles de
// limitation de debit), car chaque instance du Worker a sa propre memoire.

export function creerLimiteur(maximum, fenetreMs) {
  const passages = new Map();

  return {
    /** Vrai si cette cle a depasse son quota pour la fenetre en cours. */
    tropDeDemandes(cle, maintenant = Date.now()) {
      const nom = cle || 'inconnue';
      const recents = (passages.get(nom) || []).filter((t) => maintenant - t < fenetreMs);
      if (recents.length >= maximum) {
        passages.set(nom, recents);
        return true;
      }
      recents.push(maintenant);
      passages.set(nom, recents);
      // On n'accumule pas indefiniment des cles vues une seule fois.
      if (passages.size > 5000) {
        for (const [k, v] of passages) {
          if (!v.some((t) => maintenant - t < fenetreMs)) passages.delete(k);
        }
      }
      return false;
    },
    oublier() {
      passages.clear();
    },
  };
}
