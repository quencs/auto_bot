# Research: Discord Event Check-In/Check-Out System

**Branch**: `001-event-checkin` | **Date**: 2025-12-22

## Research Overview

This document resolves all technical unknowns identified during implementation planning. Each section addresses a specific technology choice, integration pattern, or best practice needed for the Discord Event Check-In/Check-Out System.

---

## 1. Discord.js Library Selection

### Decision
Use **discord.js v14.x** (latest stable) with Gateway API for persistent bot connection

### Rationale
- **Gateway vs REST-only**: Gateway maintains WebSocket connection for real-time events (button clicks, message events) which is essential for interactive features
- **discord.js vs discord-interactions**: Current codebase uses `discord-interactions` (REST-only for slash commands). discord.js provides full Gateway support, message management, and channel operations
- **Migration path**: Existing `discord-interactions` can be replaced with discord.js's built-in interaction handling

### Alternatives Considered
- **discord-interactions (current)**: Limited to REST interactions, no real-time events, no channel management capabilities - insufficient for requirements
- **Eris**: Lighter alternative but smaller community, less documentation
- **Raw Discord API**: Too low-level, would require implementing all client features from scratch

### Implementation Requirements
- Install: `npm install discord.js@14`
- Remove: `discord-interactions` and `express` (no longer needed for webhook endpoint)
- Add Gateway intents: `GuildMessages`, `Guilds`, `GuildMembers` for channel/user operations

---

## 2. Supabase Integration Pattern

### Decision
Use **Supabase JavaScript client** with connection pooling and environment-based configuration

### Rationale
- **Client library**: `@supabase/supabase-js` provides TypeScript-first API with automatic connection management
- **Connection strategy**: Supabase client maintains HTTP connection pool (not persistent WebSocket), suitable for serverless and long-running processes
- **Authentication**: Anonymous key with Row-Level Security (RLS) policies for access control
- **Error handling**: Built-in retry logic with exponential backoff for transient failures

### Alternatives Considered
- **Direct PostgreSQL client (pg)**: Requires managing connection pooling, SSL certificates, and lacks Supabase's real-time features - more complex
- **Prisma ORM**: Adds abstraction layer and code generation step - unnecessary complexity for simple schema
- **TypeORM**: Heavy ORM with migrations - overkill for this use case

### Implementation Requirements
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Connection is managed automatically by the client
// No need for explicit connect/disconnect
```

### Best Practices
- Store credentials in `.env` file (never commit)
- Use try-catch for all database operations
- Log query execution times for monitoring
- Implement retry logic for transient errors (network timeouts)

---

## 3. Time-Based Automation Strategy

### Decision
Use **Node.js setTimeout with persistent state recovery** for check-in enable and check-out auto-disable timers

### Rationale
- **Scheduled task approach**: In-memory timers (setTimeout) for simplicity, backed by database state for recovery after restarts
- **Recovery mechanism**: On bot startup, query events in "active" state and reschedule pending timers (check-in enable, check-out auto-disable)
- **Precision**: setTimeout provides ±50ms accuracy, sufficient for user-facing features (spec allows ±30 seconds)

### Alternatives Considered
- **node-cron**: Cron-based scheduling - over-engineered for event-specific timers, requires maintaining cron expressions
- **Bull queue**: Redis-backed job queue - adds Redis dependency, unnecessary complexity for this scale
- **Supabase pg_cron**: Server-side cron - requires database function and webhook callback, increases architecture complexity

### Implementation Pattern
```javascript
// On event creation
const enableDelay = new Date(event.start_time) - Date.now();
const timerId = setTimeout(() => enableCheckInButton(event.channel_id), enableDelay);

// Store timer ID in memory map for cancellation
activeTimers.set(event.event_id, timerId);

// On bot startup - recovery
const activeEvents = await supabase
  .from('events')
  .select('*')
  .eq('status', 'active');

for (const event of activeEvents) {
  rescheduleTimers(event); // Re-create setTimeout based on current time
}
```

### Edge Cases Handled
- **Bot restart during event**: Timers recreated from database state on startup
- **Past start times**: If current time > start_time, enable check-in immediately
- **Clock skew**: Use server time for scheduling, store UTC timestamps in database

---

## 4. Button Interaction Implementation

### Decision
Use **Discord Message Components (Action Rows)** with persistent custom_id identifiers

### Rationale
- **Component type**: Buttons provide single-click interaction, better UX than slash commands for repetitive actions (check-in/check-out)
- **State management**: Buttons have 15-minute interaction token validity - sufficient for check-out window
- **Custom ID pattern**: Encode event context in custom_id (e.g., `checkin:${event_id}`) for stateless handling
- **Button states**: Use `disabled: true` property for visual feedback when buttons shouldn't be clicked

### Alternatives Considered
- **Slash commands**: Requires typing command for each check-in - poor UX for frequent actions
- **Reaction emojis**: Legacy pattern, harder to manage state (disabled/enabled)
- **Select menus**: Overkill for binary actions (check-in/check-out)

### Implementation Pattern
```javascript
// Create button message
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId(`checkin:${event_id}`)
      .setLabel('Check In')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true), // Disabled until start time
    new ButtonBuilder()
      .setCustomId(`checkout:${event_id}`)
      .setLabel('Check Out')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true) // Disabled until event closed
  );

