const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Setel channel untuk welcome member")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel untuk welcome messages")
        .setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const welcomeDataPath = "./welcomeConfig.json";
    let welcomeConfig = {};

    // Jika file sudah ada, baca data dari file
    if (fs.existsSync(welcomeDataPath)) {
      welcomeConfig = JSON.parse(fs.readFileSync(welcomeDataPath, "utf8"));
    }

    // Simpan channel yang dipilih untuk guild yang sesuai
    welcomeConfig[interaction.guild.id] = channel.id;

    // Menulis ulang file welcomeConfig.json
    fs.writeFileSync(welcomeDataPath, JSON.stringify(welcomeConfig, null, 2));

    return interaction.reply(`✅ Channel ${channel.name} telah diset sebagai channel welcome untuk server ini!`);
  },
};
