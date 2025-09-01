const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { loadLevelsData } = require("../../utils/levels/levelsUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Tampilkan leaderboard level server ini."),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    let levelData = loadLevelsData();

    // Get guild specific data
    const guildData = levelData[guildId] || {};

    // Convert the data structure for sorting
    const userDataArray = Object.entries(guildData).map(([userId, data]) => ({
      userId,
      ...data
    }));

    // Sort by level and XP
    const sorted = userDataArray.sort((a, b) => 
      b.level - a.level || b.xp - a.xp
    );

    const totalPages = Math.ceil(sorted.length / 5);
    let currentPage = 0;

    const generateEmbed = async (page) => {
      const start = page * 5;
      const pageData = sorted.slice(start, start + 5);
      const description = await Promise.all(
        pageData.map(async (user, index) => {
          const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
          const tag = member ? member.user.tag : `User ID ${user.userId}`;
          return `**#${start + index + 1}** ${tag}\n🧬 Level: \`${user.level}\` | ✨ XP: \`${user.xp}\` | 🗣️ Voice: \`${formatTime(user.voiceTime)}\``;
        })
      );

      return new EmbedBuilder()
        .setTitle("🏆 Leaderboard Leveling")
        .setDescription(description.join("\n\n") || "Tidak ada data.")
        .setColor(0x2b2d31)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setImage("https://media.discordapp.net/attachments/1370986803821154385/1372128340655345694/Sirena_-_Pixel_Art.gif")
        .setFooter({
          text: `east𝒸ostra • Halaman ${page + 1} dari ${totalPages}`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev_page")
        .setLabel("◀️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next_page")
        .setLabel("▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1),
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("❌")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [await generateEmbed(currentPage)],
      components: [row],
    });

    const message = await interaction.fetchReply(); // ✅ Ambil pesan reply setelahnya


    const collector = message.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "close") {
        collector.stop();
        return i.update({ content: "❌ Leaderboard ditutup.", embeds: [], components: [] });
      }

      if (i.customId === "prev_page") currentPage--;
      if (i.customId === "next_page") currentPage++;

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages - 1),
        new ButtonBuilder()
          .setCustomId("close")
          .setLabel("❌")
          .setStyle(ButtonStyle.Danger)
      );

      await i.update({
        embeds: [await generateEmbed(currentPage)],
        components: [newRow],
      });
    });

    collector.on("end", async () => {
      if (message.editable) {
        message.edit({ components: [] }).catch(() => {});
      }
    });
  },
};

function formatTime(seconds) {
  if (!seconds) return "0j 0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}j ${minutes}m`;
}