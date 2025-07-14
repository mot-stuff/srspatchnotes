const { Octokit } = require("octokit");
require("dotenv").config();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

/**
 * Fetch the latest PR merged from development to main.
 * @param {string} owner - GitHub org/user
 * @param {string} repo - Repository name
 * @returns {Promise<object|null>} - The latest merged PR object or null
 */
async function getLatestMergedDevToMainPR(owner, repo) {
    const { data: pullRequests } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "closed",
        base: "main",
        per_page: 20
    });
    return pullRequests.find(pr => pr.merged_at && pr.head.ref === "development") || null;
}

module.exports = {
    getLatestMergedDevToMainPR,
}; 