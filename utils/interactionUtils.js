
const safeReply = async (interaction, options) => {
  try {
    // Check if interaction is too old (more than 2.5 seconds)
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 2500) {
      console.log("Interaction too old, cannot reply");
      return false;
    }

    // Check if already replied or deferred
    if (interaction.replied || interaction.deferred) {
      console.log("Interaction already acknowledged");
      return false;
    }

    // Convert ephemeral to flags if present
    if (options.ephemeral === true) {
      options.flags = 64;
      delete options.ephemeral;
    }

    await interaction.reply(options);
    return true;
  } catch (error) {
    console.error("Error in safeReply:", error);
    if (error.code === 10062) {
      console.log("Interaction expired in safeReply");
    }
    return false;
  }
};

const safeUpdate = async (interaction, options) => {
  try {
    if (!interaction.deferred && !interaction.replied) {
      console.log("Cannot update interaction that hasn't been replied to");
      return false;
    }

    await interaction.update(options);
    return true;
  } catch (error) {
    console.error("Error in safeUpdate:", error);
    return false;
  }
};

const safeFollowUp = async (interaction, options) => {
  try {
    if (!interaction.replied && !interaction.deferred) {
      console.log("Cannot follow up on interaction that hasn't been replied to");
      return false;
    }

    await interaction.followUp(options);
    return true;
  } catch (error) {
    console.error("Error in safeFollowUp:", error);
    return false;
  }
};

module.exports = {
  safeReply,
  safeUpdate,
  safeFollowUp
};
