import { Router } from 'express';
import { requireGuildAdmin } from './middleware.js';
import GuildConfig from '../models/GuildConfig.js';
import Embed from '../models/Embed.js';
import OnboardingConfig from '../models/OnboardingConfig.js';
import TicketConfig from '../models/TicketConfig.js';
import { DiscordRequest } from '../bot/utils.js';
import { executeOnboarding } from '../bot/onboarding.js';

const router = Router();

// In-memory cache for guild details (channels, roles, emojis) to avoid Discord rate limits
const guildCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * GET /api/guilds - List user's guilds (filtered: admin + bot present)
 */
router.get('/', async (req, res) => {
  try {
    // Filter guilds where user has admin or owner
    const adminGuilds = req.session.guilds.filter((g) => {
      const perms = BigInt(g.permissions);
      return g.owner || (perms & 0x8n) === 0x8n;
    });

    // Check which guilds the bot is in
    const botGuilds = [];
    for (const guild of adminGuilds) {
      try {
        await DiscordRequest(`guilds/${guild.id}`, { method: 'GET' });
        botGuilds.push({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
        });
      } catch {
        // Bot not in this guild, skip
      }
    }

    res.json(botGuilds);
  } catch (err) {
    console.error('Error fetching guilds:', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

/**
 * GET /api/guilds/:id - Guild details (channels, roles)
 */
router.get('/:id', requireGuildAdmin, async (req, res) => {
  try {
    const guildId = req.params.id;

    // Return cached data if fresh
    const cached = guildCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const [channelsRes, rolesRes, emojisRes] = await Promise.all([
      DiscordRequest(`guilds/${guildId}/channels`, { method: 'GET' }),
      DiscordRequest(`guilds/${guildId}/roles`, { method: 'GET' }),
      DiscordRequest(`guilds/${guildId}/emojis`, { method: 'GET' }),
    ]);

    const channels = await channelsRes.json();
    const roles = await rolesRes.json();
    const emojis = await emojisRes.json();

    // Filter to text channels only (type 0) and sort by position
    const textChannels = channels
      .filter((c) => c.type === 0)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name, position: c.position }));

    const sortedRoles = roles
      .filter((r) => r.id !== guildId) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }));

    const guildEmojis = (Array.isArray(emojis) ? emojis : [])
      .filter((e) => e.available !== false)
      .map((e) => ({ id: e.id, name: e.name, animated: e.animated || false }));

    const result = {
      id: req.guild.id,
      name: req.guild.name,
      icon: req.guild.icon,
      channels: textChannels,
      roles: sortedRoles,
      emojis: guildEmojis,
    };

    guildCache.set(guildId, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (err) {
    console.error('Error fetching guild details:', err);
    res.status(500).json({ error: 'Failed to fetch guild details' });
  }
});

/**
 * GET /api/guilds/:id/config - Get guild config
 */
router.get('/:id/config', requireGuildAdmin, async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await GuildConfig.create({
        guildId: req.params.id,
        guildName: req.guild.name,
      });
    }
    res.json(config);
  } catch (err) {
    console.error('Error fetching config:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * PATCH /api/guilds/:id/config - Update guild config
 */
router.patch('/:id/config', requireGuildAdmin, async (req, res) => {
  try {
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      { ...req.body, updatedBy: req.session.userId, guildName: req.guild.name },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config);
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

/**
 * GET /api/guilds/:id/welcome - Get welcome config
 */
router.get('/:id/welcome', requireGuildAdmin, async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await GuildConfig.create({
        guildId: req.params.id,
        guildName: req.guild.name,
      });
    }
    res.json(config.welcome);
  } catch (err) {
    console.error('Error fetching welcome config:', err);
    res.status(500).json({ error: 'Failed to fetch welcome config' });
  }
});

/**
 * PATCH /api/guilds/:id/welcome - Update welcome config
 */
router.patch('/:id/welcome', requireGuildAdmin, async (req, res) => {
  try {
    const update = {};
    for (const [key, value] of Object.entries(req.body)) {
      update[`welcome.${key}`] = value;
    }
    update.updatedBy = req.session.userId;

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config.welcome);
  } catch (err) {
    console.error('Error updating welcome config:', err);
    res.status(500).json({ error: 'Failed to update welcome config' });
  }
});

/**
 * GET /api/guilds/:id/logs - Get logs config
 */
