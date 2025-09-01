// ✅ ENV dan Library
require("dotenv").config();
const axios = require("axios");
const { loadLevelsData, saveLevelsData } = require("./utils/levels/levelsUtils");

const voiceTracker = require("./utils/levels/voiceTracker");
voiceTracker.startVoiceTrackingInterval();
const fs = require("fs");
const express = require("express");
const {
  Client,
  IntentsBitField,
  ActivityType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");

// 📁 Konfigurasi Welcome Channel
const welcomeDataPath = "./welcomeConfig.json";
let welcomeConfig = {};

// Fungsi untuk membaca konfigurasi welcome channel
const loadWelcomeConfig = () => {
  if (fs.existsSync(welcomeDataPath)) {
    welcomeConfig = JSON.parse(fs.readFileSync(welcomeDataPath, "utf8"));
  } else {
    fs.writeFileSync(welcomeDataPath, JSON.stringify({}, null, 2));
  }
};

// 🚨 Keep Alive Web Server (UptimeRobot)
const startWebServer = () => {
  const app = express();
  app.get("/", (req, res) => res.send("✅ Bot is alive!"));

  const server = app.listen(3000, '0.0.0.0', () => console.log("🌐 Web server aktif di port 3000"));

  server.on('error', (error) => {
    console.error('Web server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.log('Port is busy, retrying in 5 seconds...');
      setTimeout(() => {
        server.close();
        server.listen(3000, '0.0.0.0');
      }, 5000);
    }
  });
};

// 🔄 Pengaturan Bot Discord dan Client
const setupDiscordBot = () => {
  const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildPresences,
      IntentsBitField.Flags.GuildVoiceStates,
    ],
    // Optimize client options
    failIfNotExists: false,
    retryLimit: 3,
    presence: {
      activities: [{
        name: '🌟 Starting up...',
        type: ActivityType.Playing
      }]
    }
  });

  // 🧠 Handler Commands
  const commandHandler = require("./handlers/commandHandler");
  commandHandler(client);  // Memastikan command handler bekerja

  client.once("ready", async () => {
    try {
      await updatePresence(client);
      setInterval(async () => {
        try {
          await updatePresence(client);
        } catch (error) {
          console.error('Error updating presence:', error);
        }
      }, 300000); // Update setiap 5 menit
    } catch (error) {
      console.error('Error in ready event:', error);
    }

    // 🔄 Tambah semua user ke levels.json jika belum tercatat
    const levelsData = loadLevelsData();
    client.guilds.cache.forEach(guild => {
      guild.members.fetch().then(members => {
        members.forEach(member => {
          if (member.user.bot) return;
          if (!levelsData[member.id]) {
            levelsData[member.id] = {
              xp: 0,
              level: 0,
              messages: 0,
              voiceTime: 0
            };
          }
        });
        saveLevelsData(levelsData);
      });
    });
  });

  // Event ketika ada member baru join
  client.on("guildMemberAdd", (member) => {
    if (member.user.bot) return;

    const levelsData = loadLevelsData();
    const guildId = member.guild.id;

    if (!levelsData[guildId]) {
      levelsData[guildId] = {};
    }

    if (!levelsData[guildId][member.id]) {
      levelsData[guildId][member.id] = {
        xp: 0,
        level: 0,
        messages: 0,
        voiceTime: 0
      };
      saveLevelsData(levelsData);
    }
  });

  // 📶 Voice event listener untuk voiceTime leveling
  client.on("voiceStateUpdate", (oldState, newState) => {
    const userId = newState.id || oldState.id;
    const guildId = (newState.guild || oldState.guild).id;

    // Join VC
    if (!oldState.channelId && newState.channelId) {
      voiceTracker.trackVoiceJoin(userId, guildId);
    }

    // Leave VC
    if (oldState.channelId && !newState.channelId) {
      voiceTracker.trackVoiceLeave(userId, guildId);
    }

    // Pindah VC
    else if (oldState.channelId !== newState.channelId) {
      voiceTracker.trackVoiceLeave(userId, guildId);
      voiceTracker.trackVoiceJoin(userId, guildId);
    }
  });

  welcomeMessage(client);
  setupEventHandlers(client);

  // Initialize MCL scheduling
  const { scheduleAnnouncement } = require('./commands/mcl/mcl.js');

  scheduleAnnouncement(client);

  const { handleMCLInteraction } = require('./utils/mclHandler');
  const { handleGuideInteraction } = require('./utils/guideHandler');

