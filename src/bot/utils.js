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
    const data = await res.json().catch(() => ({}));
    console.error(`Discord API error ${res.status}: ${data.message || 'Unknown error'}`);
    throw new Error(`Discord API error (${res.status})`);
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
 * Validate that a URL is safe to call (no private/local addresses)
 */
function isUrlSafe(urlString) {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
      || hostname === '[::1]' || hostname.startsWith('10.') || hostname.startsWith('192.168.')
      || hostname.startsWith('172.')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Call a generic webhook URL with a JSON payload
 * @param {string} url - Webhook URL to POST to
 * @param {object} payload - JSON payload to send
 * @returns {object|null} Response data or null on error
 */
export async function callWebhook(url, payload) {
  if (!url) {
    console.error('callWebhook: no URL provided');
    return null;
  }
  if (!isUrlSafe(url)) {
    console.error('callWebhook: URL blocked (private/local address)');
    return null;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.error(`Webhook error (${res.status})`);
      return null;
    }
    return res.json().catch(() => ({ success: true }));
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Webhook call failed:', err.name === 'AbortError' ? 'Request timed out' : err.message);
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