router.get('/:id/logs', requireGuildAdmin, async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await GuildConfig.create({
        guildId: req.params.id,
        guildName: req.guild.name,
      });
    }
    res.json(config.logs);
  } catch (err) {
    console.error('Error fetching logs config:', err);
    res.status(500).json({ error: 'Failed to fetch logs config' });
  }
});

/**
 * PATCH /api/guilds/:id/logs - Update logs config
 */
router.patch('/:id/logs', requireGuildAdmin, async (req, res) => {
  try {
    const update = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'events' && typeof value === 'object') {
        for (const [event, enabled] of Object.entries(value)) {
          update[`logs.events.${event}`] = enabled;
        }
      } else {
        update[`logs.${key}`] = value;
      }
    }
    update.updatedBy = req.session.userId;

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config.logs);
  } catch (err) {
    console.error('Error updating logs config:', err);
    res.status(500).json({ error: 'Failed to update logs config' });
  }
});

// ── Embeds CRUD ──

function validateEmbedData(data) {
  const errors = [];
  let totalChars = 0;

  if (data.title) totalChars += data.title.length;
  if (data.description) totalChars += data.description.length;
  if (data.author?.name) totalChars += data.author.name.length;
  if (data.footer?.text) totalChars += data.footer.text.length;
  if (data.fields) {
    if (data.fields.length > 25) errors.push('Maximum 25 fields allowed');
    for (const f of data.fields) {
      totalChars += (f.name || '').length + (f.value || '').length;
    }
  }
  if (totalChars > 6000) errors.push(`Total characters (${totalChars}) exceeds 6000 limit`);

  return errors;
}

/**
 * GET /api/guilds/:id/embeds - List embeds for a guild
 */
router.get('/:id/embeds', requireGuildAdmin, async (req, res) => {
  try {
    const embeds = await Embed.find({ guildId: req.params.id }).sort({ updatedAt: -1 });
    res.json(embeds);
  } catch (err) {
    console.error('Error fetching embeds:', err);
    res.status(500).json({ error: 'Failed to fetch embeds' });
  }
});

/**
 * POST /api/guilds/:id/embeds - Create an embed
 */
router.post('/:id/embeds', requireGuildAdmin, async (req, res) => {
  try {
    const { name, data, channelId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Embed name is required' });
    }

    if (data) {
      const errors = validateEmbedData(data);
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    }

    const embed = await Embed.create({
      guildId: req.params.id,
      name: name.trim(),
      data: data || {},
      channelId: channelId || null,
      createdBy: req.session.userId,
      updatedBy: req.session.userId,
    });
    res.status(201).json(embed);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An embed with this name already exists' });
    }
    console.error('Error creating embed:', err);
    res.status(500).json({ error: 'Failed to create embed' });
  }
});

/**
 * PATCH /api/guilds/:id/embeds/:embedId - Update an embed
 */
router.patch('/:id/embeds/:embedId', requireGuildAdmin, async (req, res) => {
  try {
    const { name, data, channelId } = req.body;

    if (data) {
      const errors = validateEmbedData(data);
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    }

    const update = { updatedBy: req.session.userId };
    if (name !== undefined) update.name = name.trim();
    if (data !== undefined) update.data = data;
    if (channelId !== undefined) update.channelId = channelId;

    const embed = await Embed.findOneAndUpdate(
      { _id: req.params.embedId, guildId: req.params.id },
      update,
      { new: true, runValidators: true }
    );

    if (!embed) return res.status(404).json({ error: 'Embed not found' });
    res.json(embed);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An embed with this name already exists' });
    }
    console.error('Error updating embed:', err);
    res.status(500).json({ error: 'Failed to update embed' });
  }
});

/**
 * DELETE /api/guilds/:id/embeds/:embedId - Delete an embed
 */
