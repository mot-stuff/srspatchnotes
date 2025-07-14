const { Client, IntentsBitField } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { handleCommitsCommand, buildPatchNotesEmbed, owner, repo } = require("./commands/commits");
const { getLatestMergedDevToMainPR } = require("./utils/github");

const CHANNEL_ID = "1233610419424329728";
const POLL_INTERVAL = 60 * 5000; // 5 minutes
const STATE_FILE = path.join(__dirname, "data/last_patchnotes_pr.json");

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
    ],
});

function getLastPRId() {
    if (fs.existsSync(STATE_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
            return data.lastPrId;
        } catch {
            return null;
        }
    }
    return null;
}

function setLastPRId(prId) {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastPrId: prId }), "utf8");
}

async function checkForNewPatchNotes() {
    const mergedPR = await getLatestMergedDevToMainPR(owner, repo);
    if (!mergedPR) return;
    const lastPrId = getLastPRId();
    if (mergedPR.id !== lastPrId) {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
            const embed = buildPatchNotesEmbed(mergedPR);
            await channel.send({ embeds: [embed] });
            setLastPRId(mergedPR.id);
            console.log(`✅ Sent new patch notes for PR #${mergedPR.number}`);
        }
    }
}

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    if (process.env.GITHUB_TOKEN) {
        try {
            const { Octokit } = require("octokit");
            const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
            console.log("🔍 Testing GitHub API connection...");
            const { data: user } = await octokit.rest.users.getAuthenticated();
            console.log(`✅ GitHub API connected as: ${user.login}`);
            console.log("🔍 Testing organization access...");
            const { data: orgs } = await octokit.rest.orgs.listForAuthenticatedUser();
            const hasOrgAccess = orgs.some(org => org.login === "SafeRS-io");
            console.log(`Organization access: ${hasOrgAccess ? '✅ Has access to SafeRS-io' : '❌ No access to SafeRS-io'}`);
            if (!hasOrgAccess) {
                console.log("💡 Make sure your token has 'read:org' scope and you're a member of the SafeRS-io organization");
            }
        } catch (error) {
            console.error("❌ GitHub API test failed:", error.message);
            console.error("Make sure your GITHUB_TOKEN is valid and has the correct permissions");
        }
    } else {
        console.error("❌ GITHUB_TOKEN not found in environment variables");
    }
    // Start patch notes monitor
    console.log("🚀 Starting Patch Notes Monitor...");
    setInterval(checkForNewPatchNotes, POLL_INTERVAL);
    checkForNewPatchNotes();
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === "patchnotes" || interaction.commandName === "commits") {
        await handleCommitsCommand(interaction);
    }
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(process.env.TOKEN);