const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const cron = require("node-cron");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Test MCL announcement system"),

  async execute(interaction) {
    const channelId = "1141760622799880284";
    const channel = interaction.client.channels.cache.get(channelId);

    if (!channel) {
      return interaction.reply({
        content: "❌ Channel MCL tidak ditemukan!",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🏆 MCL Bounty Rush – Mobile Legends")
      .setDescription(
        "🔥 **Ayo bersiap untuk pertarungan terbesar minggu ini!**\n\n" +
          "> ⏰ **Jam:** 21:00 WIB (Sabtu Malam)\n" +
          "> ⚔️ **Mode:** Solo & Squad\n" +
          "> 🎁 **Hadiah:** Skin, Diamond, dan gengsi tak terbatas!\n\n" +
          "Tekan tombol di bawah untuk membuat atau bergabung dengan tim kamu sekarang!",
      )
      .setImage(
        "https://cdn.discordapp.com/attachments/1370986803821154385/1372016519080443945/MCL-Bounty-Rush-Mobile-Legends2.jpg",
      )
      .setFooter({
        text: "© єαѕт¢σѕтяα",
        iconURL:
          "https://cdn.discordapp.com/attachments/1370986803821154385/1371991939200716810/Screenshot_2023-12-18-00-33-19-46_40deb401b9ffe8e1df2f1cc5ba480b12-ai-brush-removebg-c58oi7vp.jpg",
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_team")
        .setLabel("➕ Buat Tim")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("join_team")
        .setLabel("📌 Gabung Tim")
        .setStyle(ButtonStyle.Primary),
    );

    await channel.send({
      content: "@everyone",
      embeds: [embed],
      components: [row],
    });
    await interaction.followUp({
      content: "✅ Pengumuman MCL telah dikirim!",
      ephemeral: true,
    });
  },
};

// Schedule MCL announcement for every Saturday at 21:00 WIB
const scheduleAnnouncement = (client) => {
  const schedule = "0 0 21 * * 6"; // Setiap Sabtu jam 21:00 WIB
  const channelId = "1141760622799880284"; // Channel untuk pengumuman MCL
  cron.schedule(
    schedule,
    async () => {
      const channel = client.channels.cache.get(channelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("🏆 MCL Bounty Rush – Mobile Legends")
        .setDescription(
          "🔥 **Ayo bersiap untuk pertarungan terbesar minggu ini!**\n\n" +
            "> ⏰ **Jam:** 21:00 WIB (Sabtu Malam)\n" +
            "> ⚔️ **Mode:** Solo & Squad\n" +
            "> 🎁 **Hadiah:** Skin, Diamond, dan gengsi tak terbatas!\n\n" +
            "Tekan tombol di bawah untuk membuat atau bergabung dengan tim kamu sekarang!",
        )
        .setImage(
          "https://cdn.discordapp.com/attachments/1370986803821154385/1372016519080443945/MCL-Bounty-Rush-Mobile-Legends2.jpg",
        )
        .setFooter({
          text: "© єαѕт¢σѕтяα",
          iconURL:
            "https://cdn.discordapp.com/attachments/1370986803821154385/1371991939200716810/Screenshot_2023-12-18-00-33-19-46_40deb401b9ffe8e1df2f1cc5ba480b12-ai-brush-removebg-c58oi7vp.jpg",
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_team")
          .setLabel("➕ Buat Tim")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("join_team")
          .setLabel("📌 Gabung Tim")
          .setStyle(ButtonStyle.Primary),
      );

      await channel.send({
        content: "@everyone",
        embeds: [embed],
        components: [row],
      });
    },
    {
      timezone: "Asia/Jakarta",
    },
  );
};

module.exports.scheduleAnnouncement = scheduleAnnouncement;
