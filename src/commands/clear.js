const { PermissionFlagsBits } = require("discord.js");

async function handleClearCommand(interaction) {
    try {
        // Check if user has Manage Messages permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: "❌ You don't have permission to clear messages. You need the 'Manage Messages' permission.",
                ephemeral: true
            });
        }

        // Check if bot has Manage Messages permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: "❌ I don't have permission to delete messages. Please give me the 'Manage Messages' permission.",
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger("amount");
        
        // Validate amount
        if (amount < 1 || amount > 100) {
            return await interaction.reply({
                content: "❌ Please provide a number between 1 and 100.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // Fetch messages to delete
        const messages = await interaction.channel.messages.fetch({ limit: amount });
        
        if (messages.size === 0) {
            return await interaction.editReply({
                content: "❌ No messages found to delete."
            });
        }

        // Separate messages by age (Discord's bulk delete limitation is 14 days)
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        const recentMessages = messages.filter(msg => msg.createdTimestamp > fourteenDaysAgo);
        const oldMessages = messages.filter(msg => msg.createdTimestamp <= fourteenDaysAgo);

        let deletedCount = 0;
        let failedCount = 0;

        // Bulk delete recent messages (faster)
        if (recentMessages.size > 0) {
            try {
                await interaction.channel.bulkDelete(recentMessages, true);
                deletedCount += recentMessages.size;
            } catch (error) {
                console.error("Error with bulk delete:", error);
                failedCount += recentMessages.size;
            }
        }

        // Delete old messages individually (slower but works)
        if (oldMessages.size > 0) {
            await interaction.editReply({ 
                content: `🔄 Deleting ${oldMessages.size} older message(s) individually... This may take a moment.` 
            });

            for (const message of oldMessages.values()) {
                try {
                    await message.delete();
                    deletedCount++;
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`Failed to delete message ${message.id}:`, error);
                    failedCount++;
                }
            }
        }

        let responseMessage = `✅ Successfully deleted ${deletedCount} message(s).`;
        
        if (failedCount > 0) {
            responseMessage += `\n⚠️ ${failedCount} message(s) couldn't be deleted (possibly due to permissions or they were already deleted).`;
        }

        if (oldMessages.size > 0) {
            responseMessage += `\n📝 Note: ${oldMessages.size} message(s) were older than 14 days and had to be deleted individually.`;
        }

        await interaction.editReply({ content: responseMessage });

        // Log the action for audit purposes
        console.log(`🗑️ ${interaction.user.tag} cleared ${deletableMessages.size} messages in #${interaction.channel.name}`);

    } catch (error) {
        console.error("Error clearing messages:", error);
        
        const errorMessage = error.code === 50013 
            ? "❌ I don't have permission to delete some of these messages."
            : "❌ An error occurred while trying to clear messages.";
            
        if (interaction.deferred) {
            await interaction.editReply({ content: errorMessage });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

module.exports = { handleClearCommand }; 