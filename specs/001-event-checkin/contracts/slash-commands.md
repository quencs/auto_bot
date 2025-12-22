# Discord API Contracts: Slash Commands

**Branch**: `001-event-checkin` | **Date**: 2025-12-22

This document defines the Discord slash commands for the Event Check-In/Check-Out System. Commands follow Discord's Application Command API specification.

---

## 1. /create-event

**Description**: Create a new event with check-in/check-out tracking  
**Permission Required**: Admin (ADMINISTRATOR permission or ADMIN_ROLE_ID)  
**Scope**: Guild (server) command

### Command Definition

```json
{
  "name": "create-event",
  "description": "Create a new event with check-in/check-out tracking",
  "type": 1,
  "options": [
    {
      "name": "event-name",
      "description": "Name of the event (used for channel name)",
      "type": 3,
      "required": true,
      "min_length": 3,
      "max_length": 100
    },
    {
      "name": "start-time",
      "description": "When check-in becomes available (format: YYYY-MM-DD HH:MM in your timezone)",
      "type": 3,
      "required": true
    }
  ]
}
```

### Request Flow

1. User executes `/create-event event-name:"Weekly Meeting" start-time:"2025-12-25 14:00"`
2. Bot validates:
   - User has admin permissions
   - Event name is valid (3-100 chars)
   - Start time is parseable and in the future (>5 minutes)
3. Bot creates:
   - Discord text channel (in "Events" category)
   - Database event record (status='pending')
   - Button message in channel (check-in disabled, check-out disabled)
   - Timer to enable check-in button at start time
4. Bot responds with ephemeral confirmation message

### Response Examples

**Success**:
```json
{
  "type": 4,
  "data": {
    "content": "✅ Event **Weekly Meeting** created! Check-in will be enabled at 2025-12-25 14:00 UTC.\n\nChannel: <#1234567890>",
    "flags": 64
  }
}
```

**Error - Invalid Permissions**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ You don't have permission to create events. Only admins can create events.",
    "flags": 64
  }
}
```

**Error - Invalid Start Time**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ Start time must be at least 5 minutes in the future. Format: YYYY-MM-DD HH:MM",
    "flags": 64
  }
}
```

**Error - Event Name Already Exists**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ An event with this name already exists. Please choose a different name.",
    "flags": 64
  }
}
```

---

## 2. /close-event

**Description**: Manually close an event (disables check-in, enables check-out)  
**Permission Required**: Admin (ADMINISTRATOR permission or ADMIN_ROLE_ID)  
**Scope**: Guild (server) command

### Command Definition

```json
{
  "name": "close-event",
  "description": "Close the current event (enables check-out for 15 minutes)",
  "type": 1
}
```

### Request Flow

1. User executes `/close-event` in an event channel
2. Bot validates:
   - User has admin permissions
   - Command executed in an event channel
   - Event is in 'active' status (not already closed)
3. Bot updates:
   - Database event record (status='closed', closed_at=NOW())
   - Button message (disable check-in, enable check-out)
   - Schedule 15-minute timer to disable check-out
4. Bot responds with ephemeral confirmation message

### Response Examples

**Success**:
```json
{
  "type": 4,
  "data": {
    "content": "✅ Event closed! Check-out is now enabled for the next 15 minutes.",
    "flags": 64
  }
}
```

**Error - Not Event Channel**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ This command can only be used in event channels.",
    "flags": 64
  }
}
```

