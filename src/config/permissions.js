import 'dotenv/config';

/**
 * Admin Permission Checker
 * 
 * Determines if a Discord user has admin permissions for the bot.
 * Admin permissions are granted to:
 * 1. Server owner (always has admin access)
 * 2. Users with the configured ADMIN_ROLE_ID role (if set in .env)
 */

const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

/**
 * Check if a user has admin permissions
 * 
 * @param {Object} interaction - Discord interaction object
 * @returns {boolean} - True if user has admin permissions
 */
export function isAdmin(interaction) {
  const { member, guild } = interaction;
  
  if (!member || !guild) {
    console.warn('⚠️ Cannot check admin permissions: missing member or guild');
    return false;
  }
  
  // Check 1: Is user the server owner?
  if (member.id === guild.ownerId) {
    console.log(`✅ User ${member.user.tag} is server owner - admin access granted`);
    return true;
  }
  
  // Check 2: Does user have the admin role (if configured)?
  if (ADMIN_ROLE_ID) {
    const hasAdminRole = member.roles.cache.has(ADMIN_ROLE_ID);
    if (hasAdminRole) {
      console.log(`✅ User ${member.user.tag} has admin role - admin access granted`);
      return true;
    }
  } else {
    console.log('ℹ️ ADMIN_ROLE_ID not configured - only server owner has admin access');
  }
  
  // User does not have admin permissions
  console.log(`❌ User ${member.user.tag} does not have admin permissions`);
  return false;
}

/**
 * Create an ephemeral error response for non-admin users
 * 
 * @returns {Object} - Discord interaction response object
 */
export function createAdminOnlyResponse() {
  return {
    content: '❌ This command requires admin permissions. Only server owners or users with the admin role can use this command.',
    flags: 64, // EPHEMERAL flag - only visible to the user
  };
}

/**
 * Get admin role configuration info
 * 
 * @returns {Object} - Admin role configuration
 */
export function getAdminConfig() {
  return {
    hasAdminRole: !!ADMIN_ROLE_ID,
    adminRoleId: ADMIN_ROLE_ID || null,
    description: ADMIN_ROLE_ID 
      ? `Admin role configured: ${ADMIN_ROLE_ID}`
      : 'No admin role configured - only server owner has admin access',
  };
}

export default {
  isAdmin,
  createAdminOnlyResponse,
  getAdminConfig,
};
