/**
 * EsportsBracket — Data Store Module (store.js)
 * PRD Section 7, 10: State and localStorage management
 * 
 * Manages all browser localStorage reads, writes, and initial data seeding.
 * Wrapped in try/catch to gracefully handle private-browsing or storage quota limits.
 */

const Store = (function () {
  // Official PRD localStorage Keys
  const KEYS = {
    TOURNAMENTS: 'eb_tournaments',
    SESSION: 'eb_session',
    LAST_UPDATE: 'eb_lastUpdate',
    SEEDED: 'eb_seeded'
  };

  // In-memory fallback if localStorage is blocked by browser privacy settings
  let memoryStorage = {
    [KEYS.TOURNAMENTS]: [],
    [KEYS.SESSION]: { role: 'host', followedTeamId: null },
    [KEYS.LAST_UPDATE]: new Date().toISOString(),
    [KEYS.SEEDED]: false
  };

  let isLocalStorageAvailable = true;

  // Test localStorage availability safely
  try {
    const testKey = '__eb_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } catch (err) {
    isLocalStorageAvailable = false;
    console.warn("Storage blocked or unavailable. Falling back to memory storage.", err);
  }

  /**
   * Safe getter for localStorage items with JSON parsing
   */
  function getItem(key, defaultValue = null) {
    if (!isLocalStorageAvailable) {
      return memoryStorage[key] !== undefined ? memoryStorage[key] : defaultValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return defaultValue;
    }
  }

  /**
   * Safe setter for localStorage items with JSON stringification
   */
  function setItem(key, value) {
    if (!isLocalStorageAvailable) {
      memoryStorage[key] = value;
      return true;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to localStorage`, e);
      return false;
    }
  }

  /**
   * Updates eb_lastUpdate timestamp so other browser tabs know to refresh their view
   */
  function notifyUpdate() {
    const now = new Date().toISOString();
    setItem(KEYS.LAST_UPDATE, now);
    return now;
  }

  /**
   * Returns all stored tournaments
   */
  function getTournaments() {
    return getItem(KEYS.TOURNAMENTS, []);
  }

  /**
   * Returns a single tournament by its ID
   */
  function getTournamentById(id) {
    const list = getTournaments();
    return list.find(t => t.id === id) || null;
  }

  /**
   * Saves or updates an array of tournaments and bumps lastUpdate timestamp
   */
  function saveTournaments(tournaments) {
    const success = setItem(KEYS.TOURNAMENTS, tournaments);
    if (success) {
      notifyUpdate();
    }
    return success;
  }

  /**
   * Saves or updates a single tournament inside the tournaments list
   */
  function saveTournament(tournament) {
    const list = getTournaments();
    const index = list.findIndex(t => t.id === tournament.id);
    if (index >= 0) {
      list[index] = tournament;
    } else {
      list.push(tournament);
    }
    return saveTournaments(list);
  }

  /**
   * Deletes a tournament by its ID
   */
  function deleteTournament(id) {
    const list = getTournaments();
    const filtered = list.filter(t => t.id !== id);
    return saveTournaments(filtered);
  }

  /**
   * Retrieves the current user session (role and followed team)
   */
  function getSession() {
    return getItem(KEYS.SESSION, { role: 'host', followedTeamId: null });
  }

  /**
   * Updates the user's role ('host' or 'viewer')
   */
  function setRole(role) {
    const session = getSession();
    session.role = role === 'viewer' ? 'viewer' : 'host';
    setItem(KEYS.SESSION, session);
    notifyUpdate();
    return session.role;
  }

  /**
   * Updates the team currently followed by the user
   */
  function setFollowedTeam(teamId) {
    const session = getSession();
    session.followedTeamId = teamId || null;
    setItem(KEYS.SESSION, session);
    notifyUpdate();
    return session.followedTeamId;
  }

  /**
   * Gets the last update ISO timestamp
   */
  function getLastUpdate() {
    return getItem(KEYS.LAST_UPDATE, null);
  }

  /**
   * Checks if initial sample data has been seeded
   */
  function isSeeded() {
    return getItem(KEYS.SEEDED, false) === true;
  }

  /**
   * Seeds default sample data (from sample-data.json or fallback object)
   */
  async function initSeedData(force = false) {
    if (isSeeded() && !force) {
      return false; // Already seeded
    }

    try {
      const response = await fetch('assets/data/sample-data.json');
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.tournaments)) {
          setItem(KEYS.TOURNAMENTS, data.tournaments);
          setItem(KEYS.SEEDED, true);
          notifyUpdate();
          return true;
        }
      }
    } catch (fetchErr) {
      console.warn("Could not fetch sample-data.json (likely file:// protocol), using built-in seed.", fetchErr);
    }

    // Built-in fallback seed to guarantee functionality even on direct file:// launch
    const fallbackTournaments = [
      {
        id: "t_cc26",
        name: "CampusClash 2026",
        game: "5v5 Tactical Shooter",
        date: "2026-11-08",
        status: "Live",
        bestOf: { default: 1, final: 3 },
        bracketSize: 16,
        championId: null,
        teams: [
          { id: "tm1", name: "Team Nova", seed: 1 },
          { id: "tm2", name: "Byte Wolves", seed: 2 },
          { id: "tm3", name: "Pixel Raiders", seed: 3 },
          { id: "tm4", name: "CyberKnights", seed: 4 },
          { id: "tm5", name: "Viper Squad", seed: 5 },
          { id: "tm6", name: "Phantom Clan", seed: 6 },
          { id: "tm7", name: "Nexus Force", seed: 7 },
          { id: "tm8", name: "Titan Gaming", seed: 8 },
          { id: "tm9", name: "Solaris", seed: 9 },
          { id: "tm10", name: "Apex Legends", seed: 10 },
          { id: "tm11", name: "Iron Claws", seed: 11 },
          { id: "tm12", name: "Shadow Storm", seed: 12 }
        ],
        matches: [
          {
            id: "R1-M1", round: 1, slot: 1, teamA: "tm1", teamB: null, scoreA: 0, scoreB: 0,
            status: "Done", winnerId: "tm1", nextMatchId: "R2-M1", nextSlot: "A", isBye: true
          },
          {
            id: "R1-M2", round: 1, slot: 2, teamA: "tm8", teamB: "tm9", scoreA: 13, scoreB: 11,
            status: "Done", winnerId: "tm8", nextMatchId: "R2-M1", nextSlot: "B", isBye: false
          },
          {
            id: "R1-M3", round: 1, slot: 3, teamA: "tm5", teamB: "tm12", scoreA: 8, scoreB: 7,
            status: "Live", winnerId: null, nextMatchId: "R2-M2", nextSlot: "A", isBye: false
          },
          {
            id: "R1-M4", round: 1, slot: 4, teamA: "tm4", teamB: null, scoreA: 0, scoreB: 0,
            status: "Done", winnerId: "tm4", nextMatchId: "R2-M2", nextSlot: "B", isBye: true
          }
        ]
      },
      {
        id: "t_ws25",
        name: "Winter Showdown 2025",
        game: "Rocket Arena",
        date: "2025-12-15",
        status: "Completed",
        bestOf: { default: 1, final: 3 },
        bracketSize: 8,
        championId: "tm_w1",
        teams: [
          { id: "tm_w1", name: "Apex Predators", seed: 1 },
          { id: "tm_w2", name: "Blaze Strikers", seed: 2 },
          { id: "tm_w3", name: "Glacier Gaming", seed: 3 },
          { id: "tm_w4", name: "Thunder Bolts", seed: 4 }
        ],
        matches: [
          {
            id: "R1-M1", round: 1, slot: 1, teamA: "tm_w1", teamB: "tm_w4", scoreA: 3, scoreB: 0,
            status: "Done", winnerId: "tm_w1", nextMatchId: "R2-M1", nextSlot: "A", isBye: false
          }
        ]
      }
    ];

    setItem(KEYS.TOURNAMENTS, fallbackTournaments);
    setItem(KEYS.SEEDED, true);
    notifyUpdate();
    return true;
  }

  // Public API
  return {
    isAvailable: () => isLocalStorageAvailable,
    getTournaments,
    getTournamentById,
    saveTournaments,
    saveTournament,
    deleteTournament,
    getSession,
    setRole,
    setFollowedTeam,
    getLastUpdate,
    initSeedData,
    isSeeded
  };
})();

// Attach to global window object
window.Store = Store;
