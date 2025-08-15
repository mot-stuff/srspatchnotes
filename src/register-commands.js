require("dotenv").config();
const { REST, Routes } = require("discord.js");



const commands = [
    {
        name: "patchnotes",
        description: "Post the latest patch notes manually.",
    },
    {
        name: "clear",
        description: "Clear a specified number of messages from the channel.",
        options: [
            {
                name: "amount",
                description: "Number of messages to delete (1-100)",
                type: 4, // INTEGER type
                required: true,
                min_value: 1,
                max_value: 100
            }
        ]
    },
    {
        name: "videos",
        description: "Display SafeRS example videos with pagination support.",
        options: [
            {
                name: "message_id",
                description: "Message ID to replace (optional - creates new message if not provided)",
                type: 3, // STRING type
                required: false
            },
            {
                name: "channel_id", 
                description: "Channel ID where the message is located (required if message_id provided)",
                type: 3, // STRING type
                required: false
            }
        ]
    },
    {
        name: "add-video",
        description: "Add a new video to the SafeRS videos list.",
        options: [
            {
                name: "name",
                description: "Name of the script/video",
                type: 3, // STRING type
                required: true
            },
            {
                name: "url", 
                description: "YouTube URL for the video",
                type: 3, // STRING type
                required: true
            },
            {
                name: "emoji",
                description: "Custom emoji for the video (use Discord emoji format or unicode)",
                type: 3, // STRING type
                required: false
            },
            {
                name: "description",
                description: "Description for the video (default: 'Click this to get a link to the video!')",
                type: 3, // STRING type
                required: false
            }
        ]
    },
    {
        name: "update-video",
        description: "Update an existing video in the SafeRS videos list.",
        options: [
            {
                name: "current_name",
                description: "Current name of the video to update",
                type: 3, // STRING type
                required: true
            },
            {
                name: "new_name",
                description: "New name for the video (leave empty to keep current)",
                type: 3, // STRING type
                required: false
            },
            {
                name: "new_url",
                description: "New YouTube URL (leave empty to keep current)",
                type: 3, // STRING type
                required: false
            },
            {
                name: "new_emoji",
                description: "New emoji (leave empty to keep current, 'none' to remove)",
                type: 3, // STRING type
                required: false
            },
            {
                name: "new_description",
                description: "New description (leave empty to keep current)",
                type: 3, // STRING type
                required: false
            }
        ]
    },
    {
        name: "remove-video",
        description: "Remove a video from the SafeRS videos list.",
        options: [
            {
                name: "name",
                description: "Name of the video to remove",
                type: 3, // STRING type
                required: true
            }
        ]
    },
    {
        name: "list-videos",
        description: "List all current videos in the SafeRS videos list."
    }
];
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () =>  {
    try{
        console.log("🔄 Registering commands...");
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log("✅ Successfully registered commands");

    } catch (error) {
        console.error(`❌ Error registering commands ${error}`);
    }
})();