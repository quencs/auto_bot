import { supabase } from '../database/supabase.js';

/**
 * Event Service
 * 
 * Handles event CRUD operations and state management.
 * Features:
 * - Create events in database
 * - Close/end events
 * - Query events by channel ID
 * - Update event status
 */

/**
 * Create a new event in the database
 * 
 * @param {Object} eventData - Event data
 * @param {string} eventData.eventName - Name of the event
 * @param {string} eventData.channelId - Discord channel ID
 * @param {string} eventData.startTime - ISO timestamp for event start
 * @param {string} eventData.createdBy - Discord user ID of creator
 * @returns {Promise<Object>} - Created event or error
 */
export async function createEvent(eventData) {
  try {
    const { eventName, channelId, startTime, createdBy } = eventData;
    
    console.log(`📝 Creating event "${eventName}" in channel ${channelId}`);
    
    // Insert event record with status 'pending'
    const { data, error } = await supabase
      .from('events')
      .insert({
        event_name: eventName,
        channel_id: channelId,
        start_time: startTime,
        status: 'pending', // Will become 'active' at start time
        created_by: createdBy,
      })
      .select()
      .single();
    
    if (error) {
      // Check for duplicate channel ID
      if (error.code === '23505') {
        console.log(`⚠️ Event already exists in channel ${channelId}`);
        return {
          success: false,
          error: 'duplicate',
          message: 'An event already exists in this channel.',
        };
      }
      
      console.error('❌ Database error creating event:', error);
      return {
        success: false,
        error: 'database',
        message: 'Failed to create event. Please try again.',
      };
    }
    
    console.log(`✅ Event created successfully: ${data.event_id}`);
    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error('❌ Unexpected error creating event:', err);
    return {
      success: false,
      error: 'unexpected',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Close an event (admin manually ends the event)
 * 
 * @param {string} eventId - UUID of the event
 * @returns {Promise<Object>} - Updated event or error
 */
export async function closeEvent(eventId) {
  try {
    console.log(`🚪 Closing event ${eventId}`);
    
    // Update event status to 'closed' and set closed_at timestamp
    const { data, error } = await supabase
      .from('events')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error closing event:', error);
      return {
        success: false,
        error: 'database',
        message: 'Failed to close event. Please try again.',
      };
    }
    
    console.log(`✅ Event closed successfully: ${eventId}`);
    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error('❌ Unexpected error closing event:', err);
    return {
      success: false,
      error: 'unexpected',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get event by channel ID
 * 
 * @param {string} channelId - Discord channel ID
 * @returns {Promise<Object|null>} - Event data or null
 */
export async function getEventByChannelId(channelId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('channel_id', channelId)
      .single();
    
    if (error) {
      // PGRST116 means no rows found
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Error fetching event:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('❌ Unexpected error fetching event:', err);
    return null;
  }
}

/**
 * Update event status
 * 
 * @param {string} eventId - UUID of the event
 * @param {string} status - New status ('pending', 'active', 'closed')
 * @returns {Promise<boolean>} - True if successful
 */
export async function updateEventStatus(eventId, status) {
  try {
    console.log(`🔄 Updating event ${eventId} status to ${status}`);
    
    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('event_id', eventId);
    
    if (error) {
      console.error('❌ Error updating event status:', error);
      return false;
    }
    
    console.log(`✅ Event status updated to ${status}`);
    return true;
  } catch (err) {
    console.error('❌ Unexpected error updating event status:', err);
    return false;
  }
}

/**
 * Get all events that need status updates (for scheduler)
 * 
 * @returns {Promise<Array>} - Array of events needing updates
 */
export async function getEventsNeedingUpdates() {
  try {
    const now = new Date().toISOString();
    
    // Get pending events that should be active (start time passed)
    const { data: pendingEvents, error: pendingError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'pending')
      .lt('start_time', now);
    
    if (pendingError) {
      console.error('❌ Error fetching pending events:', pendingError);
      return [];
    }
    
    return pendingEvents || [];
  } catch (err) {
    console.error('❌ Unexpected error fetching events:', err);
    return [];
  }
}

/**
 * Get events that need check-out auto-disable (closed over 15 minutes ago)
 * 
 * @returns {Promise<Array>} - Array of events to process
 */
export async function getEventsForCheckoutDisable() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'closed')
      .not('closed_at', 'is', null)
      .lt('closed_at', fifteenMinutesAgo);
    
    if (error) {
      console.error('❌ Error fetching events for checkout disable:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('❌ Unexpected error fetching events:', err);
    return [];
  }
}

export default {
  createEvent,
  closeEvent,
  getEventByChannelId,
  updateEventStatus,
  getEventsNeedingUpdates,
  getEventsForCheckoutDisable,
};