**Error - Event Not Active**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ This event is not active. It may already be closed or not started yet.",
    "flags": 64
  }
}
```

---

## 3. /event-status

**Description**: View current event status and statistics  
**Permission Required**: None (everyone can view)  
**Scope**: Guild (server) command

### Command Definition

```json
{
  "name": "event-status",
  "description": "View current event status and check-in statistics",
  "type": 1
}
```

### Request Flow

1. User executes `/event-status` in an event channel
2. Bot validates:
   - Command executed in an event channel
3. Bot queries:
   - Event details from database
   - Count of check-ins
   - Count of check-outs
4. Bot responds with ephemeral message showing statistics

### Response Examples

**Success (Active Event)**:
```json
{
  "type": 4,
  "data": {
    "embeds": [
      {
        "title": "📊 Weekly Meeting",
        "color": 5763719,
        "fields": [
          {
            "name": "Status",
            "value": "🟢 Active",
            "inline": true
          },
          {
            "name": "Started At",
            "value": "2025-12-25 14:00 UTC",
            "inline": true
          },
          {
            "name": "Check-Ins",
            "value": "23 members",
            "inline": true
          }
        ]
      }
    ],
    "flags": 64
  }
}
```

**Success (Closed Event)**:
```json
{
  "type": 4,
  "data": {
    "embeds": [
      {
        "title": "📊 Weekly Meeting",
        "color": 10038562,
        "fields": [
          {
            "name": "Status",
            "value": "🔴 Closed",
            "inline": true
          },
          {
            "name": "Closed At",
            "value": "2025-12-25 16:30 UTC",
            "inline": true
          },
          {
            "name": "Check-Ins",
            "value": "23 members",
            "inline": true
          },
          {
            "name": "Check-Outs",
            "value": "18 members",
            "inline": true
          },
          {
            "name": "Check-Out Window",
            "value": "Expires at 16:45 UTC (10 min remaining)",
            "inline": false
          }
        ]
      }
    ],
    "flags": 64
  }
}
```

---

## Command Registration

Commands must be registered with Discord API on bot startup:

```javascript
// commands.js
import { REST, Routes } from 'discord.js';

const commands = [
  {
    name: 'create-event',
    description: 'Create a new event with check-in/check-out tracking',
    options: [
      {
        name: 'event-name',
        description: 'Name of the event (used for channel name)',
        type: 3, // STRING
        required: true,
        min_length: 3,
        max_length: 100
      },
      {
        name: 'start-time',
        description: 'When check-in becomes available (format: YYYY-MM-DD HH:MM in your timezone)',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'close-event',
    description: 'Close the current event (enables check-out for 15 minutes)'
  },
  {
    name: 'event-status',
    description: 'View current event status and check-in statistics'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registering slash commands...');
  
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.GUILD_ID),
    { body: commands }
  );
  
  console.log('Successfully registered commands!');
} catch (error) {
  console.error('Error registering commands:', error);
}
```

---

## Error Handling

All commands follow consistent error response pattern:

1. **Permission Errors**: 
   - Status: ephemeral (flags: 64)
   - Message: User-friendly explanation of required permission
   - Log: User ID, command, timestamp

2. **Validation Errors**:
   - Status: ephemeral (flags: 64)
   - Message: Clear description of validation failure + expected format
   - Log: User ID, command, invalid input

3. **System Errors**:
   - Status: ephemeral (flags: 64)
   - Message: Generic "An error occurred, please try again"
   - Log: Full error stack trace, request context

---

## Rate Limiting

Discord enforces rate limits on slash commands:
- **Global**: 50 commands per second per bot
- **Per User**: 5 commands per 5 seconds per user

Bot implementation:
- No custom rate limiting needed (Discord handles it)
- Error responses for rate limit errors (HTTP 429)
- Exponential backoff for retries

---

## Testing Commands

### Manual Testing

```bash
# Register commands
npm run register

# Test in Discord
/create-event event-name:"Test Event" start-time:"2025-12-25 14:00"
/event-status
/close-event
```

### Integration Tests

```javascript
// Mock Discord interaction
const mockInteraction = {
  commandName: 'create-event',
  options: {
    getString: (name) => {
      if (name === 'event-name') return 'Test Event';
      if (name === 'start-time') return '2025-12-25 14:00';
    }
  },
  user: { id: '123456789', username: 'testuser' },
  guild: { id: '987654321' },
  reply: jest.fn()
};

// Test command handler
await handleCreateEvent(mockInteraction);

expect(mockInteraction.reply).toHaveBeenCalledWith(
  expect.objectContaining({
    content: expect.stringContaining('✅ Event')
  })
);
```

---

## Security Considerations

1. **Permission Checks**: Always validate admin permissions server-side (never trust client)
2. **Input Validation**: Sanitize all user inputs (event names, timestamps)
3. **SQL Injection**: Use parameterized queries (Supabase client handles this)
4. **Rate Limiting**: Respect Discord's rate limits (automatic with discord.js)
5. **Logging**: Log all admin actions (create event, close event) for audit trail
