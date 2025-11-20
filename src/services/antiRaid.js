const axios = require('axios');

class AntiRaidService {
    constructor(db) {
        this.db = db;
    }

    async checkAccountAge(member) {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const minAge = await this.getSetting('min_account_age') || 7 * 24 * 60 * 60 * 1000; // 7 days default
        return accountAge >= minAge;
    }

    async checkMultiAccount(member) {
        // Check for same IP or email patterns (simplified)
        const [rows] = await this.db.execute('SELECT * FROM linked_accounts WHERE provider = ? AND provider_id = ?', ['discord', member.user.id]);
        if (rows.length > 0) {
            // Check if already linked, but for multi-account, check shared data
            // This is a placeholder; in real implementation, you'd check shared IPs or emails
            return false; // Assume no multi-account for now
        }
        return true;
    }

    async checkSteamBan(member) {
        const steamApiKey = process.env.STEAM_API_KEY;
        const [rows] = await this.db.execute('SELECT * FROM linked_accounts WHERE user_id = (SELECT id FROM users WHERE id = (SELECT user_id FROM linked_accounts WHERE provider = ? AND provider_id = ?)) AND provider = ?', ['discord', member.user.id, 'steam']);
        if (rows.length > 0) {
            const steamId = rows[0].provider_id;
            try {
                const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${steamApiKey}&steamids=${steamId}`);
                const bans = response.data.players[0];
                return bans.NumberOfVACBans === 0 && bans.NumberOfGameBans === 0;
            } catch (error) {
                console.error('Steam API error:', error);
                return true; // Assume no ban if API fails
            }
        }
        return true; // No Steam account linked
    }

    async checkTwitchSuspension(member) {
        const twitchClientId = process.env.TWITCH_CLIENT_ID;
        const [rows] = await this.db.execute('SELECT * FROM linked_accounts WHERE user_id = (SELECT id FROM users WHERE id = (SELECT user_id FROM linked_accounts WHERE provider = ? AND provider_id = ?)) AND provider = ?', ['discord', member.user.id, 'twitch']);
        if (rows.length > 0) {
            const twitchId = rows[0].provider_id;
            try {
                const response = await axios.get(`https://api.twitch.tv/helix/users?id=${twitchId}`, {
                    headers: {
                        'Client-ID': twitchClientId,
                        'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
                    }
                });
                // Check if user is suspended (Twitch API doesn't directly provide this, placeholder)
                return true; // Assume not suspended
            } catch (error) {
                console.error('Twitch API error:', error);
                return true;
            }
        }
        return true;
    }

    async shouldKick(member) {
        const ageOk = await this.checkAccountAge(member);
        const multiOk = await this.checkMultiAccount(member);
        const steamOk = await this.checkSteamBan(member);
        const twitchOk = await this.checkTwitchSuspension(member);

        const autoKick = await this.getSetting('auto_kick') === '1';

        if (!ageOk || !multiOk || !steamOk || !twitchOk) {
            if (autoKick) {
                await member.kick('Anti-raid: Failed checks');
                await this.logAction('kick', { user: member.user.id, reason: 'anti-raid' });
            }
            return true;
        }
        return false;
    }

    async getSetting(key) {
        const [rows] = await this.db.execute('SELECT setting_value FROM server_settings WHERE setting_key = ?', [key]);
        return rows.length > 0 ? rows[0].setting_value : null;
    }

    async logAction(action, details) {
        await this.db.execute('INSERT INTO bot_logs (action, details, timestamp) VALUES (?, ?, NOW())', [action, JSON.stringify(details)]);
    }
}

module.exports = AntiRaidService;
