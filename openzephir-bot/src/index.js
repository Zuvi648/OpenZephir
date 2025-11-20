const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Load config from .env or similar
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

let db;

client.once('ready', async () => {
    console.log('Bot is ready!');
    db = await mysql.createConnection(dbConfig);
});

client.on('guildMemberAdd', async (member) => {
    // Anti-raid logic here
    // Check account age, etc.
    // Log to DB
    await db.execute('INSERT INTO bot_logs (action, details) VALUES (?, ?)', ['member_join', JSON.stringify({ user: member.user.id })]);
});

client.login(process.env.DISCORD_TOKEN);
