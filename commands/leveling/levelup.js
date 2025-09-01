
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadLevelsData, saveLevelsData, getRequiredXP, generateProgressBar, levelRoles } = require('../../utils/levels/levelsUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelup')
    .setDescription('Admin command to trigger level up message for a user')
    .addUserOption(option => 
      option
        .setName('target')
        .setDescription('The user to level up')
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level to set')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)),

  async execute(interaction) {
    // Check if user has admin role
    // Check if interaction is expired
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 2500) {
      console.log("Levelup interaction too old, skipping...");
      return;
    }

    if (!interaction.member.roles.cache.has('1047310707240218745')) {
      return interaction.reply({ 
        content: '❌ You do not have permission to use this command.',
        flags: 64 // Use flags instead of ephemeral
      });
    }

    const target = interaction.options.getUser('target');
    const newLevel = interaction.options.getInteger('level');
    const guildId = interaction.guild.id;
    const member = await interaction.guild.members.fetch(target.id);

    // Update level data
    const levelsData = loadLevelsData();
    if (!levelsData[guildId]) levelsData[guildId] = {};
    if (!levelsData[guildId][target.id]) {
      levelsData[guildId][target.id] = {
        xp: 0,
        level: 0,
        messages: 0,
        voiceTime: 0
      };
    }

    levelsData[guildId][target.id].level = newLevel;
    levelsData[guildId][target.id].xp = 0;
    saveLevelsData(levelsData);

    // Update roles
    try {
      // First check if bot has permission
      const botMember = await interaction.guild.members.fetchMe();
      if (!botMember.permissions.has('ManageRoles')) {
        return interaction.followUp({
          content: '❌ Bot lacks permission to manage roles. Please grant the "Manage Roles" permission.',
          flags: 64 // Use flags instead of ephemeral
        });
      }

      for (let i = 1; i <= 10; i++) {
        const roleId = levelRoles[i];
        if (roleId) {
          const role = interaction.guild.roles.cache.get(roleId);
          if (role) {
            if (i === newLevel) {
              await member.roles.add(role).catch(() => {});
            } else {
              await member.roles.remove(role).catch(() => {});
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating roles:', error);
      if (!interaction.replied && !interaction.deferred) {
        return interaction.followUp({
          content: '❌ Failed to update roles. Please check bot permissions.',
          flags: 64 // Use flags instead of ephemeral
        });
      }
      return;
    }

    // Send level up message
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 LEVEL ${newLevel} DICAPAI!`)
      .setAuthor({
        name: target.username,
        iconURL: target.displayAvatarURL({ dynamic: true })
      })
      .setDescription(`✨ ${target} telah naik ke level **${newLevel}**! ✨\n\n📈 **XP:** \`0 / ${getRequiredXP(newLevel + 1)}\`\n${generateProgressBar(0, getRequiredXP(newLevel + 1), 20)}`)
      .addFields(
        { name: '🎁 Role Baru', value: levelRoles[newLevel] ? `<@&${levelRoles[newLevel]}>` : 'Belum ada role untuk level ini', inline: false },
        { name: '💰 Hadiah Tambahan', value: `+${newLevel * 100} koin\n+1 🎖️ Badge`, inline: false }
      )
      .setImage('https://cdn.discordapp.com/attachments/1370986803821154385/1371986060841848952/original-1ac433bb5a490fc8d3a387d4c88aa011.gif')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: 'єαѕт¢σѕтяα',
        iconURL: 'https://cdn.discordapp.com/attachments/1370986803821154385/1371991939200716810/Screenshot_2023-12-18-00-33-19-46_40deb401b9ffe8e1df2f1cc5ba480b12-ai-brush-removebg-c58oi7vp.jpg'
      })
      .setTimestamp();

    const levelChannel = interaction.guild.channels.cache.get('1141760622799880284');
    if (levelChannel) {
      await levelChannel.send({ embeds: [embed] });
    }

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.followUp({ 
          content: `✅ Successfully set ${target.username}'s level to ${newLevel} and sent level up message.`,
          flags: 64 // Use flags instead of ephemeral
        });
      }
    } catch (error) {
      console.error('Error sending final reply:', error);
      if (error.code === 10062) {
        console.log("Interaction expired, cannot send final reply");
      }
    }
  },
};
