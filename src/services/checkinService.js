import { supabase } from '../database/supabase.js';

/**
 * Check-In Service
 * 
 * Handles check-in logic for event attendance tracking.
 * Features:
 * - Record user check-ins to Supabase database
 * - Prevent duplicate check-ins per user per event
 * - Post announcement messages when users check in
 */

/**
 * Create a check-in record in the database
 * 
 * @param {string} eventId - UUID of the event
 * @param {Object} user - Discord user object
 * @param {string} user.id - Discord user ID
 * @param {string} user.username - Discord username
 * @param {string} user.discriminator - Discord discriminator (may be '0')
 * @returns {Promise<Object>} - Check-in record or error
 */
export async function createCheckIn(eventId, user) {
  try {
    console.log(`📝 Creating check-in for user ${user.username} (${user.id}) at event ${eventId}`);
    
    // Insert check-in record
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        event_id: eventId,
        user_id: user.id,
        username: user.username,
        discriminator: user.discriminator === '0' ? null : user.discriminator, // Handle new username system
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      // Check for duplicate check-in (unique constraint violation)
      if (error.code === '23505') {
        console.log(`⚠️ Duplicate check-in attempt by ${user.username}`);
        return {
          success: false,
          error: 'duplicate',
          message: 'You have already checked in to this event!',
        };
      }
      
      console.error('❌ Database error creating check-in:', error);
      return {
        success: false,
        error: 'database',
        message: 'Failed to record check-in. Please try again.',
      };
    }
    
    console.log(`✅ Check-in created successfully: ${data.checkin_id}`);
    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error('❌ Unexpected error creating check-in:', err);
    return {
      success: false,
      error: 'unexpected',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Post check-in announcement message in the event channel
 * 
 * @param {Object} channel - Discord channel object
 * @param {Object} user - Discord user object
 * @param {string} timestamp - ISO timestamp of check-in
 * @returns {Promise<boolean>} - True if announcement posted successfully
 */
export async function postCheckInAnnouncement(channel, user, timestamp) {
  try {
    console.log(`📢 Posting check-in announcement for ${user.username} in channel ${channel.id}`);
    
    // Format timestamp for display
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    // Post announcement message
    await channel.send({
      content: `✅ **${user.username}** checked in at **${timeString}**`,
    });
    
    console.log(`✅ Check-in announcement posted successfully`);
    return true;
  } catch (err) {
    console.error('❌ Error posting check-in announcement:', err);
    return false;
  }
}

/**
 * Check if user has already checked in to an event
 * 
 * @param {string} eventId - UUID of the event
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>} - True if user has already checked in
 */
export async function hasCheckedIn(eventId, userId) {
  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('checkin_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // PGRST116 means no rows found (user hasn't checked in)
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('❌ Error checking for existing check-in:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('❌ Unexpected error checking for existing check-in:', err);
    return false;
  }
}

/**
 * Get check-in record for a user at an event
 * 
 * @param {string} eventId - UUID of the event
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - Check-in record or null
 */
export async function getCheckIn(eventId, userId) {
  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Error fetching check-in:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('❌ Unexpected error fetching check-in:', err);
    return null;
  }
}

export default {
  createCheckIn,
  postCheckInAnnouncement,
  hasCheckedIn,
  getCheckIn,
};
