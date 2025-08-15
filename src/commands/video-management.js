const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const VIDEO_DATA_FILE = path.join(__dirname, "../data/videos.json");

// Helper functions to manage video data
function loadVideoData() {
    try {
        if (fs.existsSync(VIDEO_DATA_FILE)) {
            const data = fs.readFileSync(VIDEO_DATA_FILE, "utf8");
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error loading video data:", error);
    }
    return [];
}

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

// Parse emoji from Discord format <:name:id> or <a:name:id>
function parseEmoji(emojiString) {
    if (!emojiString) return null;
    
    // Custom emoji format: <:name:id> or <a:name:id>
    const customEmojiMatch = emojiString.match(/<a?:(\w+):(\d+)>/);
    if (customEmojiMatch) {
        return {
            id: customEmojiMatch[2],
            name: customEmojiMatch[1],
            animated: emojiString.startsWith('<a:')
        };
    }
    
    // Unicode emoji - just return the string
    if (emojiString.length <= 4) {
        return emojiString;
    }
    
    return null;
}

// Generate a unique value for new videos
function generateVideoValue(label) {
    const timestamp = Date.now();
    const sanitized = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `action:${sanitized}_${timestamp}`;
}

async function handleAddVideo(interaction) {
    try {
        const label = interaction.options.getString("name");
        const url = interaction.options.getString("url");
        const emojiString = interaction.options.getString("emoji");
        const description = interaction.options.getString("description") || "Click this to get a link to the video!";

        // Parse emoji
        const emoji = parseEmoji(emojiString);

        // Load current data
        const videoData = loadVideoData();

        // Check if video with same name already exists
        if (videoData.some(v => v.label.toLowerCase() === label.toLowerCase())) {
            return await interaction.reply({
                content: `❌ A video with the name "${label}" already exists. Use \`/update-video\` to modify it.`,
                ephemeral: true
            });
        }

        // Create new video entry
        const newVideo = {
            label: label,
            value: generateVideoValue(label),
            description: description,
            emoji: emoji,
            url: url
        };

        videoData.push(newVideo);

        // Save to file
        if (saveVideoData(videoData)) {
            const embed = new EmbedBuilder()
                .setTitle("✅ Video Added Successfully")
                .setColor(0x57f287)
                .addFields(
                    { name: "📝 Name", value: label, inline: true },
                    { name: "🎥 URL", value: url, inline: true },
                    { name: "📄 Description", value: description, inline: false }
                )
                .setTimestamp();

            if (emoji) {
                if (typeof emoji === 'object') {
                    embed.addFields({ name: "😀 Emoji", value: `<:${emoji.name}:${emoji.id}>`, inline: true });
                } else {
                    embed.addFields({ name: "😀 Emoji", value: emoji, inline: true });
                }
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            console.log(`➕ ${interaction.user.tag} added video: ${label}`);
        } else {
            await interaction.reply({
                content: "❌ Failed to save video data. Please try again.",
                ephemeral: true
            });
        }

    } catch (error) {
        console.error("Error adding video:", error);
        await interaction.reply({
            content: "❌ An error occurred while adding the video.",
            ephemeral: true
        });
    }
}

async function handleUpdateVideo(interaction) {
    try {
        const currentName = interaction.options.getString("current_name");
        const newName = interaction.options.getString("new_name");
        const newUrl = interaction.options.getString("new_url");
        const newEmojiString = interaction.options.getString("new_emoji");
        const newDescription = interaction.options.getString("new_description");

        // Load current data
        const videoData = loadVideoData();
        const videoIndex = videoData.findIndex(v => v.label.toLowerCase() === currentName.toLowerCase());

        if (videoIndex === -1) {
            return await interaction.reply({
                content: `❌ Video "${currentName}" not found.`,
                ephemeral: true
            });
        }

        const video = videoData[videoIndex];
        const oldData = { ...video };

        // Update fields if provided
        if (newName) video.label = newName;
        if (newUrl) video.url = newUrl;
        if (newDescription) video.description = newDescription;
        if (newEmojiString !== undefined) {
            video.emoji = parseEmoji(newEmojiString);
        }

        // Save to file
        if (saveVideoData(videoData)) {
            const embed = new EmbedBuilder()
                .setTitle("✅ Video Updated Successfully")
                .setColor(0x5865f2)
                .addFields(
                    { name: "📝 Name", value: `${oldData.label} → ${video.label}`, inline: true },
                    { name: "🎥 URL", value: newUrl ? `Updated` : "Unchanged", inline: true },
                    { name: "📄 Description", value: newDescription ? `Updated` : "Unchanged", inline: true }
                )
                .setTimestamp();

            if (newEmojiString !== undefined) {
                const emojiDisplay = video.emoji 
                    ? (typeof video.emoji === 'object' ? `<:${video.emoji.name}:${video.emoji.id}>` : video.emoji)
                    : "Removed";
                embed.addFields({ name: "😀 Emoji", value: emojiDisplay, inline: true });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            console.log(`📝 ${interaction.user.tag} updated video: ${oldData.label}`);
        } else {
            await interaction.reply({
                content: "❌ Failed to save video data. Please try again.",
                ephemeral: true
            });
        }

    } catch (error) {
        console.error("Error updating video:", error);
        await interaction.reply({
            content: "❌ An error occurred while updating the video.",
            ephemeral: true
        });
    }
}

async function handleRemoveVideo(interaction) {
    try {
        const name = interaction.options.getString("name");

        // Load current data
        const videoData = loadVideoData();
        const videoIndex = videoData.findIndex(v => v.label.toLowerCase() === name.toLowerCase());

        if (videoIndex === -1) {
            return await interaction.reply({
                content: `❌ Video "${name}" not found.`,
                ephemeral: true
            });
        }

        const removedVideo = videoData[videoIndex];
        videoData.splice(videoIndex, 1);

        // Save to file
        if (saveVideoData(videoData)) {
            const embed = new EmbedBuilder()
                .setTitle("✅ Video Removed Successfully")
                .setColor(0xed4245)
                .addFields(
                    { name: "📝 Removed", value: removedVideo.label, inline: true },
                    { name: "📊 Total Videos", value: videoData.length.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            console.log(`🗑️ ${interaction.user.tag} removed video: ${removedVideo.label}`);
        } else {
            await interaction.reply({
                content: "❌ Failed to save video data. Please try again.",
                ephemeral: true
            });
        }

    } catch (error) {
        console.error("Error removing video:", error);
        await interaction.reply({
            content: "❌ An error occurred while removing the video.",
            ephemeral: true
        });
    }
}

async function handleListVideos(interaction) {
    try {
        const videoData = loadVideoData();

        if (videoData.length === 0) {
            return await interaction.reply({
                content: "📭 No videos found.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("📺 Current Videos")
            .setColor(0x5865f2)
            .setDescription(`Total videos: **${videoData.length}**`)
            .setTimestamp();

        const videoList = videoData.map((video, index) => {
            const emojiDisplay = video.emoji 
                ? (typeof video.emoji === 'object' ? `<:${video.emoji.name}:${video.emoji.id}>` : video.emoji)
                : "❌";
            return `${index + 1}. ${emojiDisplay} **${video.label}**`;
        }).join('\n');

        embed.addFields({ name: "📋 Video List", value: videoList || "None", inline: false });

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error("Error listing videos:", error);
        await interaction.reply({
            content: "❌ An error occurred while listing videos.",
            ephemeral: true
        });
    }
}

module.exports = {
    handleAddVideo,
    handleUpdateVideo,
    handleRemoveVideo,
    handleListVideos
}; 