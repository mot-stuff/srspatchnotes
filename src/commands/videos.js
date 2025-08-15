const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const VIDEO_DATA_FILE = path.join(__dirname, "../data/videos.json");

// Load video data from file
function loadVideoData() {
    try {
        if (fs.existsSync(VIDEO_DATA_FILE)) {
            const data = fs.readFileSync(VIDEO_DATA_FILE, "utf8");
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error loading video data:", error);
    }
    // Fallback to default data
    return [
        {
            label: "Gemstone Crabs",
            value: "action:531065172",
            description: "Click this to get a link to the video!",
            emoji: { id: "1399993487964901496", name: "combat" },
            url: "https://example.com/gemstone-crabs"
        },
        {
            label: "Guardians of the Rift",
            value: "action:677786165", 
            description: "Click this to get a link to the video!",
            emoji: null,
            url: "https://example.com/guardians-rift"
        }
    ];
}

// Save video data to file
function saveVideoData(videoData) {
    try {
        const dir = path.dirname(VIDEO_DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(VIDEO_DATA_FILE, JSON.stringify(videoData, null, 2), "utf8");
        return true;
    } catch (error) {
        console.error("Error saving video data:", error);
        return false;
    }
}

// Get current video data
function getVideoData() {
    return loadVideoData();
}

const ITEMS_PER_PAGE = 20; // Discord limit is 25, using 20 for button space
const THUMBNAIL_URL = "https://message.style/cdn/images/f4de21d98bb597758115d76ec6c302130061f7c132535e43a1fd3167a692a0ff.png";

function createVideosEmbed(page = 0) {
    const embed = new EmbedBuilder()
        .setTitle("SafeRS | Example Videos")
        .setDescription("Select a script from one of the dropdowns below to view it's example video. (Videos currently being updated)")
        .setColor(0x000000) // Black color like original
        .setThumbnail(THUMBNAIL_URL);

    return embed;
}

function createVideoSelectMenu(page = 0) {
    const videoData = getVideoData();
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, videoData.length);
    const pageVideos = videoData.slice(startIndex, endIndex);

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`videos_select_${page}`) // Include page in ID for pagination
        .setPlaceholder("Choose a Script")
        .setMinValues(1)
        .setMaxValues(1);

    pageVideos.forEach(video => {
        const option = {
            label: video.label,
            value: video.value,
            description: video.description
        };
        
        // Only add emoji if it exists
        if (video.emoji) {
            option.emoji = video.emoji;
        }
        
        selectMenu.addOptions(option);
    });

    return selectMenu;
}