router.delete('/:id/embeds/:embedId', requireGuildAdmin, async (req, res) => {
  try {
    const embed = await Embed.findOneAndDelete({
      _id: req.params.embedId,
      guildId: req.params.id,
    });
    if (!embed) return res.status(404).json({ error: 'Embed not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting embed:', err);
    res.status(500).json({ error: 'Failed to delete embed' });
  }
});

/**
 * POST /api/guilds/:id/embeds/:embedId/send - Send embed to a channel
 */
router.post('/:id/embeds/:embedId/send', requireGuildAdmin, async (req, res) => {
  try {
    const embed = await Embed.findOne({
      _id: req.params.embedId,
      guildId: req.params.id,
    });
    if (!embed) return res.status(404).json({ error: 'Embed not found' });

    const channelId = req.body.channelId || embed.channelId;
    if (!channelId) return res.status(400).json({ error: 'No channel specified' });

    // Build clean Discord embed object
    const discordEmbed = {};
    if (embed.data.title) discordEmbed.title = embed.data.title;
    if (embed.data.description) discordEmbed.description = embed.data.description;
    if (embed.data.url) discordEmbed.url = embed.data.url;
    if (embed.data.color != null) discordEmbed.color = embed.data.color;
    if (embed.data.timestamp) discordEmbed.timestamp = new Date().toISOString();
    if (embed.data.author?.name) {
      discordEmbed.author = { name: embed.data.author.name };
      if (embed.data.author.url) discordEmbed.author.url = embed.data.author.url;
      if (embed.data.author.icon_url) discordEmbed.author.icon_url = embed.data.author.icon_url;
    }
    if (embed.data.footer?.text) {
      discordEmbed.footer = { text: embed.data.footer.text };
      if (embed.data.footer.icon_url) discordEmbed.footer.icon_url = embed.data.footer.icon_url;
    }
    if (embed.data.thumbnail?.url) discordEmbed.thumbnail = { url: embed.data.thumbnail.url };
    if (embed.data.image?.url) discordEmbed.image = { url: embed.data.image.url };
    if (embed.data.fields?.length) discordEmbed.fields = embed.data.fields.map(f => ({
      name: f.name,
      value: f.value,
      inline: f.inline || false,
    }));

    await DiscordRequest(`channels/${channelId}/messages`, {
      method: 'POST',
      body: { embeds: [discordEmbed] },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending embed:', err);
    res.status(500).json({ error: 'Failed to send embed' });
  }
});

// ── Onboarding ──

function validateOnboardingBlocks(blocks) {
  const errors = [];
  if (!Array.isArray(blocks)) return ['blocks must be an array'];
  if (blocks.length > 20) errors.push('Maximum 20 blocks allowed');

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b.id || !b.type) {
      errors.push(`Block ${i}: missing id or type`);
      continue;
    }
    if (!['message', 'delay', 'action'].includes(b.type)) {
      errors.push(`Block ${i}: invalid type "${b.type}"`);
    }
    if (b.type === 'delay') {
      const s = Number(b.delaySeconds);
      if (!s || s < 1 || s > 300) errors.push(`Block ${i}: delay must be 1-300 seconds`);
    }
    if (b.type === 'action' && b.components) {
      for (const comp of b.components) {
        if (comp.type === 'button' && comp.options?.length > 5) {
          errors.push(`Block ${i}: max 5 buttons per component`);
        }
        if (comp.type === 'dropdown' && comp.options?.length > 25) {
          errors.push(`Block ${i}: max 25 dropdown options`);
        }
      }
    }
  }
  return errors;
}

/**
 * GET /api/guilds/:id/onboarding - Get onboarding config
 */
router.get('/:id/onboarding', requireGuildAdmin, async (req, res) => {
  try {
    let config = await OnboardingConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await OnboardingConfig.create({ guildId: req.params.id });
    }
    res.json(config);
  } catch (err) {
    console.error('Error fetching onboarding config:', err);
    res.status(500).json({ error: 'Failed to fetch onboarding config' });
  }
});

/**
 * PATCH /api/guilds/:id/onboarding - Update onboarding config
 */
router.patch('/:id/onboarding', requireGuildAdmin, async (req, res) => {
  try {
    const { enabled, channelId, blocks } = req.body;

    if (blocks !== undefined) {
      const errors = validateOnboardingBlocks(blocks);
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    }

    const update = { updatedBy: req.session.userId };
    if (enabled !== undefined) update.enabled = enabled;
    if (channelId !== undefined) update.channelId = channelId;
    if (blocks !== undefined) update.blocks = blocks;

    const config = await OnboardingConfig.findOneAndUpdate(
      { guildId: req.params.id },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    // Sync flags to GuildConfig for quick gateway check
    await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      {
        $set: {
          'onboarding.enabled': config.enabled,
          'onboarding.channelId': config.channelId,
        },
      },
      { upsert: true }
    );

    res.json(config);
  } catch (err) {
    console.error('Error updating onboarding config:', err);
    res.status(500).json({ error: 'Failed to update onboarding config' });
  }
});

/**
 * POST /api/guilds/:id/onboarding/test - Test onboarding for the current user
 */
