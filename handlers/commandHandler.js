const { Collection, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { loadLevelsData, saveLevelsData } = require("../utils/levels/levelsUtils");
const { onMessage } = require("../utils/levelingHandler"); // Import onMessage instead of handleLeveling

module.exports = (client) => {
  // Menyimpan semua commands yang terdaftar
  client.commands = new Collection();  
  const commands = [];

  const commandsPath = path.join(__dirname, "../commands");

  // Fungsi untuk memuat semua commands (.js) dalam folder dan subfolder
  const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        loadCommands(fullPath);  // Rekursif jika ada subfolder
      } else if (file.endsWith(".js")) {
        const command = require(fullPath);
        if (command.data && command.execute) {
          try {
            // Check if data is a SlashCommandBuilder instance
            const commandData = command.data instanceof SlashCommandBuilder ? 
              command.data.toJSON() : command.data;
            commands.push(commandData);
            client.commands.set(command.data.name, command);
          } catch (error) {
            console.error(`Failed to load command from ${fullPath}:`, error);
          }
        }
      }
    }
  };

  // Panggil untuk memuat semua commands
  loadCommands(commandsPath);

  // Daftarkan slash commands ketika bot sudah ready
  client.once("ready", async () => {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log("🔁 Mengupdate slash commands...");
      // Daftarkan per server
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, "947817894635520011"),
        { body: commands }
      );

      // Uncomment baris di bawah jika ingin global command (akan butuh waktu lebih lama untuk muncul)
      // await rest.put(
      //   Routes.applicationCommands(client.user.id),
      //   { body: commands }
      // );

      console.log("✅ Slash commands berhasil diperbarui.");
    } catch (err) {
      console.error("❌ Gagal memperbarui commands:", err);
    }
  });

  // Event handler untuk interaction (slash command)
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Check if interaction is already handled
    if (interaction.replied || interaction.deferred) return;

    // Check if interaction is too old (expired)
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 2500) {
      console.log("Interaction too old, skipping...");
      return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      // Check interaction age before executing command
      const interactionAge = Date.now() - interaction.createdTimestamp;
      if (interactionAge > 2000) {
        console.log("Command interaction too old, skipping...");
        return;
      }

      // Check if already handled
      if (interaction.replied || interaction.deferred) {
        console.log("Command interaction already handled, skipping...");
        return;
      }

      await command.execute(interaction);
    } catch (error) {
      console.error("Command execution error:", error);

      // Only respond if interaction hasn't been handled yet and is still valid
      if (!interaction.replied && !interaction.deferred) {
        try {
          // Check if error is due to unknown interaction (expired)
          if (error.code === 10062) {
            console.log("Interaction expired, cannot respond");
            return;
          }

          await interaction.reply({ 
            content: "❌ Terjadi kesalahan saat menjalankan command.", 
            flags: 64 // Use flags instead of ephemeral
          });
        } catch (replyError) {
          console.error("Error sending error response:", replyError);
        }
      }
    }
  });

  // Event untuk menangani level XP pada message yang dikirim
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    onMessage(message);  // Use onMessage instead of handleLeveling
  });

  // Memuat data level saat bot dijalankan
  try {
    loadLevelsData();
  } catch (error) {
    console.error("❌ Error loading level data: ", error);
  }

  // Simpan data level setiap interval
  setInterval(() => {
    try {
      const currentData = loadLevelsData();
      saveLevelsData(currentData);  // Menyimpan data leveling setiap 1 menit
    } catch (error) {
      console.error("❌ Error saving level data: ", error);
    }
  }, 60000);
};