import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Simple ping command
const PING_COMMAND = {
  name: 'ping',
  description: 'Responds with Pong!',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Ticket system command (admin only)
const TICKET_COMMAND = {
  name: 'ticket',
  description: 'Gestion du système de tickets',
  type: 1,
  integration_types: [0],
  contexts: [0],
  default_member_permissions: String(0x8), // ADMINISTRATOR
  options: [
    {
      name: 'setup',
      description: 'Poster le panneau de tickets dans ce channel',
      type: 1,
    },
  ],
};

export const ALL_COMMANDS = [PING_COMMAND, TICKET_COMMAND];

// When run directly, register commands with Discord
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule || process.argv[1]?.includes('commands')) {
  InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
}