router.post('/:id/onboarding/test', requireGuildAdmin, async (req, res) => {
  try {
    const config = await OnboardingConfig.findOne({ guildId: req.params.id });
    if (!config || !config.channelId || !config.blocks?.length) {
      return res.status(400).json({ error: 'Onboarding not configured or no blocks' });
    }

    const userId = req.session.userId;
    const guildName = req.guild.name || 'the server';

    // Fetch display name: server nick > global display name > username
    let displayName = req.session.username || 'User';
    try {
      const memberRes = await DiscordRequest(`guilds/${req.params.id}/members/${userId}`, { method: 'GET' });
      const member = await memberRes.json();
      displayName = member.nick || member.user?.global_name || member.user?.username || displayName;
    } catch {}

    // Fire-and-forget
    executeOnboarding(req.params.id, userId, displayName, guildName, config)
      .catch((err) => console.error('Test onboarding error:', err));

    res.json({ success: true });
  } catch (err) {
    console.error('Error testing onboarding:', err);
    res.status(500).json({ error: 'Failed to test onboarding' });
  }
});

// ── Tickets ──

function validateTicketTypes(ticketTypes) {
  const errors = [];
  if (!Array.isArray(ticketTypes)) return ['ticketTypes must be an array'];
  if (ticketTypes.length > 25) errors.push('Maximum 25 ticket types allowed');

  for (let i = 0; i < ticketTypes.length; i++) {
    const tt = ticketTypes[i];
    if (!tt.id || !tt.label) {
      errors.push(`Ticket type ${i}: missing id or label`);
      continue;
    }
    if (tt.label.length > 100) errors.push(`Ticket type ${i}: label exceeds 100 chars`);
    if (tt.description && tt.description.length > 100) errors.push(`Ticket type ${i}: description exceeds 100 chars`);
    if (!tt.action || !tt.action.type) {
      errors.push(`Ticket type ${i}: missing action`);
    } else if (!['webhook', 'private-thread'].includes(tt.action.type)) {
      errors.push(`Ticket type ${i}: invalid action type "${tt.action.type}"`);
    } else if (tt.action.type === 'webhook' && !tt.action.webhookUrl) {
      errors.push(`Ticket type ${i}: webhook action requires webhookUrl`);
    } else if (tt.action.type === 'private-thread' && !tt.action.threadChannelId) {
      errors.push(`Ticket type ${i}: private-thread action requires threadChannelId`);
    }
    if (tt.fields) {
      if (tt.fields.length > 5) errors.push(`Ticket type ${i}: max 5 fields`);
      for (let j = 0; j < tt.fields.length; j++) {
        const f = tt.fields[j];
        if (!f.id || !f.label) errors.push(`Ticket type ${i}, field ${j}: missing id or label`);
        if (f.label && f.label.length > 45) errors.push(`Ticket type ${i}, field ${j}: label exceeds 45 chars`);
      }
    }
  }
  return errors;
}

/**
 * GET /api/guilds/:id/tickets - Get ticket config
 */
router.get('/:id/tickets', requireGuildAdmin, async (req, res) => {
  try {
    let config = await TicketConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await TicketConfig.create({ guildId: req.params.id });
    }
    res.json(config);
  } catch (err) {
    console.error('Error fetching ticket config:', err);
    res.status(500).json({ error: 'Failed to fetch ticket config' });
  }
});

/**
 * PATCH /api/guilds/:id/tickets - Update ticket config
 */
router.patch('/:id/tickets', requireGuildAdmin, async (req, res) => {
  try {
    const { enabled, channelId, ticketTypes } = req.body;

    if (ticketTypes !== undefined) {
      const errors = validateTicketTypes(ticketTypes);
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    }

    const update = { updatedBy: req.session.userId };
    if (enabled !== undefined) update.enabled = enabled;
    if (channelId !== undefined) update.channelId = channelId;
    if (ticketTypes !== undefined) update.ticketTypes = ticketTypes;

    const config = await TicketConfig.findOneAndUpdate(
      { guildId: req.params.id },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    // Sync flags to GuildConfig for quick gateway check
    await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      {
        $set: {
          'tickets.enabled': config.enabled,
          'tickets.channelId': config.channelId,
        },
      },
      { upsert: true }
    );

    res.json(config);
  } catch (err) {
    console.error('Error updating ticket config:', err);
    res.status(500).json({ error: 'Failed to update ticket config' });
  }
});

export default router;
