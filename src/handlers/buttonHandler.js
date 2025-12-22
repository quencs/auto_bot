import { supabase } from '../database/supabase.js';
import { createCheckIn, postCheckInAnnouncement } from '../services/checkinService.js';
import { createCheckOut, isCheckOutWindowOpen } from '../services/checkoutService.js';

/**
 * Button Handler
 * 
 * Handles button interactions for check-in and check-out.
 * Routes button clicks to appropriate service handlers.
 */

/**
 * Handle check-in button interaction
 * 
 * @param {Object} interaction - Discord button interaction
 * @returns {Promise<void>}
 */
export async function handleCheckInButton(interaction) {
  try {
    // Parse event ID from button custom ID (format: checkin_<event_id>)
    const eventId = interaction.customId.split('_')[1];
    
    if (!eventId) {
      console.error('❌ Invalid check-in button custom ID:', interaction.customId);
      await interaction.reply({
        content: '❌ Invalid check-in button. Please contact an admin.',
        ephemeral: true,
      });
      return;
    }
    
    console.log(`🔘 Check-in button clicked by ${interaction.user.tag} for event ${eventId}`);
    
    // Defer reply (check-in may take a moment)
    await interaction.deferReply({ ephemeral: true });
    
    // Get event from database
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', eventId)
      .single();
    
    if (eventError || !event) {
      console.error('❌ Event not found:', eventId);
      await interaction.editReply({
        content: '❌ Event not found. It may have been deleted.',
      });
      return;
    }
    
    // Check if event has started
    const now = new Date();
    const startTime = new Date(event.start_time);
    
    if (now < startTime) {
      const timeUntilStart = Math.ceil((startTime - now) / 1000 / 60); // minutes
      await interaction.editReply({
        content: `⏰ Check-in is not available yet. Event starts in ${timeUntilStart} minute(s).`,
      });
      return;
    }
    
    // Check if event is still active
    if (event.status === 'closed') {
      await interaction.editReply({
        content: '🚫 This event has been closed. Check-in is no longer available.',
      });
      return;
    }
    
    // Create check-in record
    const result = await createCheckIn(eventId, interaction.user);
    
    if (!result.success) {
      // Handle duplicate check-in
      if (result.error === 'duplicate') {
        await interaction.editReply({
          content: '✅ You have already checked in to this event!',
        });
        return;
      }
      
      // Handle other errors
      await interaction.editReply({
        content: result.message || '❌ Failed to check in. Please try again.',
      });
      return;
    }
    
    // Post announcement in channel
    const announcementPosted = await postCheckInAnnouncement(
      interaction.channel,
      interaction.user,
      result.data.timestamp
    );
    
    if (!announcementPosted) {
      console.warn('⚠️ Check-in recorded but announcement failed');
    }
    
    // Confirm check-in to user
    await interaction.editReply({
      content: '✅ Successfully checked in! Your attendance has been recorded.',
    });
    
    console.log(`✅ Check-in complete for ${interaction.user.tag}`);
  } catch (error) {
    console.error('❌ Error handling check-in button:', error);
    
    try {
      await interaction.editReply({
        content: '❌ An error occurred while processing your check-in. Please try again.',
      });
    } catch (followUpError) {
      console.error('❌ Failed to send error message:', followUpError);
    }
  }
}

/**
 * Handle check-out button interaction
 * 
 * @param {Object} interaction - Discord button interaction
 * @returns {Promise<void>}
 */
export async function handleCheckOutButton(interaction) {
  try {
    // Parse event ID from button custom ID (format: checkout_<event_id>)
    const eventId = interaction.customId.split('_')[1];
    
    if (!eventId) {
      console.error('❌ Invalid check-out button custom ID:', interaction.customId);
      await interaction.reply({
        content: '❌ Invalid check-out button. Please contact an admin.',
        ephemeral: true,
      });
      return;
    }
    
    console.log(`🔘 Check-out button clicked by ${interaction.user.tag} for event ${eventId}`);
    
    // Defer reply (check-out may take a moment)
    await interaction.deferReply({ ephemeral: true });
    
    // Get event from database
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', eventId)
      .single();
    
    if (eventError || !event) {
      console.error('❌ Event not found:', eventId);
      await interaction.editReply({
        content: '❌ Event not found. It may have been deleted.',
      });
      return;
    }
    
    // Check if event is closed
    if (event.status !== 'closed') {
      await interaction.editReply({
        content: '⏰ Check-out is not available yet. The event must be closed first.',
      });
      return;
    }
    
    // Check if check-out window is still open (15 minutes)
    if (!isCheckOutWindowOpen(event)) {
      await interaction.editReply({
        content: '🚫 Check-out window has closed. Check-out is only available for 15 minutes after event closure.',
      });
      return;
    }
    
    // Create check-out record (FR-013: Allow check-out even without check-in)
    const result = await createCheckOut(eventId, interaction.user.id);
    
    if (!result.success) {
      // Handle duplicate check-out
      if (result.error === 'duplicate') {
        await interaction.editReply({
          content: '✅ You have already checked out from this event!',
        });
        return;
      }
      
      // Handle other errors
      await interaction.editReply({
        content: result.message || '❌ Failed to check out. Please try again.',
      });
      return;
    }
    
    // Confirm check-out to user (FR-010: No public announcement)
    await interaction.editReply({
      content: '✅ Successfully checked out! Your departure has been recorded.',
    });
    
    console.log(`✅ Check-out complete for ${interaction.user.tag}`);
  } catch (error) {
    console.error('❌ Error handling check-out button:', error);
    
    try {
      await interaction.editReply({
        content: '❌ An error occurred while processing your check-out. Please try again.',
      });
    } catch (followUpError) {
      console.error('❌ Failed to send error message:', followUpError);
    }
  }
}

/**
 * Route button interactions to appropriate handlers
 * 
 * @param {Object} interaction - Discord button interaction
 * @returns {Promise<void>}
 */
export async function handleButtonInteraction(interaction) {
  const { customId } = interaction;
  
  if (customId.startsWith('checkin_')) {
    await handleCheckInButton(interaction);
  } else if (customId.startsWith('checkout_')) {
    await handleCheckOutButton(interaction);
  } else {
    console.error('❌ Unknown button custom ID:', customId);
    await interaction.reply({
      content: '❌ Unknown button action.',
      ephemeral: true,
    });
  }
}

export default {
  handleButtonInteraction,
  handleCheckInButton,
  handleCheckOutButton,
};
