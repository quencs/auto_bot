import { DiscordRequest, createPrivateThread, addThreadMember } from './utils.js';

function replaceVars(text, userId, username, guildName) {
  return text
    .replace(/\{user\}/g, `<@${userId}>`)
    .replace(/\{username\}/g, username)
    .replace(/\{server\}/g, guildName);
}

function buildEmoji(emoji) {
  if (!emoji) return undefined;
  // Custom emoji (has ID)
  if (emoji.id) return { id: emoji.id, name: emoji.name };
  // Unicode emoji (no ID, just the unicode character)
  if (emoji.unicode) return { name: emoji.unicode };
  // Fallback for legacy format
  if (emoji.name) return { name: emoji.name };
  return undefined;
}

function buildComponents(block, guildId) {
  const rows = [];

  for (const comp of block.components) {
    if (comp.type === 'dropdown') {
      const optCount = comp.options.length;
      rows.push({
        type: 1, // ACTION_ROW
        components: [{
          type: 3, // STRING_SELECT
          custom_id: `onb:${guildId}:${block.id}:select`,
          placeholder: comp.placeholder || 'Select an option',
          min_values: comp.multiSelect ? 0 : 1,
          max_values: comp.multiSelect ? optCount : 1,
          options: comp.options.map((opt) => ({
            label: opt.label,
            value: opt.value,
            description: opt.description || undefined,
            emoji: buildEmoji(opt.emoji),
          })),
        }],
      });
    }
  }

  return rows;
}

/**
 * Execute an onboarding workflow for a new member
 * @param {string} guildId
 * @param {string} userId
 * @param {string} username
 * @param {string} guildName
 * @param {object} onbConfig - OnboardingConfig document
 */
export async function executeOnboarding(guildId, userId, username, guildName, onbConfig) {
  // Create private thread
  const thread = await createPrivateThread(
    onbConfig.channelId,
    `${username}`
  );

  // Add user to thread
  await addThreadMember(thread.id, userId);

  // Execute blocks sequentially
  for (const block of onbConfig.blocks) {
    switch (block.type) {
      case 'message': {
        const content = replaceVars(block.content || '', userId, username, guildName);
        if (content) {
          await DiscordRequest(`channels/${thread.id}/messages`, {
            method: 'POST',
            body: { content },
          });
        }
        break;
      }

      case 'delay': {
        const seconds = Math.min(Math.max(block.delaySeconds || 5, 1), 300);
        await new Promise((r) => setTimeout(r, seconds * 1000));
        break;
      }

      case 'action': {
        if (!block.components?.length) break;
        const content = block.actionMessage
          ? replaceVars(block.actionMessage, userId, username, guildName)
          : undefined;
        const components = buildComponents(block, guildId);
        await DiscordRequest(`channels/${thread.id}/messages`, {
          method: 'POST',
          body: {
            content,
            components,
          },
        });
        break;
      }
    }
  }
}
