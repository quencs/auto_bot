import 'dotenv/config';

/**
 * Make a request to Discord API
 * @param {string} endpoint - API endpoint (appended to https://discord.com/api/v10/)
 * @param {object} options - Fetch options
 */
export async function DiscordRequest(endpoint, options) {
  const url = 'https://discord.com/api/v10/' + endpoint;
  if (options.body) options.body = JSON.stringify(options.body);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'TeemateBot (https://discord.teemate.gg, 1.0.0)',
    },
    ...options
  });
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  return res;
}

/**
 * Create a private thread in a channel
 * @param {string} channelId - Parent channel ID
 * @param {string} name - Thread name
 */
export async function createPrivateThread(channelId, name) {
  const res = await DiscordRequest(`channels/${channelId}/threads`, {
    method: 'POST',
    body: {
      name,
      type: 12, // GUILD_PRIVATE_THREAD
      invitable: false,
      auto_archive_duration: 1440, // 24h
    },
  });
  return res.json();
}

/**
 * Add a user to a thread
 * @param {string} threadId - Thread channel ID
 * @param {string} userId - User ID to add
 */
export async function addThreadMember(threadId, userId) {
  await DiscordRequest(`channels/${threadId}/thread-members/${userId}`, {
    method: 'PUT',
  });
}

/**
 * Add a role to a guild member
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID to add
 */
export async function addMemberRole(guildId, userId, roleId) {
  await DiscordRequest(`guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'PUT',
  });
}

/**
 * Remove a role from a guild member
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID to remove
 */
export async function removeMemberRole(guildId, userId, roleId) {
  await DiscordRequest(`guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'DELETE',
  });
}

/**
 * Send a payload to the n8n webhook for ticket processing
 * @param {object} payload - Ticket data to send
 * @returns {object|null} Response data or null on error
 */
export async function sendN8nWebhook(payload) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    console.error('N8N_WEBHOOK_URL not configured');
    return null;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`n8n webhook error (${res.status})`);
      return null;
    }
    return res.json().catch(() => ({ success: true }));
  } catch (err) {
    console.error('n8n webhook failed:', err.message);
    return null;
  }
}

/**
 * Install global commands to Discord
 * @param {string} appId - Discord application ID
 * @param {array} commands - Array of command objects
 */
export async function InstallGlobalCommands(appId, commands) {
  const endpoint = `applications/${appId}/commands`;
  try {
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}
