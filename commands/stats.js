const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Tampilkan statistik server"),
  async execute(interaction) {
    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const onlineMembers = members.filter(m => m.presence?.status !== "offline").size;
    const totalMembers = members.size;
    const bots = members.filter(m => m.user.bot).size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const roles = guild.roles.cache.size;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📊 Eastcostra Server Stats")
      .setDescription(`📡 Statistik terkini dari **${guild.name}**`)
      .addFields(
        { name: "👥 Total Member", value: `${totalMembers}`, inline: true },
        { name: "🟢 Online", value: `${onlineMembers}`, inline: true },
        { name: "🤖 Bot", value: `${bots}`, inline: true },
        { name: "📝 Text Channels", value: `${textChannels}`, inline: true },
        { name: "🎤 Voice Channels", value: `${voiceChannels}`, inline: true },
        { name: "🎭 Roles", value: `${roles}`, inline: true }
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp()
      .setImage("https://cdn.discordapp.com/attachments/1370986803821154385/1372495843973795883/TOP_10_WEIRDEST_JAPANESE_ANIMATED_MOVIES_DEWILDESALHAB.gif?ex=682a479c&is=6828f61c&hm=7facc5f68a5dd76d77cd188d4625b4cb78976af460c7b0bd16b2b89ff81ccfd8&");

    const reply = await interaction.reply({ embeds: [embed], withResponse: true });
    return reply;
  },
};