client.on("interactionCreate", async (interaction) => {
    try {
      // Critical validation: Check if already handled FIRST
      if (interaction.replied || interaction.deferred) {
        console.log("Interaction already acknowledged, skipping...");
        return;
      }

      // Check if interaction is too old (expired)
      const interactionAge = Date.now() - interaction.createdTimestamp;
      if (interactionAge > 2500) {
        console.log("Interaction too old, skipping...");
        return;
      }

      // Handle Guide interactions
      if (interaction.isButton() && interaction.customId.startsWith('guide_')) {
        try {
          if (interaction.customId.startsWith('guide_finish_')) {
            await handleGuideInteraction.handleFinishRequest(interaction);
          } else {
            await handleGuideInteraction.handleGuideInteraction(interaction);
          }
          return;
        } catch (error) {
          console.error('Error handling guide interaction:', error);
          if (error.code === 10062 || error.code === 40060) {
            console.log("Interaction expired during guide processing");
            return;
          }
          if (!interaction.replied && !interaction.deferred) {
            try {
              await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses panduan.',
                flags: 64
              });
            } catch (replyError) {
              console.error('Failed to send error response:', replyError);
            }
          }
          return;
        }
      }

      // Handle MCL interactions
      if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
        if (['create_team', 'join_team', 'modal_create_team', 'select_team'].includes(interaction.customId)) {
          try {
            await handleMCLInteraction(interaction);
            return;
          } catch (error) {
            console.error('Error handling MCL interaction:', error);
            if (error.code === 10062 || error.code === 40060) {
              console.log("Interaction expired during MCL processing");
              return;
            }
            if (!interaction.replied && !interaction.deferred) {
              try {
                await interaction.followUp({ 
                  content: '❌ Terjadi kesalahan saat memproses interaksi MCL.', 
                  flags: 64 
                });
              } catch (replyError) {
                console.error('Failed to send error response:', replyError);
              }
            }
            return;
          }
        }
      }
    } catch (error) {
      console.error('Unhandled error in interaction handler:', error);
    }
  });

  // Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

const login = async () => {
    try {
      await client.login(process.env.DISCORD_TOKEN);
      console.log('✅ Bot berhasil login');
    } catch (error) {
      console.error('❌ Failed to login:', error);
      // Attempt to reconnect after 5 seconds
      setTimeout(login, 5000);
    }
  };

  client.on('disconnect', () => {
    console.log('🔄 Bot terputus, mencoba reconnect...');
    login();
  });

  client.on('error', error => {
    console.error('❌ Discord client error:', error);
    // Attempt to reconnect on critical errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      console.log('🔄 Mencoba reconnect...');
      login();
    }
  });

  login();
};

// 👥 Update Presence
const updatePresence = async (client) => {
  const guild = client.guilds.cache.get("947817894635520011");
  if (!guild) return;

  await guild.members.fetch();
  const onlineCount = guild.members.cache.filter(
    (m) => !m.user.bot && m.presence?.status && m.presence.status !== "offline",
  ).size;
  client.user.setActivity(`🌐 ${guild.name} | Online: ${onlineCount}`, {
    type: ActivityType.Watching,
  });
  console.log(`📺 Presence updated: ${guild.name} | Online: ${onlineCount}`);
};

