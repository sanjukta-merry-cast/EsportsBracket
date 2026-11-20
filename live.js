/**
 * EsportsBracket — Live Sync & Data Engine (live.js)
 * Assigned to: Akshat Kumar
 * PRD Section 6, 8, 10, 13
 * 
 * Manages:
 * - Cross-tab live synchronization (window 'storage' event)
 * - 5-second polling fallback mechanism
 * - Live Dashboard derived data (live matches, ticker, up next, follow a team)
 * - CSV Match report export
 * - Fullscreen Projector mode toggling
 */

const LiveSync = (function () {
  let cachedLastUpdate = null;
  let pollIntervalId = null;
  let updateListeners = [];

  /**
   * Registers a callback function to be called whenever tournament data changes
   */
  function onDataUpdate(callback) {
    if (typeof callback === 'function') {
      updateListeners.push(callback);
    }
  }

  /**
   * Triggers all registered listeners
   */
  function triggerUpdate(source = 'storage') {
    const latestTimestamp = Store.getLastUpdate();
    cachedLastUpdate = latestTimestamp;
    updateListeners.forEach(listener => {
      try {
        listener(source);
      } catch (err) {
        console.error("Error executing live update listener:", err);
      }
    });
  }

  /**
   * Initializes multi-tab live sync:
   * 1. Listens for window 'storage' event across browser tabs
   * 2. Sets a 5-second polling fallback check
   */
  function initLiveSync() {
    cachedLastUpdate = Store.getLastUpdate();

    // 1. Cross-tab storage event (instant in same browser)
    window.addEventListener('storage', (event) => {
      if (event.key === 'eb_lastUpdate' || event.key === 'eb_tournaments' || event.key === 'eb_session') {
        triggerUpdate('storage-event');
      }
    });

    // 2. 5-second polling fallback (PRD Section 10 & 13)
    if (pollIntervalId) clearInterval(pollIntervalId);
    pollIntervalId = setInterval(() => {
      const currentTimestamp = Store.getLastUpdate();
      if (currentTimestamp && currentTimestamp !== cachedLastUpdate) {
        triggerUpdate('interval-poll');
      }
    }, 5000);
  }

  /**
   * Returns all currently active matches with 'Live' status
   */
  function getLiveMatches(tournament) {
    if (!tournament || !tournament.matches) return [];
    return tournament.matches.filter(m => m.status === 'Live');
  }

  /**
   * Returns the latest completed matches (newest first, max 10) for the results ticker
   * PRD Section 8, 10: Latest 10 results
   */
  function getRecentResults(tournament, limit = 10) {
    if (!tournament || !tournament.matches) return [];
    const doneMatches = tournament.matches.filter(m => m.status === 'Done' && !m.isBye);
    
    // Sort descending by endedAt or by round/slot if endedAt not recorded
    doneMatches.sort((a, b) => {
      if (a.endedAt && b.endedAt) {
        return new Date(b.endedAt) - new Date(a.endedAt);
      }
      if (b.round !== a.round) return b.round - a.round;
      return b.slot - a.slot;
    });

    return doneMatches.slice(0, limit);
  }

  /**
   * Returns upcoming matches where both teams are determined and ready to play
   */
  function getUpNextMatches(tournament, limit = 5) {
    if (!tournament || !tournament.matches) return [];
    return tournament.matches
      .filter(m => m.status === 'Upcoming' && m.teamA && m.teamB && !m.isBye)
      .slice(0, limit);
  }

  /**
   * Calculates the status of a specific team followed by a gamer (PRD S5 & US-07)
   * Returns: { status: 'playing' | 'upcoming' | 'waiting' | 'eliminated' | 'champion', nextMatch, opponent, message }
   */
  function getFollowedTeamStatus(tournament, teamId) {
    if (!tournament || !teamId) return null;
    const team = tournament.teams.find(t => t.id === teamId);
    if (!team) return null;

    // Check if tournament is completed and team is champion
    if (tournament.status === 'Completed' && tournament.championId === teamId) {
      return {
        status: 'champion',
        team,
        message: `${team.name} are CampusClash Champions!`
      };
    }

    // 1. Check if team is in a LIVE match right now
    const liveMatch = tournament.matches.find(m => m.status === 'Live' && (m.teamA === teamId || m.teamB === teamId));
    if (liveMatch) {
      const oppId = liveMatch.teamA === teamId ? liveMatch.teamB : liveMatch.teamA;
      const opponent = tournament.teams.find(t => t.id === oppId);
      const totalRounds = tournament.totalRounds || Math.log2(tournament.bracketSize);
      const roundName = BracketEngine.getRoundName(liveMatch.round, totalRounds);

      return {
        status: 'playing',
        team,
        match: liveMatch,
        opponent,
        roundName,
        message: `Currently playing against ${opponent ? opponent.name : 'Opponent'} in ${roundName}!`
      };
    }

    // 2. Check if team has an UPCOMING match scheduled
    const upcomingMatch = tournament.matches.find(m => m.status === 'Upcoming' && (m.teamA === teamId || m.teamB === teamId));
    if (upcomingMatch) {
      const oppId = upcomingMatch.teamA === teamId ? upcomingMatch.teamB : upcomingMatch.teamA;
      const opponent = oppId ? tournament.teams.find(t => t.id === oppId) : null;
      const totalRounds = tournament.totalRounds || Math.log2(tournament.bracketSize);
      const roundName = BracketEngine.getRoundName(upcomingMatch.round, totalRounds);

      return {
        status: 'upcoming',
        team,
        match: upcomingMatch,
        opponent,
        roundName,
        message: opponent 
          ? `Your next match: ${roundName} vs ${opponent.name} — Up next!`
          : `Advanced to ${roundName}! Waiting for opponent to qualify.`
      };
    }

    // 3. Check if team was ELIMINATED in any completed match
    const eliminatedMatch = tournament.matches.find(m => m.status === 'Done' && (m.teamA === teamId || m.teamB === teamId) && m.winnerId !== teamId);
    if (eliminatedMatch) {
      return {
        status: 'eliminated',
        team,
        message: `${team.name} are out — GG, thanks for playing!`
      };
    }

    // 4. Default / Waiting
    return {
      status: 'waiting',
      team,
      message: `Waiting for tournament schedule.`
    };
  }

  /**
   * Generates and triggers download of a CSV match results report (PRD S6, US-10)
   */
  function exportMatchesToCSV(tournament) {
    if (!tournament || !tournament.matches) return false;

    const totalRounds = tournament.totalRounds || Math.log2(tournament.bracketSize);
    const headers = ["Match ID", "Round", "Team A", "Score A", "Score B", "Team B", "Status", "Winner", "Started At", "Ended At"];
    
    const rows = tournament.matches.map(m => {
      const teamA = m.teamA ? (tournament.teams.find(t => t.id === m.teamA)?.name || m.teamA) : 'TBD';
      const teamB = m.isBye ? 'BYE' : (m.teamB ? (tournament.teams.find(t => t.id === m.teamB)?.name || m.teamB) : 'TBD');
      const winner = m.winnerId ? (tournament.teams.find(t => t.id === m.winnerId)?.name || m.winnerId) : '';
      const roundName = BracketEngine.getRoundName(m.round, totalRounds);

      return [
        `"${m.id}"`,
        `"${roundName}"`,
        `"${teamA}"`,
        m.scoreA,
        m.scoreB,
        `"${teamB}"`,
        `"${m.status}"`,
        `"${winner}"`,
        `"${m.startedAt || ''}"`,
        `"${m.endedAt || ''}"`
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeName = tournament.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `${safeName}_match_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  }

  // Public API
  return {
    initLiveSync,
    onDataUpdate,
    triggerUpdate,
    getLiveMatches,
    getRecentResults,
    getUpNextMatches,
    getFollowedTeamStatus,
    exportMatchesToCSV
  };
})();

// Attach to window object
window.LiveSync = LiveSync;
