const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your account to gain access to the server'),

    async execute(interaction, botController) {
        // Check if user is already verified
        const [rows] = await botController.db.execute('SELECT * FROM linked_accounts WHERE provider = ? AND provider_id = ?', ['discord', interaction.user.id]);
        if (rows.length > 0) {
            await interaction.reply({ content: 'You are already verified!', ephemeral: true });
            return;
        }

        // For simplicity, assume verification is just linking Discord
        // In real implementation, this might involve OAuth or other steps
        await botController.db.execute('INSERT INTO linked_accounts (user_id, provider, provider_id) VALUES ((SELECT id FROM users WHERE id = ?), ?, ?)', [interaction.user.id, 'discord', interaction.user.id]);

        // Assign verify role
        await botController.roleManager.assignRoleOnVerify(interaction.member);

        await botController.logAction('verify', { user: interaction.user.id });

        await interaction.reply({ content: 'You have been verified!', ephemeral: true });
    },
};