// Handle button interaction
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  const [action, eventId] = interaction.customId.split(':');
  if (action === 'checkin') {
    await handleCheckIn(interaction, eventId);
  }
});
```

### Button State Management
- **Check-in button**: Disabled by default → Enable at start_time → Disable when admin closes event
- **Check-out button**: Disabled by default → Enable when admin closes event → Disable 15 minutes after closure
- **Edit message**: Use Discord API's `editMessage` to update button states without creating new messages

---

## 5. Admin Permission Model

### Decision
Use **Discord role-based permissions** with configurable admin role ID

### Rationale
- **Permission check**: Check if user has `ADMINISTRATOR` permission OR is member of configured admin role
- **Flexibility**: Server owners can assign admin role to event coordinators without full server admin rights
- **Configuration**: Store admin role ID in environment variable (ADMIN_ROLE_ID) - optional, falls back to ADMINISTRATOR permission

### Alternatives Considered
- **Server owner only**: Too restrictive - doesn't scale for large servers with event teams
- **Channel permissions**: Complex to manage per-channel - role-based is simpler
- **Database whitelist**: Requires admin UI to manage - adds unnecessary feature scope

### Implementation Pattern
```javascript
function isAdmin(member) {
  // Check server administrator permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }
  
  // Check configured admin role
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  if (adminRoleId && member.roles.cache.has(adminRoleId)) {
    return true;
  }
  
  return false;
}
```

---

## 6. Export Data Format

### Decision
Use **CSV format** generated in-memory and sent as Discord attachment

### Rationale
- **Format**: CSV is universally readable in spreadsheet applications (Excel, Google Sheets, LibreOffice)
- **Delivery**: Discord supports file attachments up to 8MB (sufficient for thousands of records)
- **Generation**: Node.js built-in string manipulation for CSV (no external library needed)
- **Alternative**: JSON export as secondary format (provide both via button selection)

### Alternatives Considered
- **JSON only**: Less user-friendly for non-technical admins
- **Google Sheets API**: Adds external dependency and OAuth complexity
- **Excel (XLSX)**: Requires library (ExcelJS) - adds dependency, CSV sufficient

### Implementation Pattern
```javascript
async function exportEventData(eventId) {
  // Query check-ins and check-outs
  const { data: checkIns } = await supabase
    .from('checkins')
    .select('*')
    .eq('event_id', eventId);
  
  const { data: checkOuts } = await supabase
    .from('checkouts')
    .select('*')
    .eq('event_id', eventId);
  
  // Merge by user_id
  const userMap = new Map();
  checkIns.forEach(ci => {
    userMap.set(ci.user_id, { ...ci, checkout_time: null });
  });
  checkOuts.forEach(co => {
    const user = userMap.get(co.user_id) || { user_id: co.user_id };
    user.checkout_time = co.timestamp;
    userMap.set(co.user_id, user);
  });
  
  // Generate CSV
  const csv = [
    'User ID,Username,Discriminator,Check-In Time,Check-Out Time',
    ...Array.from(userMap.values()).map(u => 
      `${u.user_id},${u.username},${u.discriminator || ''},${u.timestamp || ''},${u.checkout_time || ''}`
    )
  ].join('\n');
  
  // Send as attachment
  const attachment = new AttachmentBuilder(Buffer.from(csv), {
    name: `event-${eventId}-export.csv`
  });
  
  return attachment;
}
```

---

## 7. Channel Management Strategy

### Decision
Create **dedicated text channels** for each event in a designated category

### Rationale
- **Isolation**: Each event has its own channel prevents confusion and cross-contamination
- **Organization**: Create "Events" category on first event creation, subsequent events use same category
- **Permissions**: Set channel permissions to allow everyone to view/read, but limit channel management to admins
- **Naming**: Channel names use event name slugified (e.g., "weekly-team-meeting")

### Alternatives Considered
- **Single shared channel**: Would mix multiple events - violates Constitution Principle I (Event-Driven Architecture)
- **Threads**: Discord threads are ephemeral and auto-archive - not suitable for permanent event records
- **DM groups**: Can't create DM groups with many users - doesn't scale

### Implementation Pattern
```javascript
async function createEventChannel(guild, eventName) {
  // Find or create Events category
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === 'Events'
  );
  
  if (!category) {
    category = await guild.channels.create({
      name: 'Events',
      type: ChannelType.GuildCategory
    });
  }
  
  // Create event channel
  const channel = await guild.channels.create({
    name: eventName.toLowerCase().replace(/\s+/g, '-'),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Event: ${eventName}`
  });
  
  return channel;
}
```

---

## 8. Error Handling Strategy

### Decision
Implement **tiered error handling** with user-friendly messages and detailed logging

### Rationale
- **User errors**: Permission denied, invalid input → Reply with helpful message and actionable guidance
- **System errors**: Database timeout, Discord API error → Reply with generic message, log full details for debugging
- **Retry logic**: Transient failures (network timeout) → Automatic retry with exponential backoff
- **Graceful degradation**: If check-in announcement fails, still record check-in (data integrity priority)

### Implementation Pattern
```javascript
async function handleCheckIn(interaction, eventId) {
  try {
    // Record check-in in database
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        event_id: eventId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator,
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      // Check for duplicate key error (user already checked in)
      if (error.code === '23505') {
        return interaction.reply({
          content: '❌ You have already checked in to this event.',
          ephemeral: true
        });
      }
      throw error; // Other database errors
    }
    
    // Acknowledge interaction immediately
    await interaction.reply({
      content: '✅ Checked in successfully!',
      ephemeral: true
    });
    
    // Post announcement (non-blocking)
    try {
      await interaction.channel.send(
        `🎉 ${interaction.user.username} checked in at ${new Date().toLocaleTimeString()}`
      );
    } catch (announceError) {
      // Log but don't fail check-in
      console.error('Failed to post check-in announcement:', announceError);
    }
    
  } catch (error) {
    console.error('Check-in error:', {
      eventId,
      userId: interaction.user.id,
      error: error.message,
      stack: error.stack
    });
    
    await interaction.reply({
      content: '❌ An error occurred. Please try again or contact an admin.',
      ephemeral: true
    });
  }
}
```

### Error Logging
- Use structured logging (JSON format) for queryability
- Include context: user ID, event ID, timestamp, error message, stack trace
- Log to console (captured by hosting platform logs)

---

## 9. Testing Strategy

### Decision
Use **Jest** for unit and integration tests with mocked dependencies

### Rationale
- **Framework**: Jest provides mocking, assertions, and async test support out of the box
- **Mock Discord.js**: Use jest.mock() to mock Discord client and interactions
- **Mock Supabase**: Mock Supabase client responses to test business logic without database
- **Integration tests**: Test critical paths (check-in flow, event lifecycle) with mocked external dependencies

### Test Structure
```
tests/
├── unit/
│   ├── permissions.test.js      # Admin permission checks
│   ├── csv-export.test.js       # CSV generation logic
│   └── timer-recovery.test.js   # Timer rescheduling
├── integration/
│   ├── checkin-flow.test.js     # Full check-in sequence
│   ├── event-lifecycle.test.js  # Create → Start → Close → Auto-disable
│   └── error-handling.test.js   # Database failures, Discord API errors
└── setup.js                      # Test configuration
```

### Coverage Goals
- Unit tests: 80%+ coverage for business logic
- Integration tests: Cover all user stories (FR-001 to FR-027)
- Edge cases: Concurrent check-ins, bot restart scenarios

---

## 10. Deployment Configuration

### Decision
Use **PM2** for process management with graceful shutdown handling

### Rationale
- **Process manager**: PM2 provides automatic restart, log management, and graceful shutdown
- **Graceful shutdown**: On SIGTERM/SIGINT, close database connections and cancel active timers before exit
- **Environment**: Use .env file for configuration (development) and environment variables (production)
- **Monitoring**: PM2 provides built-in monitoring (CPU, memory, logs)

### Configuration
```javascript
// ecosystem.config.js (PM2 config)
module.exports = {
  apps: [{
    name: 'discord-checkin-bot',
    script: './src/index.js',
    instances: 1, // Single instance (Discord Gateway requires one connection)
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Cancel all active timers
  for (const [eventId, timerId] of activeTimers.entries()) {
    clearTimeout(timerId);
  }
  
  // Close Discord client
  await client.destroy();
  
  // Supabase client closes automatically
  process.exit(0);
});
```

### Alternatives Considered
- **Docker + systemd**: More complex setup, overkill for single-process bot
- **Nodemon (current)**: Development-only, no production features (monitoring, restart)
- **Forever**: Less feature-rich than PM2, no monitoring dashboard

---

## Summary of Technical Decisions

| Area | Technology | Key Benefit |
|------|------------|-------------|
| Discord Library | discord.js v14 | Full Gateway support, channel management |
| Database | Supabase (@supabase/supabase-js) | Managed PostgreSQL, built-in connection pooling |
| Time-based Tasks | setTimeout + DB recovery | Simple, no external scheduler dependency |
| Buttons | Discord Message Components | Single-click UX, visual state (disabled/enabled) |
| Permissions | Discord roles + ADMINISTRATOR | Flexible admin assignment |
| Export Format | CSV as attachment | Universal spreadsheet compatibility |
| Channel Strategy | Dedicated text channel per event | Event isolation, clean organization |
| Error Handling | Tiered (user/system) + retry | User-friendly + robust debugging |
| Testing | Jest with mocks | No external dependencies for tests |
| Deployment | PM2 process manager | Auto-restart, graceful shutdown, monitoring |

All NEEDS CLARIFICATION items from Technical Context have been resolved. Proceeding to Phase 1: Design & Contracts.
