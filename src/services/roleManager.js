class RoleManagerService {
    constructor(db, client) {
        this.db = db;
        this.client = client;
    }

    async assignRolesOnJoin(member) {
        // Assign verify role if enabled
        const verifyRoleId = await this.getSetting('verify_role_id');
        if (verifyRoleId) {
            const role = member.guild.roles.cache.get(verifyRoleId);
            if (role) {
                await member.roles.add(role);
                await this.logAction('role_assign', { user: member.user.id, role: verifyRoleId, type: 'verify' });
            }
        }

        // Check Steam hours for role
        const steamHoursRoleId = await this.getSetting('steam_hours_role_id');
        const minSteamHours = await this.getSetting('min_steam_hours') || 0;
        if (steamHoursRoleId && minSteamHours > 0) {
            const steamHours = await this.getSteamHours(member.user.id);
            if (steamHours >= minSteamHours) {
                const role = member.guild.roles.cache.get(steamHoursRoleId);
                if (role) {
                    await member.roles.add(role);
                    await this.logAction('role_assign', { user: member.user.id, role: steamHoursRoleId, type: 'steam_hours' });
                }
            }
        }

        // Check Twitch subs for role
        const twitchSubsRoleId = await this.getSetting('twitch_subs_role_id');
        const minTwitchSubs = await this.getSetting('min_twitch_subs') || 0;
        if (twitchSubsRoleId && minTwitchSubs > 0) {
            const twitchSubs = await this.getTwitchSubs(member.user.id);
            if (twitchSubs >= minTwitchSubs) {
                const role = member.guild.roles.cache.get(twitchSubsRoleId);
                if (role) {
                    await member.roles.add(role);
                    await this.logAction('role_assign', { user: member.user.id, role: twitchSubsRoleId, type: 'twitch_subs' });
                }
            }
        }
    }

    async assignRoleOnVerify(member) {
        const verifyRoleId = await this.getSetting('verify_role_id');
        if (verifyRoleId) {
            const role = member.guild.roles.cache.get(verifyRoleId);
            if (role) {
                await member.roles.add(role);
                await this.logAction('role_assign', { user: member.user.id, role: verifyRoleId, type: 'verify' });
            }
        }
    }

    async getSteamHours(discordId) {
        // Placeholder: In real implementation, fetch from Steam API or stored data
        // For now, return 0
        return 0;
    }

    async getTwitchSubs(discordId) {
        // Placeholder: In real implementation, fetch from Twitch API
        // For now, return 0
        return 0;
    }

    async getSetting(key) {
        const [rows] = await this.db.execute('SELECT setting_value FROM server_settings WHERE setting_key = ?', [key]);
        return rows.length > 0 ? rows[0].setting_value : null;
    }

    async logAction(action, details) {
        await this.db.execute('INSERT INTO bot_logs (action, details, timestamp) VALUES (?, ?, NOW())', [action, JSON.stringify(details)]);
    }
}

module.exports = RoleManagerService;
