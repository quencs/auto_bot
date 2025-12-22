import 'dotenv/config';
import { REST, Routes } from 'discord.js';

// Slash command definitions for Discord Event Check-In system
const commands = [
  {
    name: 'create-event',
    description: 'Create a new event with check-in tracking (Admin only)',
    options: [
      {
        type: 3, // STRING type
        name: 'name',
        description: 'Event name (e.g., "Team Meeting")',
        required: true,
      },
      {
        type: 3, // STRING type
        name: 'start-time',
        description: 'Event start time (e.g., "2025-12-25 14:00")',
        required: true,
      },
    ],
  },
  {
    name: 'close-event',
    description: 'Close the current event and enable check-out (Admin only)',
  },
  {
    name: 'export-event',
    description: 'Export attendance data as CSV (Admin only)',
  },
];

// Register commands with Discord API
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Started registering application (/) commands...\n');
    
    // Register commands globally
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APP_ID),
      { body: commands },
    );
    
    console.log('✅ Successfully registered application commands!\n');
    console.log('📋 Registered commands:');
    commands.forEach(cmd => {
      console.log(`   • /${cmd.name} - ${cmd.description}`);
    });
    console.log('\n💡 Commands may take up to 1 hour to appear globally.');
    console.log('💡 For instant testing, use guild-specific registration instead.\n');
    
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    process.exit(1);
  }
})();
