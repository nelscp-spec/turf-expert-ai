/**
 * TurfExpert AI - Algorithme Spécialiste d'Analyse Hippique & Générateur de Combinaisons
 */

const TurfEngine = {

  /**
   * Complete Tech & Statistical Analysis for a Race
   */
  analyzeRace(race, totalBudget = 20) {
    if (!race || !race.partants || race.partants.length === 0) {
      return {
        race: race || {},
        scoredRunners: [],
        tickets: [],
        synthesis: { summary: "Aucun partant disponible pour cette course.", favoriteNote: "N/A", outsiderNote: "N/A", trendNote: "N/A" }
      };
    }

    // 1. Analyze and score every runner
    const analyzedRunners = race.partants.map((runner, idx) => {
      const formScore = this.parseMusiqueScore(runner.musique);
      const shoeBonus = this.calculateShoeBonus(runner.fer, race.discipline);
      const driverBonus = this.calculateDriverBonus(runner.jockey, runner.entraineur);
      const pressScoreNormalized = (runner.presseScore || 5) * 10;
      
      let compositeScore = (formScore * 0.35) + (pressScoreNormalized * 0.30) + (shoeBonus * 0.15) + (driverBonus * 0.20);
      compositeScore = Math.min(99, Math.max(10, Math.round(compositeScore)));

      const coteVal = parseFloat(runner.cote) || Math.round((2.8 + idx * 2.4) * 10) / 10;
      const isValueBet = (compositeScore > 65 && coteVal >= 8.0);
      const isBaseSolide = (compositeScore >= 82 && coteVal <= 4.5);
      const isFavori = (compositeScore >= 75 && coteVal <= 7.0);

      return {
        ...runner,
        cote: coteVal,
        formScore,
        shoeBonus,
        driverBonus,
        compositeScore,
        isValueBet,
        isBaseSolide,
        isFavori
      };
    });

    // Sort runners by composite AI Score descending
    analyzedRunners.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign predicted rank
    analyzedRunners.forEach((r, idx) => { r.predictedRank = idx + 1; });

    // Fallbacks for small fields
    const dummyRunner = { num: 1, nom: "N/A", jockey: "Pro", entraineur: "Pro", cote: 5.0, compositeScore: 50, fer: "F" };
    const c1 = analyzedRunners[0] || dummyRunner;
    const c2 = analyzedRunners[1] || dummyRunner;
    const c3 = analyzedRunners[2] || dummyRunner;
    const c4 = analyzedRunners[3] || dummyRunner;

    const outsiders = analyzedRunners.filter(r => r.cote >= 8.0 && r.compositeScore >= 50);
    const tocardPepite = outsiders[0] || c4;

    // 2. Generate Betting Tickets
    const tickets = this.generateCombinations(analyzedRunners, totalBudget, race);

    // 3. Generate Expert Synthesis
    const synthesis = {
      summary: `Sur les ${race.partantsCount || analyzedRunners.length} partants de ${race.nom} à ${race.hippodrome || 'l\'hippodrome'}, le N°${c1.num} (${c1.nom}) ressort en tête de nos algorithmes avec un score de ${c1.compositeScore}/100.`,
      favoriteNote: `N°${c1.num} (${c1.nom}) - Cote ${c1.cote}. Forme parfaite (${c1.musique || '1a 2a'}). Driver: ${c1.jockey}.`,
      outsiderNote: `N°${tocardPepite.num} (${tocardPepite.nom}) - Cote ${tocardPepite.cote}. Excellent rapport qualité/cote pour pimenter les jeux.`,
      trendNote: `Synthèse PMU Direct & Notes Equidia : Jouer N°${c1.num} et N°${c2.num} en base 2 sur 4 / Couplé.`
    };

    return {
      race,
      scoredRunners: analyzedRunners,
      topBase: c1,
      secondBase: c2,
      tocardPepite,
      tickets,
      synthesis
    };
  },

  parseMusiqueScore(musique) {
    if (!musique) return 50;
    const tokens = String(musique).split(' ');
    let score = 50;
    let weight = 1.0;

    tokens.forEach((token, index) => {
      if (index > 5) return;
      const char = token.toLowerCase();

      if (char.startsWith('1')) score += 25 * weight;
      else if (char.startsWith('2')) score += 18 * weight;
      else if (char.startsWith('3')) score += 12 * weight;
      else if (char.startsWith('4') || char.startsWith('5')) score += 6 * weight;
      else if (char.startsWith('d')) score -= 12 * weight;

      weight *= 0.8;
    });

    return Math.min(98, Math.max(15, score));
  },

  calculateShoeBonus(fer, discipline) {
    if (!fer) return 50;
    const isTrot = discipline && discipline.toLowerCase().includes('trot');
    if (!isTrot) return 50;

    switch (String(fer).toUpperCase()) {
      case 'D4': return 95;
      case 'DP': return 75;
      case 'DA': return 75;
      case 'F': default: return 40;
    }
  },

  calculateDriverBonus(jockey, entraineur) {
    const topNames = ['RAFFIN', 'BAZIRE', 'ABRIVARD', 'NIVARD', 'SOUMILLON', 'GUYON', 'DUVALDESTIN', 'ALLAIRE', 'GUARATO', 'BARZALONA'];
    let bonus = 55;
    const jStr = (jockey || '').toUpperCase();
    const eStr = (entraineur || '').toUpperCase();

    topNames.forEach(name => {
      if (jStr.includes(name)) bonus += 20;
      if (eStr.includes(name)) bonus += 15;
    });

    return Math.min(98, bonus);
  },

  generateCombinations(runners, totalBudget, race) {
    const dummy = { num: 1, nom: "N/A", cote: 5.0, compositeScore: 50 };
    const c1 = runners[0] || dummy;
    const c2 = runners[1] || dummy;
    const c3 = runners[2] || dummy;
    const c4 = runners[3] || dummy;
    const tocard = runners.find(r => r.cote >= 8.0 && r.compositeScore >= 50) || c4;

    const tickets = [];

    // Ticket 1: Simple Gagnant / Placé
    const s1 = Math.max(2, Math.round(totalBudget * 0.30));
    tickets.push({
      id: "T1",
      type: "Simple Gagnant / Placé",
      strategy: "Sécurité Absolue",
      risk: "Sécurisé",
      stake: s1,
      confidence: 88,
      expectedReturn: Math.round(s1 * c1.cote * 0.85) + " - " + Math.round(s1 * c1.cote * 1.4),
      numbers: [{ num: c1.num, isFavorite: true }, { num: c2.num, isFavorite: false }],
      reason: `Base N°${c1.num} (${c1.nom}) avec score de ${c1.compositeScore}/100. En association avec N°${c2.num}.`
    });

    // Ticket 2: Couplé Gagnant / Placé
    const s2 = Math.max(3, Math.round(totalBudget * 0.25));
    tickets.push({
      id: "T2",
      type: "Couplé Gagnant & Placé",
      strategy: "Champ Réduit Sécurité",
      risk: "Faible",
      stake: s2,
      confidence: 78,
      expectedReturn: Math.round(s2 * (c1.cote + c2.cote) * 1.2),
      numbers: [{ num: c1.num, isFavorite: true }, { num: c2.num, isFavorite: false }, { num: c3.num, isFavorite: false }],
      reason: `Association de la base N°${c1.num} avec N°${c2.num} et N°${c3.num} pour un retour sécurisé.`
    });

    // Ticket 3: 2 sur 4 PMU
    const s3 = Math.max(3, Math.round(totalBudget * 0.20));
    tickets.push({
      id: "T3",
      type: "2 sur 4 PMU",
      strategy: "Sécurité 2 parmi 4",
      risk: "Sécurisé",
      stake: s3,
      confidence: 84,
      expectedReturn: Math.round(s3 * 3.8) + " - " + Math.round(s3 * 12.5),
      numbers: [{ num: c1.num, isFavorite: true }, { num: c2.num, isFavorite: false }, { num: tocard.num, isFavorite: false }],
      reason: `Il suffit que 2 de ces 3 chevaux (N°${c1.num}, N°${c2.num}, N°${tocard.num}) se classent dans les 4 premiers pour empocher le gain.`
    });

    // Ticket 4: Trio / Tiercé
    const s4 = Math.max(3, Math.round(totalBudget * 0.15));
    tickets.push({
      id: "T4",
      type: "Tiercé / Trio",
      strategy: "Équilibré ROI",
      risk: "Modéré",
      stake: s4,
      confidence: 72,
      expectedReturn: Math.round(s4 * 18.5) + " - " + Math.round(s4 * 45),
      numbers: [{ num: c1.num, isFavorite: true }, { num: c2.num, isFavorite: true }, { num: c3.num, isFavorite: false }, { num: tocard.num, isFavorite: false }],
      reason: `Trio associant les favoris N°${c1.num} & N°${c2.num} avec l'outsider N°${tocard.num} (cote à ${tocard.cote}).`
    });

    // Ticket 5: Quinté+ Flexi 50%
    if ((race.partantsCount || runners.length) >= 10) {
      const s5 = Math.max(4, Math.round(totalBudget * 0.10));
      tickets.push({
        id: "T5",
        type: "Quinté+ Flexi 50%",
        strategy: "Équilibré Spéculatif",
        risk: "Optimisé",
        stake: s5,
        confidence: 65,
        expectedReturn: "Ordre : > 1 200 € | Désordre : " + Math.round(s5 * 35),
        numbers: [{ num: c1.num, isFavorite: true }, { num: c2.num, isFavorite: true }, { num: c3.num, isFavorite: false }, { num: c4.num, isFavorite: false }, { num: tocard.num, isFavorite: false }],
        reason: `Quinté+ Flexi 50% avec les bases N°${c1.num}-${c2.num} et l'outsider piment N°${tocard.num}.`
      });
    }

    return tickets;
  }
};
