
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const teamsPath = './data/teams.json';

// Ensure data directory exists
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize empty teams file if not exists
if (!fs.existsSync(teamsPath)) {
  fs.writeFileSync(teamsPath, '[]');
}

function handleMCLInteraction(interaction) {
  if (interaction.isButton()) {
    handleButtonInteraction(interaction);
  } else if (interaction.isModalSubmit()) {
    handleModalSubmit(interaction);
  } else if (interaction.isStringSelectMenu()) {
    handleMenuSelect(interaction);
  }
}

async function handleButtonInteraction(interaction) {
  if (interaction.customId === 'create_team') {
    const modal = new ModalBuilder()
      .setCustomId('create_team_modal')
      .setTitle('🛡️ Buat Tim MCL');

    const teamName = new TextInputBuilder()
      .setCustomId('team_name')
      .setLabel('Nama Tim')
      .setPlaceholder('Contoh: MLBB Team Alpha')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const teamLink = new TextInputBuilder()
      .setCustomId('team_link')
      .setLabel('Link Squad/Grup WA')
      .setPlaceholder('Contoh: https://chat.whatsapp.com/xxx atau https://mobilelegends.com/squad/xxx')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const teamDesc = new TextInputBuilder()
      .setCustomId('team_desc')
      .setLabel('Informasi Tim')
      .setPlaceholder('Contoh: Minimal Epic, Aktif jam 8-10 malam, Voice call wajib')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const teamSlot = new TextInputBuilder()
      .setCustomId('team_slot')
      .setLabel('Jumlah Slot yang Tersedia (1-5)')
      .setPlaceholder('Masukkan angka 1-5')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(teamName),
      new ActionRowBuilder().addComponents(teamLink),
      new ActionRowBuilder().addComponents(teamDesc),
      new ActionRowBuilder().addComponents(teamSlot)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === 'join_team') {
    const teams = JSON.parse(fs.readFileSync(teamsPath));
    if (teams.length === 0) {
      return interaction.reply({ content: '❌ Belum ada tim terdaftar.', ephemeral: true });
    }

    const options = teams.map((team, index) => 
      new StringSelectMenuOptionBuilder()
        .setLabel(`${team.name} (${team.slot} Slot)`)
        .setValue(String(index))
        .setDescription(team.desc || 'Tidak ada deskripsi')
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_team')
      .setPlaceholder('Pilih tim untuk bergabung')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.followUp({ 
      content: 'Pilih tim yang ingin kamu ikuti:', 
      components: [row], 
      ephemeral: true 
    });
  }
}

async function handleModalSubmit(interaction) {
  if (interaction.customId === 'create_team_modal') {
    const name = interaction.fields.getTextInputValue('team_name');
    const link = interaction.fields.getTextInputValue('team_link');
    const desc = interaction.fields.getTextInputValue('team_desc');
    const slot = interaction.fields.getTextInputValue('team_slot');

    if (isNaN(slot) || Number(slot) < 1 || Number(slot) > 5) {
      return interaction.followUp({ 
        content: '❌ Slot harus berupa angka antara 1–5.', 
        ephemeral: true 
      });
    }

    const teams = JSON.parse(fs.readFileSync(teamsPath));
    teams.push({ 
      name, 
      link, 
      desc, 
      slot: Number(slot), 
      createdAt: Date.now() 
    });
    
    fs.writeFileSync(teamsPath, JSON.stringify(teams, null, 2));
    await interaction.followUp({ 
      content: `✅ Tim **${name}** berhasil dibuat!`, 
      ephemeral: true 
    });
  }
}

async function handleMenuSelect(interaction) {
  if (interaction.customId === 'select_team') {
    const teams = JSON.parse(fs.readFileSync(teamsPath));
    const team = teams[Number(interaction.values[0])];

    if (team) {
      await interaction.followUp({ 
        content: `🔗 Link tim **${team.name}**: ${team.link}`, 
        ephemeral: true 
      });
    } else {
      await interaction.followUp({ 
        content: '❌ Tim tidak ditemukan.', 
        ephemeral: true 
      });
    }
  }
}

// Clean up old teams every 10 minutes
setInterval(() => {
  const teams = JSON.parse(fs.readFileSync(teamsPath));
  const now = Date.now();
  const updated = teams.filter(t => now - t.createdAt < 5 * 60 * 60 * 1000); // 5 hours
  fs.writeFileSync(teamsPath, JSON.stringify(updated, null, 2));
}, 10 * 60 * 1000);

module.exports = { handleMCLInteraction };
