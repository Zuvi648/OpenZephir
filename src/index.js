const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const AntiRaidService = require('./services/antiRaid');
const RoleManagerService = require('./services/roleManager');
const BotController = require('./controllers/botController');

// Load config from .env or similar
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

let db;
let antiRaid;
let roleManager;
let botController;

client.commands = new Collection();

client.once('ready', async () => {
    console.log('Bot is ready!');
    db = await mysql.createConnection(dbConfig);
    antiRaid = new AntiRaidService(db);
    roleManager = new RoleManagerService(db, client);
    botController = new BotController(db, antiRaid, roleManager);

    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        client.commands.set(command.data.name, command);
    }
});

client.on('guildMemberAdd', async (member) => {
    // Implement anti-raid checks
    await antiRaid.shouldKick(member);

    // Assign roles if applicable
    await roleManager.assignRolesOnJoin(member);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, botController);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
