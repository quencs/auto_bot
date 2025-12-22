import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { isAdmin, createAdminOnlyResponse } from '../config/permissions.js';
import { createEvent } from '../services/eventService.js';

/**
 * /create-event Command Handler
 * 
 * Creates a new event with check-in tracking.
 * Admin only command.
 * 
 * Parameters:
 * - name: Event name (required)
 * - start-time: Event start time in format "YYYY-MM-DD HH:MM" (required)
 */

export async function handleCreateEventCommand(interaction) {
  try {
    // Check admin permissions
    if (!isAdmin(interaction)) {
      await interaction.reply(createAdminOnlyResponse());
      return;
    }
    
    // Get command parameters
    const eventName = interaction.options.getString('name');
    const startTimeInput = interaction.options.getString('start-time');
    
    console.log(`📋 /create-event: "${eventName}" starting at ${startTimeInput}`);
    
    // Defer reply (creating channel may take a moment)
    await interaction.deferReply({ ephemeral: true });
    
    // Parse start time
    const startTime = parseStartTime(startTimeInput);
    if (!startTime) {
      await interaction.editReply({
        content: '❌ Invalid start time format. Please use format: "YYYY-MM-DD HH:MM" (e.g., "2025-12-25 14:00")',
      });
      return;
    }
    
    // Validate start time is in the future
    if (startTime <= new Date()) {
      await interaction.editReply({
        content: '❌ Event start time must be in the future.',
      });
      return;
    }
    
    // Create event channel
    const channelName = `event-${eventName.toLowerCase().replace(/\s+/g, '-')}`;
    let channel;
    
    try {
      channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Event: ${eventName} | Starts: ${startTime.toLocaleString()}`,
        reason: `Event created by ${interaction.user.tag}`,
      });
      
      console.log(`✅ Created channel: ${channel.name} (${channel.id})`);
    } catch (channelError) {
      console.error('❌ Error creating channel:', channelError);
      await interaction.editReply({
        content: '❌ Failed to create event channel. Please check bot permissions.',
      });
      return;
    }
    
    // Create event in database
    const result = await createEvent({
      eventName,
      channelId: channel.id,
      startTime: startTime.toISOString(),
      createdBy: interaction.user.id,
    });
    
    if (!result.success) {
      // Delete channel if database creation failed
      await channel.delete();
      
      await interaction.editReply({
        content: result.message || '❌ Failed to create event in database.',
      });
      return;
    }
    
    const eventId = result.data.event_id;
    
    // Create check-in button (disabled until start time)
    const checkInButton = new ButtonBuilder()
      .setCustomId(`checkin_${eventId}`)
      .setLabel('Check In')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true); // Will be enabled at start time
    
    const row = new ActionRowBuilder().addComponents(checkInButton);
    
    // Post initial message in event channel
    const timeUntilStart = Math.ceil((startTime - new Date()) / 1000 / 60); // minutes
    
    await channel.send({
      content: `# 📋 ${eventName}\n\n` +
               `**Event Start Time:** ${startTime.toLocaleString()}\n` +
               `⏰ Check-in will be available in **${timeUntilStart} minute(s)**\n\n` +
               `_The check-in button will automatically enable when the event starts._`,
      components: [row],
    });
    
    // Send confirmation to admin
    await interaction.editReply({
      content: `✅ Event created successfully!\n\n` +
               `**Channel:** ${channel}\n` +
               `**Event Name:** ${eventName}\n` +
               `**Start Time:** ${startTime.toLocaleString()}\n` +
               `**Event ID:** \`${eventId}\`\n\n` +
               `The check-in button will automatically enable at the start time.`,
    });
    
    console.log(`✅ Event "${eventName}" created successfully (${eventId})`);
  } catch (error) {
    console.error('❌ Error handling /create-event:', error);
    
    try {
      const errorMessage = {
        content: '❌ An error occurred while creating the event. Please try again.',
      };
      
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ ...errorMessage, ephemeral: true });
      }
    } catch (followUpError) {
      console.error('❌ Failed to send error message:', followUpError);
    }
  }
}

/**
 * Parse start time string to Date object
 * 
 * @param {string} input - Start time string (e.g., "2025-12-25 14:00")
 * @returns {Date|null} - Parsed date or null if invalid
 */
function parseStartTime(input) {
  try {
    // Expected format: "YYYY-MM-DD HH:MM"
    const date = new Date(input);
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (err) {
    console.error('❌ Error parsing start time:', err);
    return null;
  }
}

export default {
  handleCreateEventCommand,
};
