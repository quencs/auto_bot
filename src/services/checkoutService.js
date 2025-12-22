import { supabase } from '../database/supabase.js';

/**
 * Check-Out Service
 * 
 * Handles check-out logic for event attendance tracking.
 * Features:
 * - Record user check-outs to Supabase database
 * - Prevent duplicate check-outs per user per event
 * - Validate event status and 15-minute window
 * - No announcement messages (per FR-010)
 */

/**
 * Create a check-out record in the database
 * 
 * @param {string} eventId - UUID of the event
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} - Check-out record or error
 */
export async function createCheckOut(eventId, userId) {
  try {
    console.log(`📝 Creating check-out for user ${userId} at event ${eventId}`);
    
    // Insert check-out record
    const { data, error } = await supabase
      .from('checkouts')
      .insert({
        event_id: eventId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      // Check for duplicate check-out (unique constraint violation)
      if (error.code === '23505') {
        console.log(`⚠️ Duplicate check-out attempt by user ${userId}`);
        return {
          success: false,
          error: 'duplicate',
          message: 'You have already checked out from this event!',
        };
      }
      
      console.error('❌ Database error creating check-out:', error);
      return {
        success: false,
        error: 'database',
        message: 'Failed to record check-out. Please try again.',
      };
    }
    
    console.log(`✅ Check-out created successfully: ${data.checkout_id}`);
    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error('❌ Unexpected error creating check-out:', err);
    return {
      success: false,
      error: 'unexpected',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Check if user has already checked out from an event
 * 
 * @param {string} eventId - UUID of the event
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>} - True if user has already checked out
 */
export async function hasCheckedOut(eventId, userId) {
  try {
    const { data, error } = await supabase
      .from('checkouts')
      .select('checkout_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // PGRST116 means no rows found (user hasn't checked out)
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('❌ Error checking for existing check-out:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('❌ Unexpected error checking for existing check-out:', err);
    return false;
  }
}

/**
 * Get check-out record for a user at an event
 * 
 * @param {string} eventId - UUID of the event
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} - Check-out record or null
 */
export async function getCheckOut(eventId, userId) {
  try {
    const { data, error } = await supabase
      .from('checkouts')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Error fetching check-out:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('❌ Unexpected error fetching check-out:', err);
    return null;
  }
}

/**
 * Check if check-out window is still open (within 15 minutes of event closure)
 * 
 * @param {Object} event - Event object from database
 * @returns {boolean} - True if check-out is still available
 */
export function isCheckOutWindowOpen(event) {
  if (!event || !event.closed_at) {
    return false;
  }
  
  const closedAt = new Date(event.closed_at);
  const now = new Date();
  const fifteenMinutesInMs = 15 * 60 * 1000;
  
  return (now - closedAt) <= fifteenMinutesInMs;
}

export default {
  createCheckOut,
  hasCheckedOut,
  getCheckOut,
  isCheckOutWindowOpen,
};