// 🚪 Welcome Message Event
const welcomeMessage = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const channelId = welcomeConfig[member.guild.id];
    if (!channelId) return;

    const welcomeChannel = member.guild.channels.cache.get(channelId);
    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(
        `Welcome <@${member.id}> AKA **${member.user.username}**\n\n` +
          `**Guidline**\n` +
          `• <#1141765922869223654> | rules\n` +
          `• <#948576072193167421> | gallery\n` +
          `• <#1141779440653844500> | announcement\n\n` +
          `Selamat Datang,\nSemoga Betah Yaa. Dan Jangan Lupa Untuk Cek Website Kami\n` +
          `https://sites.google.com/view/eastcostraz`,
      )
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .setImage("https://cdn.discordapp.com/attachments/1168314030901952584/1365245144584028191/ray_2-1-1-1-1.gif")
      .setFooter({
        text: "east𝒸ostra",
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      });

    welcomeChannel.send({
      content: `**NEW MEMBER**\nAda member baru di sapa ya 🌼\n@everyone`,
      embeds: [embed],
    });
  });
};

// 💬 Setup Event Handlers (termasuk !testwelcome)
const setupEventHandlers = (client) => {
  // Optimize message handling with debouncing
  const messageResponses = new Map();
  const DEBOUNCE_TIMEOUT = 2000; // 2 seconds

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    // Safe message deletion
    const safeDelete = async (msg) => {
      try {
        if (msg.deletable) {
          await msg.delete();
        }
      } catch (error) {
        if (error.code !== 10008) { // Ignore unknown message errors
          console.error('Error deleting message:', error);
        }
      }
    };

    // Add safeDelete to message object for use elsewhere
    message.safeDelete = () => safeDelete(message);

    const content = message.content.toLowerCase();
    const userId = message.author.id;

    // Prevent spam with debouncing
    if (messageResponses.has(userId)) {
      const lastResponse = messageResponses.get(userId);
      if (Date.now() - lastResponse < DEBOUNCE_TIMEOUT) return;
    }

    if (["hi", "hallo", "halo"].includes(content)) {
      messageResponses.set(userId, Date.now());
      message.reply("👋 Hallo! Kalau butuh bantuan, gunakan perintah `/help`");
    }

    if (content === "!guide") {
      const { getSlides } = require('./commands/guide.js');
      const slides = getSlides(message.author.id);
      const { handleGuideInteraction } = require('./utils/guideHandler');

      // Create navigation buttons using the helper function from guideHandler
      const getNavigationButtons = (currentPage, totalPages, userId) => {
        const row = new ActionRowBuilder();
        if (currentPage < totalPages - 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`guide_next_${currentPage}_${userId}`)
              .setLabel('➡️ Lanjut')
              .setStyle(ButtonStyle.Primary)
          );
        }
        return row;
      };

      await message.channel.send({
        embeds: [slides[0]],
        components: [getNavigationButtons(0, slides.length, message.author.id)]
      });
    }

    if (content === "!testwelcome") {
      const channelId = welcomeConfig[message.guild.id];
      if (!channelId)
        return message.reply("❌ Welcome channel belum dikonfigurasi.");

      const channel = message.guild.channels.cache.get(channelId);
      if (!channel) return message.reply("❌ Channel tidak ditemukan.");

      const member = message.member;

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          `Welcome <@${member.id}> AKA **${member.user.username}**\n\n` +
            `**Guidline**\n` +
            `• <#1141765922869223654> | rules\n` +
            `• <#948576072193167421> | gallery\n` +
            `• <#1141779440653844500> | announcement\n\n` +
            `Selamat Datang,\nSemoga Betah Yaa. Dan Jangan Lupa Untuk Cek Website Kami\n` +
            `https://sites.google.com/view/eastcostraz`,
        )
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: "east𝒸ostra",
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        });

      await channel.send({
        content: `**NEW MEMBER**\nAda member baru di sapa ya 🌼\n@everyone`,
        embeds: [embed],
      });

      message.reply("✅ Pesan welcome berhasil diuji!");
    }
  });
};

function saveTeam(teamData) {
  const dbPath = './commands/schedule/teamDB.json';
  let db = { teams: [] };

  if (fs.existsSync(dbPath)) {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  db.teams.push({
    ...teamData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function getTeams() {
  const dbPath = './commands/schedule/teamDB.json';
  if (!fs.existsSync(dbPath)) {
    return [];
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  return db.teams;
}

// 🔰 Inisialisasi Bot
const initializeBot = () => {
  loadWelcomeConfig();
  startWebServer();
  setupDiscordBot();
};

initializeBot();