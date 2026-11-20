/**
 * EsportsBracket — Tournament Bracket Engine (bracket.js)
 * Assigned to: Sanjukta Kalita
 * PRD Section 6, 7, 8, 10, 18
 * 
 * Pure algorithmic module for:
 * - Single-elimination bracket generation (4–16 teams)
 * - Power-of-2 sizing & automatic BYE distribution
 * - Standard esports seeding pairs
 * - Automatic winner advancement (advanceWinner)
 * - Safe downstream cascade reset on score edits (resetDownstream)
 */

const BracketEngine = (function () {

  /**
   * Calculates the next power of 2 for a team count (4, 8, or 16)
   */
  function calculateBracketSize(teamCount) {
    if (teamCount <= 4) return 4;
    if (teamCount <= 8) return 8;
    return 16;
  }

  /**
   * Calculates how many byes are needed (bracketSize - teamCount)
   */
  function calculateByes(teamCount) {
    const size = calculateBracketSize(teamCount);
    return size - teamCount;
  }

  /**
   * Standard esports seeding pairs for single elimination brackets
   * Ensures top seeds meet as late as possible (Grand Finals)
   */
  function getStandardSeedingPairs(bracketSize) {
    if (bracketSize === 4) {
      // 2 matches in R1
      return [
        [1, 4],
        [2, 3]
      ];
    }
    if (bracketSize === 8) {
      // 4 matches in R1: 1v8 and 4v5 feed Semi 1; 3v6 and 2v7 feed Semi 2
      return [
        [1, 8],
        [4, 5],
        [3, 6],
        [2, 7]
      ];
    }
    // Default 16-slot bracket (PRD Section 8, 10)
    // 1v16 and 8v9 feed QF1; 5v12 and 4v13 feed QF2; 3v14 and 6v11 feed QF3; 7v10 and 2v15 feed QF4
    return [
      [1, 16],
      [8, 9],
      [5, 12],
      [4, 13],
      [3, 14],
      [6, 11],
      [7, 10],
      [2, 15]
    ];
  }

  /**
   * Returns human-readable round names based on round index and total rounds
   */
  function getRoundName(roundNumber, totalRounds) {
    const roundsFromFinal = totalRounds - roundNumber;
    if (roundsFromFinal === 0) return 'Final';
    if (roundsFromFinal === 1) return 'Semi-finals';
    if (roundsFromFinal === 2) return 'Quarter-finals';
    return `Round ${roundNumber}`;
  }

  /**
   * Validates team names entered by user (PRD Section 8 & 11)
   * - 4 to 16 teams
   * - Case-insensitive uniqueness
   * - 2 to 24 characters each
   */
  function validateTeamNames(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const errors = [];
    const cleanNames = [];
    const seenNames = new Map();

    if (lines.length < 4) {
      errors.push(`At least 4 teams are required (currently ${lines.length}).`);
    } else if (lines.length > 16) {
      errors.push(`Maximum 16 teams allowed (currently ${lines.length}).`);
    }

    lines.forEach((name, idx) => {
      const lineNum = idx + 1;
      if (name.length < 2 || name.length > 24) {
        errors.push(`Line ${lineNum}: "${name}" must be between 2 and 24 characters.`);
      }
      const lower = name.toLowerCase();
      if (seenNames.has(lower)) {
        errors.push(`Line ${lineNum}: Duplicate team name "${name}" (first on line ${seenNames.get(lower)}).`);
      } else {
        seenNames.set(lower, lineNum);
        cleanNames.push(name);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      teams: cleanNames
    };
  }

  /**
   * Generates a complete single-elimination tournament bracket structure
   * 
   * @param {Array<string>} teamNames - Validated list of 4-16 team names
   * @param {string} seedingType - 'rank' (default order) or 'random'
   * @param {Object} meta - Additional info { name, game, date, bestOf }
   */
  function generateTournament(teamNames, seedingType = 'rank', meta = {}) {
    const teamCount = teamNames.length;
    if (teamCount < 4 || teamCount > 16) {
      throw new Error(`Team count must be between 4 and 16, got ${teamCount}`);
    }

    const bracketSize = calculateBracketSize(teamCount);
    const totalRounds = Math.log2(bracketSize);

    // Prepare team list with IDs and seeds
    let orderedNames = [...teamNames];
    if (seedingType === 'random') {
      // Fisher-Yates shuffle for true random seeding
      for (let i = orderedNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedNames[i], orderedNames[j]] = [orderedNames[j], orderedNames[i]];
      }
    }

    const teams = orderedNames.map((name, index) => ({
      id: `tm_${index + 1}`,
      name: name,
      seed: index + 1
    }));

    // Build seeded lookup: seed number -> team object
    const seedMap = new Map();
    teams.forEach(t => seedMap.set(t.seed, t));

    const matches = [];
    const seedPairs = getStandardSeedingPairs(bracketSize);

    // 1. Build all match slots across all rounds backwards so nextMatch references exist
    // Rounds: 1 to totalRounds (e.g. Round 1 to 4 for 16 teams)
    for (let r = 1; r <= totalRounds; r++) {
      const matchCountInRound = bracketSize / Math.pow(2, r);
      for (let m = 1; m <= matchCountInRound; m++) {
        const matchId = `R${r}-M${m}`;
        const nextRound = r + 1;
        const nextMatchSlot = Math.ceil(m / 2);
        const nextMatchId = r < totalRounds ? `R${nextRound}-M${nextMatchSlot}` : null;
        const nextSlot = r < totalRounds ? (m % 2 !== 0 ? 'A' : 'B') : null;

        matches.push({
          id: matchId,
          round: r,
          slot: m,
          teamA: null,
          teamB: null,
          scoreA: 0,
          scoreB: 0,
          status: 'Upcoming',
          winnerId: null,
          nextMatchId: nextMatchId,
          nextSlot: nextSlot,
          isBye: false,
          startedAt: null,
          endedAt: null
        });
      }
    }

    // Lookup table for match objects by ID
    const matchMap = new Map();
    matches.forEach(m => matchMap.set(m.id, m));

    // 2. Populate Round 1 matches with standard seed pairs and handle BYEs
    seedPairs.forEach((pair, idx) => {
      const matchId = `R1-M${idx + 1}`;
      const match = matchMap.get(matchId);
      const seedA = pair[0];
      const seedB = pair[1];

      const teamA = seedMap.get(seedA) || null;
      const teamB = seedMap.get(seedB) || null;

      match.teamA = teamA ? teamA.id : null;
      match.teamB = teamB ? teamB.id : null;

      // Check for BYE (teamB is null because seed is greater than teamCount)
      if (teamA && !teamB) {
        match.isBye = true;
        match.status = 'Done';
        match.winnerId = teamA.id;
        match.scoreA = 0;
        match.scoreB = 0;

        // Immediately advance teamA into Round 2
        if (match.nextMatchId && match.nextSlot) {
          const nextMatch = matchMap.get(match.nextMatchId);
          if (nextMatch) {
            if (match.nextSlot === 'A') nextMatch.teamA = teamA.id;
            else nextMatch.teamB = teamA.id;
          }
        }
      }
    });

    const tournament = {
      id: meta.id || `t_${Date.now()}`,
      name: meta.name || 'Untitled Tournament',
      game: meta.game || 'Esports Tournament',
      date: meta.date || new Date().toISOString().split('T')[0],
      status: meta.status || 'Draft',
      bestOf: meta.bestOf || { default: 1, final: 3 },
      bracketSize: bracketSize,
      totalRounds: totalRounds,
      championId: null,
      teams: teams,
      matches: matches
    };

    return tournament;
  }

  /**
   * Advances the winner of a match into the subsequent round's slot
   * PRD Section 7, 8, 10: Automatic winner advancement
   */
  function advanceWinner(tournament, matchId, winnerId, scoreA, scoreB) {
    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);

    if (match.teamA !== winnerId && match.teamB !== winnerId) {
      throw new Error(`Winner ${winnerId} is not a participant in match ${matchId}`);
    }

    match.scoreA = Number(scoreA);
    match.scoreB = Number(scoreB);
    match.status = 'Done';
    match.winnerId = winnerId;
    match.endedAt = new Date().toISOString();

    // Advance into next round
    if (match.nextMatchId && match.nextSlot) {
      const nextMatch = tournament.matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        if (match.nextSlot === 'A') {
          nextMatch.teamA = winnerId;
        } else {
          nextMatch.teamB = winnerId;
        }
        // If both teams in the next match are now determined, set status to Upcoming
        if (nextMatch.teamA && nextMatch.teamB && nextMatch.status !== 'Done' && nextMatch.status !== 'Live') {
          nextMatch.status = 'Upcoming';
        }
      }
    } else {
      // This was the Grand Final!
      tournament.championId = winnerId;
      tournament.status = 'Completed';
    }

    return tournament;
  }

  /**
   * Finds all downstream matches that depend on a given match's outcome
   */
  function getDownstreamMatches(tournament, matchId) {
    const affected = [];
    let currentId = matchId;

    while (currentId) {
      const currentMatch = tournament.matches.find(m => m.id === currentId);
      if (!currentMatch || !currentMatch.nextMatchId) break;

      const nextMatch = tournament.matches.find(m => m.id === currentMatch.nextMatchId);
      if (nextMatch) {
        affected.push(nextMatch);
        currentId = nextMatch.id;
      } else {
        break;
      }
    }

    return affected;
  }

  /**
   * Resets all downstream matches affected when an earlier result is edited
   * PRD Section 7, 8: Edit result with reset warning & downstream clearing
   * 
   * @param {Object} tournament - The tournament object
   * @param {string} matchId - The match being edited
   * @returns {number} count of downstream matches that were cleared
   */
  function resetDownstream(tournament, matchId) {
    const match = tournament.matches.find(m => m.id === matchId);
    if (!match || !match.nextMatchId) return 0;

    const downstream = getDownstreamMatches(tournament, matchId);
    let resetCount = 0;

    downstream.forEach(m => {
      // If this match was already played or in progress, it must be cleared
      if (m.status === 'Done' || m.status === 'Live' || m.winnerId !== null || m.scoreA !== 0 || m.scoreB !== 0) {
        resetCount++;
      }
      m.scoreA = 0;
      m.scoreB = 0;
      m.winnerId = null;
      m.status = 'Upcoming';
      m.startedAt = null;
      m.endedAt = null;
    });

    // Also clear the slot in the immediate next match
    const nextMatch = tournament.matches.find(m => m.id === match.nextMatchId);
    if (nextMatch) {
      if (match.nextSlot === 'A') nextMatch.teamA = null;
      else nextMatch.teamB = null;
    }

    // If tournament was marked completed, reopen it
    if (tournament.status === 'Completed') {
      tournament.status = 'Live';
      tournament.championId = null;
    }

    return resetCount;
  }

  /**
   * Swaps the seed position of two teams in the draft team list
   * Used before publishing in Screen S2 (PRD Section 8, US-03)
   */
  function swapTeams(tournament, teamIndexA, teamIndexB) {
    if (tournament.status !== 'Draft') {
      throw new Error("Teams can only be swapped before publishing the tournament.");
    }
    const teams = tournament.teams;
    if (teamIndexA < 0 || teamIndexA >= teams.length || teamIndexB < 0 || teamIndexB >= teams.length) {
      throw new Error("Invalid team swap indices.");
    }

    // Swap names and reassign seeds
    const tempName = teams[teamIndexA].name;
    teams[teamIndexA].name = teams[teamIndexB].name;
    teams[teamIndexB].name = tempName;

    // Regenerate the bracket matches with new team order
    const teamNames = teams.map(t => t.name);
    const refreshed = generateTournament(teamNames, 'rank', {
      id: tournament.id,
      name: tournament.name,
      game: tournament.game,
      date: tournament.date,
      status: 'Draft',
      bestOf: tournament.bestOf
    });

    return refreshed;
  }

  // Public API
  return {
    calculateBracketSize,
    calculateByes,
    getStandardSeedingPairs,
    getRoundName,
    validateTeamNames,
    generateTournament,
    advanceWinner,
    getDownstreamMatches,
    resetDownstream,
    swapTeams
  };

})();

// Attach to global window object
window.BracketEngine = BracketEngine;
