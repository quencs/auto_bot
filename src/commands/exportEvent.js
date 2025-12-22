import { AttachmentBuilder } from 'discord.js';
import { isAdmin, createAdminOnlyResponse } from '../config/permissions.js';
import { getEventByChannelId } from '../services/eventService.js';
import { generateExportData, formatAsCSV, getEventName } from '../services/exportService.js';

/**
 * /export-event Command Handler
 * 
 * Exports event attendance data as a CSV file.
 * Admin only command.
 * Must be run in an event channel.
 */

export async function handleExportEventCommand(interaction) {
  try {
    // Check admin permissions
    if (!isAdmin(interaction)) {
      await interaction.reply(createAdminOnlyResponse());
      return;
    }
    
    console.log(`📊 /export-event in channel ${interaction.channelId} by ${interaction.user.tag}`);
    
    // Defer reply (export may take a moment)
    await interaction.deferReply({ ephemeral: true });
    
    // Get event for this channel
    const event = await getEventByChannelId(interaction.channelId);
    
    if (!event) {
      await interaction.editReply({
        content: '❌ This is not an event channel. Please run this command in an event channel.',
      });
      return;
    }
    
    // Generate export data
    const result = await generateExportData(event.event_id);
    
    if (!result.success) {
      await interaction.editReply({
        content: result.message || '❌ Failed to generate export data. Please try again.',
      });
      return;
    }
    
    // Check if there's any data to export
    if (!result.data || result.data.length === 0) {
      await interaction.editReply({
        content: '⚠️ No attendance data to export. No one has checked in or checked out yet.',
      });
      return;
    }
    
    // Format as CSV
    const csvContent = formatAsCSV(result.data);
    
    // Create file attachment
    const fileName = `event-${event.event_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`;
    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: fileName });
    
    // Send CSV file to admin
    await interaction.editReply({
      content: `✅ Export complete!\n\n` +
               `**Event:** ${event.event_name}\n` +
               `**Total Records:** ${result.data.length}\n` +
               `**File:** ${fileName}\n\n` +
               `The CSV file is attached below and contains all check-in and check-out data.`,
      files: [attachment],
    });
    
    console.log(`✅ Event ${event.event_id} exported successfully (${result.data.length} rows)`);
  } catch (error) {
    console.error('❌ Error handling /export-event:', error);
    
    try {
      const errorMessage = {
        content: '❌ An error occurred while exporting the event data. Please try again.',
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

export default {
  handleExportEventCommand,
};
