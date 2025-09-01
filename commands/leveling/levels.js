const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const {
  loadLevelsData,
  saveLevelsData,
  getRequiredXP,
  generateProgressBar
} = require("../../utils/levels/levelsUtils");
const fs = require('fs');
const path = require('path');


const userVoiceStart = new Map(); // Pindahkan ke global agar bisa dipakai di execute()

function getUserData(userId, guildId) {
  const levelsData = loadLevelsData();
  if (!levelsData[guildId]) levelsData[guildId] = {};
  if (!levelsData[guildId][userId]) {
    levelsData[guildId][userId] = {
      xp: 0,
      level: 0,
      messages: 0,
      voiceTime: 0,
    };
  }
  return levelsData[guildId][userId];
}

function formatTime(seconds) {
  if (!seconds) return "00j 00m 00s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}j ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function addXP(userId, guildId, xp) {
  const levelsData = loadLevelsData();
  if (!levelsData[guildId]) levelsData[guildId] = {};
  if (!levelsData[guildId][userId]) {
    levelsData[guildId][userId] = {
      xp: 0,
      level: 0,
      messages: 0,
      voiceTime: 0,
    };
  }

  levelsData[guildId][userId].xp += xp;
  console.log(`🎯 ${userId} gained ${xp}XP from sending a message`);
  levelsData[guildId][userId].messages += 1;

  const nextLevelXP = (levelsData[guildId][userId].level + 1) * 100;
  if (levelsData[guildId][userId].xp >= nextLevelXP) {
    levelsData[guildId][userId].level += 1;
    levelsData[guildId][userId].xp = 0;
  }

  saveLevelsData(levelsData);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Lihat level dan statistikmu"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const member = await interaction.guild.members.fetch(userId);

    const userData = getUserData(userId, guildId);

    const embedLevel = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`${interaction.user.username}'s Level`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage("https://media.discordapp.net/attachments/1370986803821154385/1371048051426459789/download_2.gif")
      .addFields(
        {
          name: "Level",
          value: `${userData.level}`,
          inline: true,
        },
        {
          name: "XP Progress",
          value: `${userData.xp} / ${getRequiredXP(userData.level + 1)}`,
          inline: true,
        },
        {
          name: "Progress Bar",
          value: generateProgressBar(userData.xp, getRequiredXP(userData.level + 1), 15),
          inline: false,
        },
      )
      .setFooter({
        text: "Sistem Leveling Eastcostra",
      });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("levelStats")
        .setLabel("Lihat Statistik Lengkap")
        .setStyle("Primary"),
    );

    await interaction.reply({
      embeds: [embedLevel],
      components: [buttonRow]
    });

    const reply = await interaction.fetchReply();


    // Delete the message after 5 minutes
    setTimeout(() => {
      if (reply && !reply.deleted) {
        reply.delete().catch(console.error);
      }
    }, 5 * 60 * 1000);

    const filter = (i) =>
      i.customId === "levelStats" && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "levelStats") {
        const isInVoice = member.voice.channel ? true : false;
        let currentVoiceDuration = 0;

        if (isInVoice && userVoiceStart.has(userId)) {
          currentVoiceDuration = Math.floor(
            (Date.now() - userVoiceStart.get(userId)) / 1000
          );
        }

        const totalVoice = userData.voiceTime;

        const embedStats = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`${interaction.user.username}'s Complete Stats`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setImage(
            "https://media.discordapp.net/attachments/1370986803821154385/1370987192041603113/Stats.gif?ex=68217ed2&is=68202d52&hm=b2bea0ea910d738e3b9eb4bc86738c84fdc8abb19f0ae014b9ed309e0eb6a6e7&="
          )
          .addFields(
            {
              name: "Level",
              value: `${userData.level}`,
              inline: true,
            },
            {
              name: "XP Progress",
              value: `${userData.xp} / ${getRequiredXP(userData.level + 1)}`,
              inline: true,
            },
            {
              name: "Progress Bar",
              value: generateProgressBar(userData.xp, getRequiredXP(userData.level + 1), 15),
              inline: false,
            },
            {
              name: "Pesan Terkirim",
              value: `${userData.messages}`,
              inline: true,
            },
            {
              name: "🗣️ Waktu di Voice (Total)",
              value: formatTime(userData.voiceTime),
              inline: true,
            },
            {
              name: "🟢 Sedang di Voice?", 
              value: member.voice.channel
                ? `Ya (${formatTime(Math.floor((Date.now() - (userVoiceStart.get(userId) || Date.now())) / 1000))})`
                : "Tidak",
              inline: true,
            },
          )
          .setFooter({
            text: "Sistem Leveling Eastcostra",
          });

        await i.update({
          embeds: [embedStats],
          components: [],
        });
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reply && !reply.deleted) {
        try {
          const newRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("levelStats")
              .setLabel("Lihat Statistik Lengkap")
              .setStyle("Primary")
              .setDisabled(true)
          );
          await reply.edit({ components: [newRow] }).catch(() => {});
        } catch (error) {
          console.error("Error updating message:", error);
        }
      }
    });
  },

  onMessage(message) {
    if (message.author.bot) return;
    addXP(message.author.id, message.guild.id, 10);
  },

  onVoiceStateUpdate(oldState, newState) {
    const userId = newState.id || oldState.id;
    const guildId = (newState.guild || oldState.guild).id;

    // Join voice channel
    if (!oldState.channelId && newState.channelId) {
      userVoiceStart.set(userId, Date.now());
    }

    // Leave voice channel
    if (oldState.channelId && !newState.channelId) {
      const joinTime = userVoiceStart.get(userId);
      if (joinTime) {
        const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
        const levelsData = loadLevelsData();
        if (!levelsData[guildId]) levelsData[guildId] = {};
        if (!levelsData[guildId][userId]) {
          levelsData[guildId][userId] = {
            xp: 0,
            level: 0,
            messages: 0,
            voiceTime: 0,
          };
        }
        levelsData[guildId][userId].voiceTime += durationSeconds;
        saveLevelsData(levelsData);
        userVoiceStart.delete(userId);
      }
    }

    // Switch voice channels
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const joinTime = userVoiceStart.get(userId);
      if (joinTime) {
        const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
        const levelsData = loadLevelsData();
        if (!levelsData[guildId]?.[userId]) {
          levelsData[guildId] = {
            ...levelsData[guildId],
            [userId]: {
              xp: 0,
              level: 0,
              messages: 0,
              voiceTime: 0,
            }
          };
        }
        levelsData[guildId][userId].voiceTime += durationSeconds;
        saveLevelsData(levelsData);
      }
      userVoiceStart.set(userId, Date.now());
    }
  },
};
