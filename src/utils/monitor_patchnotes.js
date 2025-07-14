require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getLatestMergedDevToMainPR } = require("./utils/github");
const { buildPatchNotesEmbed, owner, repo } = require("./commands/commits");

const CHANNEL_ID = "1233610419424329728";
const POLL_INTERVAL = 60 * 5000; // 5 minutes
const STATE_FILE = path.join(__dirname, "last_patchnotes_pr.json");

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

client.once("ready", () => {
    console.log(`✅ Patch notes monitor logged in as ${client.user.tag}`);
    setInterval(checkForNewPatchNotes, POLL_INTERVAL);
    // Run once on startup
    checkForNewPatchNotes();
});

client.login(process.env.TOKEN); 