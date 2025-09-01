
const fs = require("fs");
const path = require("path");

const levelsFilePath = path.join(__dirname, "levels.json");
const COLLECTOR_TIMEOUT = 60000; // 1 minute

// XP requirements per level
function getRequiredXP(level) {
  const xpTable = {
    1: 3000,
    2: 5000,
    3: 10000,
    4: 15000,
    5: 20000,
    6: 35000,
    7: 45000,
    8: 60000,
    9: 75000,
    10: 100000
  };
  return xpTable[level] || 999999;
}

// Improved data synchronization
function syncUserData(guildId, userId) {
  const levelsData = loadLevelsData();
  if (!levelsData[guildId]) levelsData[guildId] = {};
  if (!levelsData[guildId][userId]) {
    levelsData[guildId][userId] = {
      xp: 0,
      level: 0,
      messages: 0,
      voiceTime: 0,
      lastUpdated: Date.now()
    };
  }
  return levelsData;
}

const levelRoles = {
  1: '1371987300686368768',
  2: '1371987364779397231',
  3: '1371987417258659971',
  4: '1371987455842062406',
  5: '1371987538683629668',
  6: '1371987568798732398',
  7: '1371987608376180837',
  8: '1371987745194381426',
  9: '1371987799678517410',
  10: '1371987838861840475'
};

function generateProgressBar(current, max, length) {
  const progress = Math.min(Math.max(current / max, 0), 1);
  const filled = Math.round(progress * length);
  return '🟨'.repeat(filled) + '⬛'.repeat(length - filled);
}

// Optimized data loading with caching
let cachedData = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

function loadLevelsData() {
  const now = Date.now();
  if (cachedData && (now - lastLoadTime) < CACHE_DURATION) {
    return cachedData;
  }

  try {
    cachedData = JSON.parse(fs.readFileSync(levelsFilePath, "utf8"));
    lastLoadTime = now;
    return cachedData;
  } catch (error) {
    console.error("Error loading levels data:", error);
    return {};
  }
}

// Optimized data saving with debounce
let saveTimeout = null;
function saveLevelsData(data) {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(levelsFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving levels data:", error);
    }
  }, 1000);
}

module.exports = {
  loadLevelsData,
  saveLevelsData,
  getRequiredXP,
  levelRoles,
  generateProgressBar,
  syncUserData,
  COLLECTOR_TIMEOUT
};
