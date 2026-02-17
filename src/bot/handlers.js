import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  ButtonStyleTypes,
  TextStyleTypes,
} from 'discord-interactions';
import { addMemberRole, removeMemberRole, DiscordRequest, sendN8nWebhook, createPrivateThread, addThreadMember } from './utils.js';
import OnboardingConfig from '../models/OnboardingConfig.js';
import GuildConfig from '../models/GuildConfig.js';

const TICKET_CATEGORIES = {
  'app-issue': {
    label: 'Problème Application',
    emoji: '\uD83D\uDC1B',
    description: 'Signaler un bug dans l\'application',
    labels: ['bug', 'app'],
    fields: ['title', 'description', 'steps'],
  },
  'app-suggestion': {
    label: 'Suggestion Application',
    emoji: '\uD83D\uDCA1',
    description: 'Proposer une amélioration pour l\'application',
    labels: ['enhancement', 'app'],
    fields: ['title', 'description'],
  },
  'discord-issue': {
    label: 'Problème Discord',
    emoji: '\u26A0\uFE0F',
    description: 'Signaler un bug sur le serveur Discord',
    labels: ['bug', 'discord'],
    fields: ['title', 'description', 'steps'],
  },
  'discord-suggestion': {
    label: 'Suggestion Discord',
    emoji: '\u2B50',
    description: 'Proposer une amélioration pour le serveur Discord',
    labels: ['enhancement', 'discord'],
    fields: ['title', 'description'],
  },
  'contact-mods': {
    label: 'Contacter les Modos',
    emoji: '\u2709\uFE0F',
    description: 'Envoyer un message privé aux modérateurs',
    labels: [],
    fields: ['subject', 'message'],
  },
};

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
      const channelId = req.body.channel?.id || req.body.channel_id;
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

    // Ticket: open button -> show category select menu
    if (customId === 'ticket:open') {
      const options = Object.entries(TICKET_CATEGORIES).map(([value, cat]) => ({
        label: cat.label,
        value,
        description: cat.description,
        emoji: { name: cat.emoji },
      }));
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Choisis une catégorie pour ton ticket :',
          flags: 64,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.STRING_SELECT,
                  custom_id: 'ticket:select',
                  placeholder: 'Choisis une catégorie...',
                  options,
                },
              ],
            },
          ],
        },
      });
    }

    // Ticket: category selected -> open modal
    if (customId === 'ticket:select' && values?.length) {
      const category = values[0];
      const cat = TICKET_CATEGORIES[category];
      if (!cat) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Catégorie inconnue.', flags: 64 },
        });
      }

      const modalComponents = [];

      if (cat.fields.includes('title')) {
        modalComponents.push({
          type: MessageComponentTypes.ACTION_ROW,
          components: [{
            type: MessageComponentTypes.INPUT_TEXT,
            custom_id: 'title',
            label: 'Titre',
            style: TextStyleTypes.SHORT,
            required: true,
            max_length: 100,
            placeholder: 'Résumé court du ticket',
          }],
        });
      }
      if (cat.fields.includes('subject')) {
        modalComponents.push({
          type: MessageComponentTypes.ACTION_ROW,
          components: [{
            type: MessageComponentTypes.INPUT_TEXT,
            custom_id: 'subject',
            label: 'Sujet',
            style: TextStyleTypes.SHORT,
            required: true,
            max_length: 100,
            placeholder: 'Sujet de ton message',
          }],
        });
      }
      if (cat.fields.includes('description')) {
        modalComponents.push({
          type: MessageComponentTypes.ACTION_ROW,
          components: [{
            type: MessageComponentTypes.INPUT_TEXT,
            custom_id: 'description',
            label: 'Description',
            style: TextStyleTypes.PARAGRAPH,
            required: true,
            max_length: 2000,
            placeholder: 'Décris en détail...',
          }],
        });
      }
      if (cat.fields.includes('message')) {
        modalComponents.push({
          type: MessageComponentTypes.ACTION_ROW,
          components: [{
            type: MessageComponentTypes.INPUT_TEXT,
            custom_id: 'message',
            label: 'Message',
            style: TextStyleTypes.PARAGRAPH,
            required: true,
            max_length: 2000,
            placeholder: 'Ton message pour les modérateurs...',
          }],
        });
      }
      if (cat.fields.includes('steps')) {
        modalComponents.push({
          type: MessageComponentTypes.ACTION_ROW,
          components: [{
            type: MessageComponentTypes.INPUT_TEXT,
            custom_id: 'steps',
            label: 'Étapes de reproduction',
            style: TextStyleTypes.PARAGRAPH,
            required: false,
            max_length: 2000,
            placeholder: '1. Aller sur...\n2. Cliquer sur...\n3. Observer que...',
          }],
        });
      }

      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `ticket:submit:${category}`,
          title: `${cat.emoji} ${cat.label}`,
          components: modalComponents,
        },
      });
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
      const category = customId.split(':')[2];
      const cat = TICKET_CATEGORIES[category];
      if (!cat) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Catégorie inconnue.', flags: 64 },
        });
      }

      // Extract field values from modal
      const fields = {};
      for (const row of req.body.data.components || []) {
        for (const comp of row.components || []) {
          fields[comp.custom_id] = comp.value;
        }
      }

      const user = req.body.member?.user || req.body.user;
      const guildId = req.body.guild_id;
      const channelId = req.body.channel?.id || req.body.channel_id;

      try {
        if (category === 'contact-mods') {
          // Create private thread for mod contact
          const threadName = `Ticket - ${user.username} - ${(fields.subject || 'Sans sujet').slice(0, 50)}`;
          const thread = await createPrivateThread(channelId, threadName);

          await addThreadMember(thread.id, user.id);

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
                title: fields.subject || 'Sans sujet',
                description: fields.message || '',
                color: 0x5865F2,
                timestamp: new Date().toISOString(),
              }],
            },
          });

          // Notify in log channel
          const config = await GuildConfig.findOne({ guildId });
          if (config?.logs?.enabled && config?.logs?.channelId) {
            await DiscordRequest(`channels/${config.logs.channelId}/messages`, {
              method: 'POST',
              body: {
                embeds: [{
                  title: '\u2709\uFE0F Nouveau ticket - Contact Modos',
                  description: `**De:** <@${user.id}>\n**Sujet:** ${fields.subject || 'Sans sujet'}`,
                  color: 0xFEE75C,
                  timestamp: new Date().toISOString(),
                }],
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

        // GitHub categories — send to n8n webhook
        const payload = {
          category,
          title: fields.title || 'Sans titre',
          description: fields.description || '',
          steps: fields.steps || null,
          labels: cat.labels,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.global_name || user.username,
          },
          guildId,
          timestamp: new Date().toISOString(),
        };

        // Fire-and-forget
        sendN8nWebhook(payload).catch(() => {});

        // Post summary in log channel
        const config = await GuildConfig.findOne({ guildId });
        if (config?.logs?.enabled && config?.logs?.channelId) {
          const logFields = [
            { name: 'Catégorie', value: `${cat.emoji} ${cat.label}`, inline: true },
            { name: 'Auteur', value: `<@${user.id}>`, inline: true },
            { name: 'Titre', value: fields.title || 'Sans titre', inline: false },
          ];
          if (fields.description) {
            logFields.push({ name: 'Description', value: fields.description.slice(0, 1024), inline: false });
          }
          if (fields.steps) {
            logFields.push({ name: 'Étapes de reproduction', value: fields.steps.slice(0, 1024), inline: false });
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
            content: '\u2705 Ton ticket a été soumis ! Une issue GitHub sera créée.',
            flags: 64,
          },
        });
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
