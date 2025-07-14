const { EmbedBuilder } = require("discord.js");
const { getLatestMergedDevToMainPR } = require("../utils/github");

const owner = "SafeRS-io";
const repo = "SafeRS";
const THUMBNAIL_URL = "https://i.imgur.com/qLL6lnd.gif";


function buildPatchNotesEmbed(mergedPR) {
    return new EmbedBuilder()
        .setTitle("New SafeRS Patch Notes")
        .setDescription(`**${mergedPR.title}**\n\n${mergedPR.body || "_Someone was naughty and didn't write patch notes_"}`)
        .setColor(0x000000)
        .setThumbnail(THUMBNAIL_URL)
        .setTimestamp(new Date(mergedPR.merged_at))
        .setFooter({ text: `SafeRS Patch Notes` });
}

async function handleCommitsCommand(interaction) {
    try {
        await interaction.deferReply();
        const mergedPR = await getLatestMergedDevToMainPR(owner, repo);
        if (!mergedPR) {
            return await interaction.editReply("✅ No recent pull request merged from development to main.");
        }
        const embed = buildPatchNotesEmbed(mergedPR);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("Error fetching PRs:", error);
        let errorMessage = "❌ Failed to fetch pull requests.";
        if (error.status === 404) {
            errorMessage = `❌ Repository not found: ${owner}/${repo}. This could be due to:\n• Repository doesn't exist\n• You don't have access to the organization\n• Token lacks 'repo' scope for private repos\n• Token lacks 'read:org' scope for organization access`;
        } else if (error.status === 403) {
            errorMessage = "❌ Access denied. Please check your GitHub token permissions:\n• Needs 'repo' scope for private repos\n• Needs 'read:org' scope for organization access\n• You must be a member of the SafeRS-io organization";
        } else if (error.status === 401) {
            errorMessage = "❌ Unauthorized. Please check your GitHub token is valid.";
        }
        await interaction.editReply(errorMessage);
    }
}

module.exports = { handleCommitsCommand, buildPatchNotesEmbed, owner, repo }; 