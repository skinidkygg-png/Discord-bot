const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const fs = require("fs");
const { loadLevelsData, saveLevelsData, getRequiredXP, generateProgressBar, levelRoles } = require("./levels/levelsUtils");

// Initialize levelsData
let levelsData = loadLevelsData();

// Fungsi untuk mendapatkan data level user
function getUserData(userId, guildId) {
  if (!levelsData[guildId]) levelsData[guildId] = {}; // Jika data guild belum ada, buat baru
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

// Fungsi untuk menambah XP
function addXP(userId, guildId, xp) {
  const userData = getUserData(userId, guildId);
  userData.xp += xp;
  userData.messages += 1;

  // Hitung level berdasarkan XP
  const nextLevelXP = (userData.level + 1) * 100;
  if (userData.xp >= nextLevelXP) {
    userData.level += 1;
    userData.xp = 0; // Reset XP saat naik level
  }

  // Simpan data
  fs.writeFileSync("./utils/levels/levels.json", JSON.stringify(levelsData, null, 2));
}

// Command untuk melihat level
module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Lihat level dan statistikmu"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const userData = getUserData(userId, guildId);

    // Embed pertama untuk menunjukkan level dan foto profil
    const embedLevel = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`${interaction.user.username}'s Level`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: "Level",
          value: `${userData.level}`,
          inline: true,
        },
        {
          name: "XP",
          value: `${userData.xp} / ${(userData.level + 1) * 100}`,
          inline: true,
        }
      )
      .setFooter({
        text: "Sistem Leveling Eastcostra",
      });

    // Membuat tombol untuk menampilkan stats lengkap
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("levelStats")
        .setLabel("Lihat Statistik Lengkap")
        .setStyle("Primary")
    );

    // Mengirimkan embed dan tombol
    await interaction.reply({
      embeds: [embedLevel],
      components: [buttonRow],
    });

    // Menunggu interaksi tombol untuk menampilkan stats lengkap
    const filter = (i) => i.customId === "levelStats" && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000, // Tombol akan tersedia selama 1 menit
    });

    collector.on("collect", async (i) => {
      if (i.customId === "levelStats") {
        // Embed kedua untuk statistik lengkap
        const embedStats = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`${interaction.user.username}'s Complete Stats`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            {
              name: "Level",
              value: `${userData.level}`,
              inline: true,
            },
            {
              name: "XP",
              value: `${userData.xp} / ${(userData.level + 1) * 100}`,
              inline: true,
            },
            {
              name: "Pesan Terkirim",
              value: `${userData.messages}`,
              inline: true,
            },
            {
              name: "Waktu di Voice",
              value: `${userData.voiceTime} detik`,
              inline: true,
            }
          )
          .setFooter({
            text: "Sistem Leveling Eastcostra",
          });

        await i.update({
          embeds: [embedStats],
          components: [], // Menghapus tombol setelah dilihat
        });
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        interaction.followUp({
          content: "Waktu untuk melihat statistik telah habis.",
          ephemeral: true, // Ephemeral flag
        });
      }
    });
  },
};

// Fungsi untuk memproses XP dari pesan yang dikirim
module.exports.onMessage = async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const guildId = message.guild.id;
  const member = message.member;
  const levelsData = loadLevelsData();

  if (!levelsData[guildId]) levelsData[guildId] = {};
  if (!levelsData[guildId][userId]) {
    levelsData[guildId][userId] = {
      xp: 0,
      level: 1,
      messages: 0,
      voiceTime: 0
    };
  }

  const xpGain = Math.floor((Math.floor(Math.random() * 10) + 15) * 0.1); // Reduced by 90%
  levelsData[guildId][userId].xp += xpGain;
  levelsData[guildId][userId].messages += 1;

  let currentLevel = levelsData[guildId][userId].level;
  let currentXP = levelsData[guildId][userId].xp;
  let leveledUp = false;

  while (currentXP >= getRequiredXP(currentLevel)) {
    currentXP -= getRequiredXP(currentLevel);
    currentLevel++;
    levelsData[guildId][userId].level = currentLevel;
    levelsData[guildId][userId].xp = currentXP;
    leveledUp = true;
  }

  saveLevelsData(levelsData);

  if (leveledUp) {
    const nextXP = getRequiredXP(currentLevel);
    const progressBar = generateProgressBar(currentXP, nextXP, 20);
    
    // Remove previous level role and add new one
    for (let i = 1; i <= 10; i++) {
      const roleId = levelRoles[i];
      if (roleId) {
        const role = message.guild.roles.cache.get(roleId);
        if (role) {
          try {
            if (i === currentLevel) {
              await member.roles.add(role);
              console.log(`Added role ${role.name} to ${message.author.username}`);
            } else {
              await member.roles.remove(role);
            }
          } catch (error) {
            console.error(`Role operation failed for ${role.name}: ${error}`);
          }
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 LEVEL ${currentLevel} DICAPAI!`)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setDescription(`✨ ${message.author} telah naik ke level **${currentLevel}**! ✨\n\n📈 **XP:** \`${currentXP} / ${nextXP}\`\n${progressBar}`)
      .addFields(
        { name: '🎁 Role Baru', value: roleId ? `<@&${roleId}>` : 'Belum ada role untuk level ini', inline: false },
        { name: '💰 Hadiah Tambahan', value: `+${currentLevel * 100} koin\n+1 🎖️ Badge`, inline: false }
      )
      .setImage('https://cdn.discordapp.com/attachments/1370986803821154385/1371986060841848952/original-1ac433bb5a490fc8d3a387d4c88aa011.gif')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: 'єαѕт¢σѕтяα',
        iconURL: 'https://cdn.discordapp.com/attachments/1370986803821154385/1371991939200716810/Screenshot_2023-12-18-00-33-19-46_40deb401b9ffe8e1df2f1cc5ba480b12-ai-brush-removebg-c58oi7vp.jpg'
      })
      .setTimestamp();

    const levelChannel = message.guild.channels.cache.get('1141760622799880284');
    if (levelChannel) levelChannel.send({ embeds: [embed] });
  }
};

// Fungsi untuk menambahkan waktu voice chat
module.exports.onVoiceStateUpdate = (oldState, newState) => {
  if (oldState.channelId === newState.channelId) return; // Jika channel tidak berubah

  const userId = newState.id;
  const guildId = newState.guild.id;

  const userData = getUserData(userId, guildId);
  if (newState.channelId) {
    userData.voiceTime = userData.voiceTime || 0;
    userData.voiceTime += 60; // Tambahkan 60 detik jika user join voice channel
  }

  // Simpan data ke file
  fs.writeFileSync("./utils/levels/levels.json", JSON.stringify(levelsData, null, 2));
};