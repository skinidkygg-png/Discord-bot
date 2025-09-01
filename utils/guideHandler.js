const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// ID Role Admin Penerima DM
const ADMIN_ROLE_ID = '1141778117325758645';

// Fungsi Membuat Slide
function getSlides(userId) {
  return [
    new EmbedBuilder()
      .setColor('#1abc9c')
      .setTitle('🌊 Selamat Datang di Eastcostra!')
      .setThumbnail('https://cdn.discordapp.com/attachments/1226128644162715688/1226128737683247134/Screenshot_2023-12-18-00-33-19-46_40deb401b9ffe8e1df2f1cc5ba480b12-removebg_1.jpg')
      .setImage('https://cdn.discordapp.com/attachments/1370986803821154385/1376891671886827521/gBnyPN_-Ysi03-MOuE9TAfTzwxCtTRwBom1e8Jv1RXinb6RcrSGm3jqHjI7S5d6kYLlW8LB3D8ZnopQ1210kajbGfC-84m9_zr9U6Hs7uEwBZoMte8qgdkIXxNSlDyD7VQw1280.png')
      .setDescription(`
👋 **Hallo, <@${userId}>!**
Selamat datang di panduan resmi **Eastcostra Squad**.

🚧 *Kami menerapkan sistem Trial selama 3 Hari*  
🎖 Setelah masa trial selesai, kamu akan menerima **Logo Resmi** dari Eastcostra.
`),

    new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('📜 Peraturan Eastcostra')
      .setDescription(`
🚫 **Dilarang:**
- Memiliki lebih dari 2 SQ
- Membuat drama / konflik
- Membawa masalah pribadi
- Membuat circle tertutup
- Adu domba / gaduh

✅ **Wajib:**
- Saling menghormati
- Ikut event resmi
- Menjaga nama baik komunitas
`),

    new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('📌 Apa Itu Gen di Eastcostra?')
      .setDescription(`
🟡 **Gen 1** – Usia 12+
🟣 **Gen 2** – Usia 17+

Sistem ini untuk menjaga kenyamanan & keamanan semua usia.
`),

    new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('🎉 Panduan Selesai!')
      .setDescription(`
🎊 Kamu telah menyelesaikan panduan!

Klik tombol **Ambil Logo** di bawah ini untuk menghubungi admin dan dapatkan logomu.
`)
  ];
}

// Command export
module.exports = {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('📚 Tampilkan panduan trial Eastcostra'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const slides = getSlides(userId);
    const index = 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guide_next_${index + 1}_${userId}`)
        .setLabel('➡️ Lanjut')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [slides[index]],
      components: [row],
      flags: 64 // Use flags instead of ephemeral
    });
  },

  async handleGuideInteraction(interaction) {
    try {
      const [, indexStr, userId] = interaction.customId.split('_');
      const index = parseInt(indexStr, 10);
      const slides = getSlides(userId);
      const nextIndex = index + 1;

      const components = [];

      if (nextIndex < slides.length - 1) {
        components.push(
          new ButtonBuilder()
            .setCustomId(`guide_next_${nextIndex + 1}_${userId}`)
            .setLabel('➡️ Lanjut')
            .setStyle(ButtonStyle.Primary)
        );
      } else if (nextIndex === slides.length - 1) {
        components.push(
          new ButtonBuilder()
            .setCustomId(`guide_finish_${userId}`)
            .setLabel('📩 Ambil Logo')
            .setStyle(ButtonStyle.Success)
        );
      }

      const row = new ActionRowBuilder().addComponents(components);

      await interaction.update({
        embeds: [slides[nextIndex]],
        components: components.length > 0 ? [row] : []
      });
    } catch (err) {
      console.error('Error handling guide interaction:', err);
      // Check if error is due to expired interaction
      if (err.code === 10062 || err.code === 40060) {
        console.log("Guide interaction expired, cannot respond");
        return;
      }
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.followUp({
            content: '❌ Terjadi kesalahan saat memperbarui panduan.',
            flags: 64 // Use flags instead of ephemeral
          });
        } catch (replyError) {
          console.error('Failed to send error response:', replyError);
        }
      }
    }
  },

  async handleFinishRequest(interaction) {
    const userId = interaction.user.id;
    const guild = interaction.guild;

    try {
      const adminRole = guild.roles.cache.get(ADMIN_ROLE_ID);
      const adminMembers = adminRole.members;

      const dmMessage = `👋 <@${userId}> telah menyelesaikan panduan dan meminta logo.`;

      for (const [, member] of adminMembers) {
        try {
          await member.send(dmMessage);
        } catch (e) {
          console.warn(`Gagal mengirim DM ke ${member.user.tag}`);
        }
      }

      await interaction.followUp({
        content: '✅ Permintaan kamu telah dikirim ke admin. Silakan tunggu konfirmasi.',
        flags: 64 // Use flags instead of ephemeral
      });
    } catch (err) {
      console.error('Gagal mengirim notifikasi ke admin:', err);
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.followUp({
            content: '❌ Terjadi kesalahan saat menghubungi admin.',
            flags: 64 // Use flags instead of ephemeral
          });
        } catch (replyError) {
          console.error('Failed to send error response:', replyError);
        }
      }
    }
  }
};
