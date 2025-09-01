const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Tentukan status AFK untuk bot di voice channel"),

  async execute(interaction) {
    const member = interaction.member;
    const vc = member.voice.channel;

    if (!vc) {
      return interaction.reply({
        content: "❌ Kamu harus berada di voice channel untuk menggunakan perintah ini.",
        ephemeral: true,
      });
    }

    // Join voice channel
    try {
      const connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true,
      });

      const startTime = Date.now();
      let afkMinutes = 0;

      const embed = new EmbedBuilder()
        .setTitle("😴 Mode AFK Aktif")
        .setDescription(
          `Bot sekarang standby di voice channel: **${vc.name}**\n\n` +
          `🕒 Durasi AFK: \`0 menit\`\n` +
          `🔴 Tekan tombol di bawah untuk *disconnect*.`
        )
        .setColor(0x3498db)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({
          text: `Eastcostra AFK • Voice AFK`,
          iconURL: interaction.client.user.displayAvatarURL(),
        });

      const disconnectButton = new ButtonBuilder()
        .setCustomId("afk_disconnect")
        .setLabel("Disconnect")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(disconnectButton);

const replyMessage = await interaction.followUp({
  embeds: [embed],
  components: [row],
});
const reply = await interaction.fetchReply(); // Ambil Message untuk edit nanti

// Interval untuk update waktu AFK
const interval = setInterval(async () => {
  afkMinutes = Math.floor((Date.now() - startTime) / 60000);
  embed.setDescription(
    `Bot sekarang standby di voice channel: **${vc.name}**\n\n` +
    `🕒 Durasi AFK: \`${afkMinutes} menit\`\n` +
    `🔴 Tekan tombol di bawah untuk *disconnect*.`
  );
  try {
    await reply.edit({ embeds: [embed] });
  } catch (err) {
    console.warn("Gagal update embed:", err.message);
  }
});

const collector = reply.createMessageComponentCollector({
  filter: (i) =>
    i.customId === "afk_disconnect" &&
    i.user.id === interaction.user.id,
  time: 1000 * 60 * 60, // 1 jam
});

collector.on("collect", async (i) => {
  try {
    const connection = getVoiceConnection(vc.guild.id);
    if (connection) connection.destroy();
    clearInterval(interval);

    await i.update({
      content: "🛑 Bot telah keluar dari voice channel.",
      embeds: [],
      components: [],
    });
  } catch (err) {
    console.error("Gagal mengupdate interaction:", err);
    if (!i.replied && !i.deferred) {
      await i.reply({
        content: "Terjadi kesalahan saat memproses tombol.",
        ephemeral: true,
      });
    }
  }
});

collector.on("end", () => {
  clearInterval(interval);
});


    } catch (err) {
      console.error("❌ Gagal join voice channel:", err);
      return interaction.followUp("⚠️ Gagal masuk ke voice channel kamu.");
    }
  },
};
