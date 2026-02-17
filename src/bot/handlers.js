import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  ButtonStyleTypes,
  TextStyleTypes,
} from 'discord-interactions';
import { addMemberRole, removeMemberRole, DiscordRequest, callWebhook, createPrivateThread, addThreadMember } from './utils.js';
import OnboardingConfig from '../models/OnboardingConfig.js';
import GuildConfig from '../models/GuildConfig.js';
import TicketConfig from '../models/TicketConfig.js';

/**
 * Handle Discord interactions
 */
export async function handleInteraction(req, res) {
  const { type, data } = req.body;

  // Handle verification requests
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'ping') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: '\uD83C\uDFD3 Pong!'
            }
          ]
        },
      });
    }

    if (name === 'ticket') {
      const guildId = req.body.guild_id;
      const channelId = req.body.channel?.id || req.body.channel_id;

      // Fetch config from DB
      const ticketConfig = await TicketConfig.findOne({ guildId });
      if (!ticketConfig?.enabled || !ticketConfig.ticketTypes?.length) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '\u274C Le système de tickets n\'est pas configuré. Configurez-le depuis le dashboard.',
            flags: 64,
          },
        });
      }

      // Post the ticket panel embed + button via REST
      await DiscordRequest(`channels/${channelId}/messages`, {
        method: 'POST',
        body: {
          embeds: [
            {
              title: '\uD83C\uDFAB Système de Tickets',
              description:
                'Besoin d\'aide ou envie de proposer quelque chose ?\nClique sur le bouton ci-dessous pour ouvrir un ticket.',
              color: 0x5865F2,
            },
          ],
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  style: ButtonStyleTypes.PRIMARY,
                  label: 'Ouvrir un ticket',
                  custom_id: 'ticket:open',
                  emoji: { name: '\uD83C\uDFAB' },
                },
              ],
            },
          ],
        },
      });
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '\u2705 Panneau de tickets posté !',
          flags: 64,
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  // Handle dropdown interactions (onboarding + tickets)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = req.body.data?.custom_id;
    const values = req.body.data?.values; // for dropdown

    // Ticket: open button -> show ticket type select menu
    if (customId === 'ticket:open') {
      const guildId = req.body.guild_id;
      const ticketConfig = await TicketConfig.findOne({ guildId });
      if (!ticketConfig?.ticketTypes?.length) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Aucun type de ticket configuré.', flags: 64 },
        });
      }

      const options = ticketConfig.ticketTypes.map((tt) => {
        const opt = {
          label: tt.label,
          value: tt.id,
          description: tt.description || undefined,
        };
        // Handle emoji: custom vs unicode
        if (tt.emoji?.id) {
          opt.emoji = { id: tt.emoji.id, name: tt.emoji.name };
        } else if (tt.emoji?.unicode) {
          opt.emoji = { name: tt.emoji.unicode };
        }
        return opt;
      });

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Choisis un type de ticket :',
          flags: 64,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.STRING_SELECT,
                  custom_id: 'ticket:select',
                  placeholder: 'Choisis un type de ticket...',
                  options,
                },
              ],
            },
          ],
        },
      });
    }

    // Ticket: type selected -> open modal
    if (customId === 'ticket:select' && values?.length) {
      const ticketTypeId = values[0];
      const guildId = req.body.guild_id;
      const ticketConfig = await TicketConfig.findOne({ guildId });
      const tt = ticketConfig?.ticketTypes?.find((t) => t.id === ticketTypeId);
      if (!tt) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Type de ticket inconnu.', flags: 64 },
        });
      }

      // Build modal fields dynamically from ticket type config
      const modalComponents = (tt.fields || []).map((field) => ({
        type: MessageComponentTypes.ACTION_ROW,
        components: [{
          type: MessageComponentTypes.INPUT_TEXT,
          custom_id: field.id,
          label: field.label,
          style: field.style === 'paragraph' ? TextStyleTypes.PARAGRAPH : TextStyleTypes.SHORT,
          required: field.required !== false,
          max_length: field.maxLength || 2000,
          placeholder: field.placeholder || '',
        }],
      }));

      // Build modal title with emoji
      let modalTitle = tt.label;
      if (tt.emoji?.unicode) {
        modalTitle = `${tt.emoji.unicode} ${tt.label}`;
      }
      // Truncate to Discord's 45-char modal title limit
      if (modalTitle.length > 45) modalTitle = modalTitle.slice(0, 45);

      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `ticket:submit:${ticketTypeId}`,
          title: modalTitle,
          components: modalComponents,
        },
      });
    }

    // Ticket: join thread button — claim ticket and remove button
    if (customId?.startsWith('ticket:join:')) {
      const threadId = customId.split(':')[2];
      const userId = req.body.member?.user?.id || req.body.user?.id;

      try {
        await addThreadMember(threadId, userId);

        // Update the notification message: show who claimed it and remove the button
        const originalEmbed = req.body.message?.embeds?.[0] || {};
        return res.send({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            embeds: [{
              ...originalEmbed,
              color: 0x57F287,
              footer: { text: `✅ Pris en charge par ${req.body.member?.nick || req.body.member?.user?.global_name || req.body.member?.user?.username || 'un modérateur'}` },
              timestamp: new Date().toISOString(),
            }],
            components: [],
          },
        });
      } catch (err) {
        console.error('Join thread error:', err);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Impossible de rejoindre le thread.', flags: 64 },
        });
      }
    }

    if (customId?.startsWith('onb:')) {
      const parts = customId.split(':');
      const guildId = parts[1];
      const blockId = parts[2];
      const optionValue = parts[3]; // 'select' for dropdown

      try {
        const onbConfig = await OnboardingConfig.findOne({ guildId });
        const block = onbConfig?.blocks?.find((b) => b.id === blockId);
        if (!block) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'This onboarding block no longer exists.', flags: 64 },
          });
        }

        const userId = req.body.member?.user?.id || req.body.user?.id;
        const currentRolesIds = req.body.member?.roles || [];
        const roleMentions = new Set();

        if (optionValue === 'select' && values?.length) {
          // Dropdown — synchronise roles with all selected values (supports multi-select)
          const selectedValues = new Set(values);

          for (const comp of block.components) {
            for (const opt of comp.options || []) {
              if (!opt?.action?.roleId) continue;

              const hasRole = currentRolesIds.includes(opt.action.roleId);
              const isSelected = selectedValues.has(opt.value);

              // Pour l'affichage final: on garde toutes les options sélectionnées
              if (isSelected) {
                roleMentions.add(`<@&${opt.action.roleId}>`);
              }

              // Ajoute le rôle s'il vient d'être sélectionné
              if (isSelected && !hasRole) {
                await addMemberRole(guildId, userId, opt.action.roleId);
              }

              // Retire le rôle s'il n'est plus sélectionné
              if (!isSelected && hasRole) {
                await removeMemberRole(guildId, userId, opt.action.roleId);
              }
            }
          }

          let content = 'Done!';
          const rolesList = Array.from(roleMentions);
          if (rolesList.length === 1) {
            content = `Tu as désormais le rôle: ${rolesList[0]}`;
          } else if (rolesList.length > 1) {
            content = `Tu as désormais les rôles: ${rolesList.join(', ')}`;
          }

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content,
              flags: 64,
            },
          });
        }
      } catch (err) {
        console.error('Onboarding interaction error:', err);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Something went wrong. Please try again.', flags: 64 },
        });
      }
    }
  }

  // Handle modal submissions (tickets)
  if (type === InteractionType.MODAL_SUBMIT) {
    const customId = req.body.data?.custom_id;

    if (customId?.startsWith('ticket:submit:')) {
      const ticketTypeId = customId.split(':')[2];
      const guildId = req.body.guild_id;
      const ticketConfig = await TicketConfig.findOne({ guildId });
      const tt = ticketConfig?.ticketTypes?.find((t) => t.id === ticketTypeId);
      if (!tt) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Type de ticket inconnu.', flags: 64 },
        });
      }

      // Extract field values from modal
      const fields = {};
      for (const row of req.body.data.components || []) {
        for (const comp of row.components || []) {
          fields[tt.fields.find((f) => f.id === comp.custom_id)?.name] = comp.value;
        }
      }

      const user = req.body.member?.user || req.body.user;

      try {
        if (tt.action.type === 'webhook') {
          // Generic webhook action
          const payload = {
            ticketType: tt.id,
            label: tt.label,
            fields,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.global_name || user.username,
            },
            guildId,
            timestamp: new Date().toISOString(),
          };

          // Fire-and-forget
          callWebhook(tt.action.webhookUrl, payload).catch(() => {});

          // Post summary in log channel
          const config = await GuildConfig.findOne({ guildId });
          if (config?.logs?.enabled && config?.logs?.channelId) {
            let emojiStr = '\uD83C\uDFAB';
            if (tt.emoji?.unicode) emojiStr = tt.emoji.unicode;

            const logFields = [
              { name: 'Type', value: `${emojiStr} ${tt.label}`, inline: true },
              { name: 'Auteur', value: `<@${user.id}>`, inline: true },
            ];
            for (const field of tt.fields || []) {
              if (fields[field.id]) {
                logFields.push({ name: field.label, value: fields[field.id].slice(0, 1024), inline: false });
              }
            }

            await DiscordRequest(`channels/${config.logs.channelId}/messages`, {
              method: 'POST',
              body: {
                embeds: [{
                  title: '\uD83C\uDFAB Nouveau ticket',
                  fields: logFields,
                  color: 0x57F287,
                  timestamp: new Date().toISOString(),
                }],
              },
            });
          }

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '\u2705 Ton ticket a été soumis !',
              flags: 64,
            },
          });
        }

        if (tt.action.type === 'private-thread') {
          // Build thread name from first field value
          const threadChannelId = tt.action.threadChannelId;
          const firstFieldValue = Object.values(fields)[0] || 'Sans sujet';
          const threadName = `Ticket - ${user.username} - ${firstFieldValue.slice(0, 50)}`;
          const thread = await createPrivateThread(threadChannelId, threadName);

          await addThreadMember(thread.id, user.id);

          // Build embed fields dynamically
          const embedFields = [];
          for (const field of tt.fields || []) {
            if (fields[field.id]) {
              embedFields.push({ name: field.label, value: fields[field.id].slice(0, 1024), inline: false });
            }
          }

          // Post the member's message in the thread
          await DiscordRequest(`channels/${thread.id}/messages`, {
            method: 'POST',
            body: {
              embeds: [{
                author: {
                  name: user.global_name || user.username,
                  icon_url: user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                    : undefined,
                },
                title: Object.values(fields)[0] || 'Sans sujet',
                description: embedFields.length > 1
                  ? embedFields.slice(1).map((f) => `**${f.name}:**\n${f.value}`).join('\n\n')
                  : '',
                color: 0x5865F2,
                timestamp: new Date().toISOString(),
              }],
            },
          });

          // Notify in mod channel with join button
          if (tt.action.notifyChannelId) {
            let emojiStr = '\u2709\uFE0F';
            if (tt.emoji?.unicode) emojiStr = tt.emoji.unicode;

            await DiscordRequest(`channels/${tt.action.notifyChannelId}/messages`, {
              method: 'POST',
              body: {
                embeds: [{
                  title: `${emojiStr} Nouveau ticket - ${tt.label}`,
                  description: `**De:** <@${user.id}>\n**Sujet:** ${Object.values(fields)[0] || 'Sans sujet'}`,
                  color: 0xFEE75C,
                  timestamp: new Date().toISOString(),
                }],
                components: [
                  {
                    type: MessageComponentTypes.ACTION_ROW,
                    components: [
                      {
                        type: MessageComponentTypes.BUTTON,
                        style: ButtonStyleTypes.PRIMARY,
                        label: 'Rejoindre le thread',
                        custom_id: `ticket:join:${thread.id}`,
                        emoji: { name: '\uD83D\uDD17' },
                      },
                    ],
                  },
                ],
              },
            });
          }

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '\u2705 Un thread privé a été créé pour ta demande.',
              flags: 64,
            },
          });
        }
      } catch (err) {
        console.error('Ticket submission error:', err);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Une erreur est survenue lors de la soumission du ticket.', flags: 64 },
        });
      }
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
}
