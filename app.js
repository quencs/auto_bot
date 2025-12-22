import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { testConnection } from './src/database/supabase.js';
import { handleButtonInteraction } from './src/handlers/buttonHandler.js';
import { startEventScheduler } from './src/handlers/eventScheduler.js';
import { handleCreateEventCommand } from './src/commands/createEvent.js';
import { handleCloseEventCommand } from './src/commands/closeEvent.js';
import { handleExportEventCommand } from './src/commands/exportEvent.js';

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          // Required for guild/server operations
    GatewayIntentBits.GuildMessages,   // Required for message operations
    GatewayIntentBits.GuildMembers,    // Required for member data
  ],
});

// Bot ready event
client.once('ready', async () => {
  console.log('🤖 Bot is ready!');
  console.log(`📝 Logged in as ${client.user.tag}`);
  console.log(`🔗 Connected to ${client.guilds.cache.size} server(s)`);
  
  // Test database connection
  console.log('\n🗄️  Testing database connection...');
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('⚠️  WARNING: Database connection failed. Check your SUPABASE_URL and SUPABASE_KEY in .env');
  }
  
  // Start event scheduler
  console.log('\n⏰ Starting event scheduler...');
  startEventScheduler(client);
  
  console.log('\n✅ Bot initialization complete!');
  console.log('📋 Waiting for interactions...\n');
});

// Handle interaction create (slash commands and buttons)
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      
      console.log(`📢 Received command: /${commandName} from ${interaction.user.tag}`);
      
      // Route to command handlers
      switch (commandName) {
        case 'create-event':
          await handleCreateEventCommand(interaction);
          break;
          
        case 'close-event':
          await handleCloseEventCommand(interaction);
          break;
          
        case 'export-event':
          await handleExportEventCommand(interaction);
          break;
          
        default:
          await interaction.reply({
            content: `❌ Unknown command: ${commandName}`,
            ephemeral: true,
          });
      }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
    
    // Try to respond with error message
    try {
      const errorMessage = {
        content: '❌ An error occurred while processing your request. Please try again.',
        ephemeral: true,
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch (followUpError) {
      console.error('❌ Failed to send error message:', followUpError);
    }
  }
});

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

// Handle warnings
client.on('warn', (warning) => {
  console.warn('⚠️  Discord client warning:', warning);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ ERROR: DISCORD_TOKEN is not set in .env file');
  process.exit(1);
}

console.log('🚀 Starting Discord bot...\n');
client.login(token).catch((error) => {
  console.error('❌ Failed to login to Discord:', error);
  process.exit(1);
});

// Export client for use in other modules
export default client;
