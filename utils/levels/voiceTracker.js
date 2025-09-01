
const { loadLevelsData, saveLevelsData, getRequiredXP } = require("./levelsUtils");

class VoiceTracker {
  constructor() {
    this.userVoiceStart = new Map();
    this.voiceStates = new Map();
    this.userGuilds = new Map();
    this.intervalId = null;
  }

  trackVoiceJoin(userId, guildId) {
    const now = Date.now();
    this.userVoiceStart.set(`${userId}-${guildId}`, now);
    this.voiceStates.set(userId, now);
    this.userGuilds.set(userId, guildId);
  }

  trackVoiceLeave(userId, guildId) {
    const key = `${userId}-${guildId}`;
    const joinTime = this.userVoiceStart.get(key);
    if (joinTime) {
      const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
      this.updateUserVoiceTime(userId, guildId, durationSeconds);
      this.userVoiceStart.delete(key);
      this.voiceStates.delete(userId);
      this.userGuilds.delete(userId);
    }
  }

  updateUserVoiceTime(userId, guildId, duration) {
    const levelsData = loadLevelsData();
    if (!levelsData[guildId]?.[userId]) {
      levelsData[guildId] = {
        ...levelsData[guildId],
        [userId]: { xp: 0, level: 0, messages: 0, voiceTime: 0 }
      };
    }

    levelsData[guildId][userId].voiceTime += duration;
    const xpGained = Math.floor(duration / 60) * 11; // 11 XP per minute (10% increase)
    
    // XP gain without logging
    
    this.addXPToUser(levelsData, userId, guildId, xpGained);
    saveLevelsData(levelsData);
  }

  addXPToUser(levelsData, userId, guildId, xpAmount) {
    const userData = levelsData[guildId][userId];
    userData.xp += xpAmount;

    while (userData.xp >= getRequiredXP(userData.level + 1)) {
      userData.xp -= getRequiredXP(userData.level + 1);
      userData.level += 1;
    }
  }

  startVoiceTrackingInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.intervalId = setInterval(() => {
      try {
        const now = Date.now();
        this.voiceStates.forEach((joinTime, userId) => {
          const guildId = this.userGuilds.get(userId);
          if (guildId) {
            const elapsedTime = Math.floor((now - joinTime) / 1000);
            if (elapsedTime >= 60) {
              this.updateUserVoiceTime(userId, guildId, elapsedTime);
              this.voiceStates.set(userId, now);
            }
          }
        });
      } catch (error) {
        console.error('Error in voice tracking interval:', error);
      }
    }, 60000);

    // Silent start
    return this.intervalId;
  }

  stopVoiceTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const voiceTracker = new VoiceTracker();
module.exports = voiceTracker;
