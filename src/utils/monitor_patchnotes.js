require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getLatestMergedDevToMainPR } = require("./github");
const { buildPatchNotesEmbed, owner, repo } = require("../commands/commits");

const CHANNEL_ID = "1233610419424329728";
const POLL_INTERVAL = 60 * 1000; // 1 minute
const STATE_FILE = path.join(__dirname, "../data/last_patchnotes_pr.json");

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
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
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastPrId: prId }), "utf8");
}
async function checkForNewPatchNotes() {
    try {
        console.log(`🔍 Checking for new patch notes... (${new Date().toLocaleTimeString()})`);
        const mergedPR = await getLatestMergedDevToMainPR(owner, repo);
        if (!mergedPR) {
            console.log("📭 No merged PR found");
            return;
        }
        
        const lastPrId = getLastPRId();
        console.log(`📋 Latest PR: #${mergedPR.number} (ID: ${mergedPR.id}), Last processed: ${lastPrId || 'None'}`);
        
        if (mergedPR.id !== lastPrId) {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                const embed = buildPatchNotesEmbed(mergedPR);
                await channel.send({ embeds: [embed] });
                setLastPRId(mergedPR.id);
                console.log(`✅ Sent new patch notes for PR #${mergedPR.number}`);
            } else {
                console.error("❌ Could not fetch Discord channel");
            }
        } else {
            console.log("✅ No new patch notes to send");
        }
    } catch (error) {
        console.error("❌ Error checking for new patch notes:", error.message);
        // Don't re-throw the error to prevent the process from crashing
    }
}

client.once("ready", () => {
    console.log(`✅ Patch notes monitor logged in as ${client.user.tag}`);
    console.log(`🔄 Starting patch notes monitoring (checking every ${POLL_INTERVAL / 1000} seconds)`);
    
    // Run once on startup
    checkForNewPatchNotes();
    
    // Set up the interval for continuous monitoring
    setInterval(checkForNewPatchNotes, POLL_INTERVAL);
});

// Add error handling for the Discord client
client.on("error", (error) => {
    console.error("❌ Discord client error:", error);
});

client.on("disconnect", () => {
    console.log("⚠️ Discord client disconnected");
});

client.login(process.env.TOKEN); 