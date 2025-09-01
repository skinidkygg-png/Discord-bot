const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,  
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Tampilkan menu bantuan untuk bot"),
  async execute(interaction) {
    const userId = interaction.user.id;
    const botAvatar = interaction.client.user.displayAvatarURL();

    const helpEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("Eastcostra Help Menu <:v_:1363666024603324639>")
      .setDescription(
        `Haiii! <@${userId}>, aku adalah **Eastcostra**\n` +
        `Silahkan pilih menggunakan tombol di bawah untuk bantuan:\n\n` +
        `👋 **Welcome /welcome**\nAtur channel sambutan untuk member baru\n\n` +
        `🛌 **AFK /afk**\nBot masuk voice dan tetap standby di sana\n\n` +
        `❓ **Help /help**\nPanduan dan bantuan penggunaan bot\n\n` +
        `📊 **Stats /stats**\nLihat statistik server & pengguna\n\n` +
        `📈 **Leveling /leaderboard**\nLihat peringkat level member server\n\n` +
        `🎮 **MCL /test mcl**\nPendaftaran tim MCL setiap Sabtu 21:00 WIB\n` +
        `• Buat tim dengan informasi lengkap\n` +
        `• Gabung tim yang tersedia\n` +
        `• Pantau status pendaftaran\n\n` +
        `🔰 **Fitur Otomatis**\n` +
        `• Level up dari chat & voice\n` +
        `• Welcome message untuk member baru\n` +
        `• Pengumuman MCL otomatis\n` +
        `• Status server real-time\n\n` +
        `[🌐 Website](https://sites.google.com/view/eastcostraz) • ` +
        `[💬 Support Server](https://discord.gg/A8S3vpw5t5) • ` +
        `[⬆️ Vote](https://discord.discord.gg/A8S3vpw5t5)`
      )
      .setThumbnail(botAvatar)
      .setImage("https://cdn.discordapp.com/attachments/1226128644162715688/1226128739088339026/standard_1.gif")
      .setFooter({
        text: "eastcostra",
        iconURL: botAvatar,
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("help_close")
        .setLabel("❌ Tutup Bantuan")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [helpEmbed],
      components: [row],
      ephemeral: true
    });

    const reply = await interaction.fetchReply();

    try {
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: i => i.user.id === userId
      });

      collector.on("collect", async (i) => {
        if (i.customId === "help_close") {
          await i.update({
            content: "Menu bantuan ditutup.",
            embeds: [],
            components: []
          }).catch(() => {});
        }
      });

      collector.on("end", async () => {
        if (reply.editable) {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("help_close")
              .setLabel("❌ Tutup Bantuan")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true)
          );

          await reply.edit({
            components: [disabledRow]
          }).catch(() => {});
        }
      });
    } catch (error) {
      console.error("Help command error:", error);
    }
  },
};