function createNavigationButtons(page = 0) {
    const videoData = getVideoData();
    const totalPages = Math.ceil(videoData.length / ITEMS_PER_PAGE);
    const row = new ActionRowBuilder();

    // Overview Video - Direct link button
    row.addComponents(
        new ButtonBuilder()
            .setLabel("Overview Video")
            .setStyle(ButtonStyle.Link)
            .setURL("https://youtu.be/08dQNYAwXqg") // Replace with actual overview URL
            .setEmoji("📺")
    );

    // YouTube Channel - Red button with ephemeral message
    row.addComponents(
        new ButtonBuilder()
            .setCustomId("action:858375885")
            .setLabel("YouTube Channel") 
            .setStyle(ButtonStyle.Danger) // Red button
            .setEmoji("🎬")
    );

    // Add pagination if we have more than 1 page
    if (totalPages > 1) {
        // Previous page button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`videos_prev_${page}`)
                .setLabel("◀️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0)
        );

        // Page indicator
        row.addComponents(
            new ButtonBuilder()
                .setCustomId("page_indicator")
                .setLabel(`${page + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        // Next page button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`videos_next_${page}`)
                .setLabel("▶️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        );
    }

    return row;
}

async function handleVideosCommand(interaction) {
    try {
        const messageId = interaction.options.getString("message_id");
        const channelId = interaction.options.getString("channel_id");

        const embed = createVideosEmbed(0);
        const selectMenu = createVideoSelectMenu(0);
        const navigationRow = createNavigationButtons(0);
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const components = [navigationRow, selectRow];

        // If message ID provided, replace existing message
        if (messageId) {
            if (!channelId) {
                return await interaction.reply({
                    content: "❌ You must provide both message_id and channel_id to replace a message.",
                    ephemeral: true
                });
            }

            try {
                const targetChannel = await interaction.client.channels.fetch(channelId);
                if (!targetChannel) {
                    return await interaction.reply({
                        content: "❌ Could not find the specified channel.",
                        ephemeral: true
                    });
                }

                const targetMessage = await targetChannel.messages.fetch(messageId);
                if (!targetMessage) {
                    return await interaction.reply({
                        content: "❌ Could not find the specified message.",
                        ephemeral: true
                    });
                }

                // Check if bot can edit the message (must be bot's own message)
                if (targetMessage.author.id !== interaction.client.user.id) {
                    return await interaction.reply({
                        content: "❌ I can only replace my own messages.",
                        ephemeral: true
                    });
                }

                await targetMessage.edit({
                    embeds: [embed],
                    components: components
                });

                await interaction.reply({
                    content: `✅ Successfully updated the message in <#${channelId}>!`,
                    ephemeral: true
                });

            } catch (error) {
                console.error("Error replacing message:", error);
                await interaction.reply({
                    content: "❌ Failed to replace the message. Make sure the message ID and channel ID are correct.",
                    ephemeral: true
                });
            }
        } 
        // Otherwise create new message
        else {
            // Acknowledge the command privately
            await interaction.deferReply({ ephemeral: true });
            
            // Send the embed directly to the channel (no command connection)
            await interaction.channel.send({
                embeds: [embed],
                components: components
            });
            
            // Confirm to user privately
            await interaction.editReply({ content: "✅ Videos embed created!" });
        }

    } catch (error) {
        console.error("Error handling videos command:", error);
        await interaction.reply({
            content: "❌ An error occurred while loading the videos menu.",
            ephemeral: true
        });
    }
}

async function handleVideoSelection(interaction) {
    try {
        const selectedValue = interaction.values[0];
        const videoData = getVideoData();
        const video = videoData.find(v => v.value === selectedValue);

        if (!video) {
            return await interaction.reply({
                content: "❌ Video not found.",
                ephemeral: true
            });
        }

        // Just send the raw URL so Discord auto-embeds it
        await interaction.reply({
            content: video.url, // Just the URL, Discord will auto-embed
            ephemeral: true
        });

    } catch (error) {
        console.error("Error handling video selection:", error);
        await interaction.reply({
            content: "❌ An error occurred while loading the video.",
            ephemeral: true
        });
    }
}

// Handle pagination navigation
async function handlePageNavigation(interaction) {
    try {
        const [action, direction, currentPageStr] = interaction.customId.split("_");
        const currentPage = parseInt(currentPageStr);
        const videoData = getVideoData();
        const totalPages = Math.ceil(videoData.length / ITEMS_PER_PAGE);

        let newPage = currentPage;
        if (direction === "next" && currentPage < totalPages - 1) {
            newPage = currentPage + 1;
        } else if (direction === "prev" && currentPage > 0) {
            newPage = currentPage - 1;
        }

        const embed = createVideosEmbed(newPage);
        const selectMenu = createVideoSelectMenu(newPage);
        const navigationRow = createNavigationButtons(newPage);
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const components = [navigationRow, selectRow];

        await interaction.update({
            embeds: [embed],
            components: components
        });

    } catch (error) {
        console.error("Error handling page navigation:", error);
        await interaction.reply({
            content: "❌ An error occurred while navigating pages.",
            ephemeral: true
        });
    }
}



module.exports = { 
    handleVideosCommand, 
    handleVideoSelection,
    handlePageNavigation,
    getVideoData,
    saveVideoData,
    loadVideoData
}; 