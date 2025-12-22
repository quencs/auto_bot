# Discord API Contracts: Button Interactions

**Branch**: `001-event-checkin` | **Date**: 2025-12-22

This document defines the Discord button interactions for the Event Check-In/Check-Out System. Buttons use Discord's Message Components API.

---

## Button Component Structure

All event channels display a persistent message with action buttons:

```javascript
{
  "type": 1, // ACTION_ROW
  "components": [
    {
      "type": 2, // BUTTON
      "style": 1, // PRIMARY (blue)
      "label": "Check In",
      "custom_id": "checkin:{event_id}",
      "disabled": true // Enabled at start_time
    },
    {
      "type": 2, // BUTTON
      "style": 2, // SECONDARY (gray)
      "label": "Check Out",
      "custom_id": "checkout:{event_id}",
      "disabled": true // Enabled when event closed
    },
    {
      "type": 2, // BUTTON
      "style": 3, // SUCCESS (green)
      "label": "Export Data",
      "custom_id": "export:{event_id}",
      "disabled": false // Always enabled for admins (hidden via permissions)
    }
  ]
}
```

---

## 1. Check-In Button

**Custom ID Format**: `checkin:{event_id}`  
**Label**: "Check In"  
**Style**: Primary (blue)  
**Visibility**: All members  
**Enabled State**: Disabled until event start_time, then enabled until admin closes event

### Interaction Flow

1. User clicks "Check In" button
2. Bot validates:
   - Event is in 'active' status
   - User has not already checked in
   - Current time >= event.start_time
3. Bot records check-in:
   - Insert record to `checkins` table
   - Capture user_id, username, discriminator, timestamp
4. Bot posts announcement:
   - Public message in channel: "{username} checked in at {time}"
5. Bot responds to user:
   - Ephemeral success message

### Request Format

Discord sends button interaction:

```json
{
  "type": 3,
  "data": {
    "custom_id": "checkin:550e8400-e29b-41d4-a716-446655440000",
    "component_type": 2
  },
  "guild_id": "123456789",
  "channel_id": "987654321",
  "member": {
    "user": {
      "id": "555555555",
      "username": "john_doe",
      "discriminator": "1234"
    }
  }
}
```

### Response Examples

**Success**:

1. Immediate ephemeral reply to user:
```json
{
  "type": 4,
  "data": {
    "content": "✅ You have checked in successfully!",
    "flags": 64
  }
}
```

2. Public announcement message (separate API call):
```javascript
await channel.send({
  content: `🎉 **john_doe** checked in at ${new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'UTC'
  })} UTC`
});
```

**Error - Already Checked In**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ You have already checked in to this event.",
    "flags": 64
  }
}
```

**Error - Event Not Active**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ Check-in is not available yet. The event starts at {start_time}.",
    "flags": 64
  }
}
```

**Error - Event Closed**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ This event has been closed. Check-in is no longer available.",
    "flags": 64
  }
}
```

### Button State Management

Button state changes are performed by editing the original message:

```javascript
// Enable check-in button (at start_time)
await buttonMessage.edit({
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`checkin:${eventId}`)
        .setLabel('Check In')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(false), // ENABLED
      new ButtonBuilder()
        .setCustomId(`checkout:${eventId}`)
        .setLabel('Check Out')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true), // Still disabled
      new ButtonBuilder()
        .setCustomId(`export:${eventId}`)
        .setLabel('Export Data')
        .setStyle(ButtonStyle.Success)
        .setDisabled(false)
    )
  ]
});
```

---

## 2. Check-Out Button

**Custom ID Format**: `checkout:{event_id}`  
**Label**: "Check Out"  
**Style**: Secondary (gray)  
**Visibility**: All members  
**Enabled State**: Disabled until admin closes event, enabled for 15 minutes after closure

### Interaction Flow

1. User clicks "Check Out" button
2. Bot validates:
   - Event is in 'closed' status
   - User has not already checked out
   - Current time <= event.closed_at + 15 minutes
3. Bot records check-out:
   - Insert record to `checkouts` table
   - Capture user_id, timestamp
4. Bot responds to user:
   - Ephemeral success message (NO public announcement)

### Request Format

Discord sends button interaction:

```json
{
  "type": 3,
  "data": {
    "custom_id": "checkout:550e8400-e29b-41d4-a716-446655440000",
    "component_type": 2
  },
  "guild_id": "123456789",
  "channel_id": "987654321",
  "member": {
    "user": {
      "id": "555555555",
      "username": "john_doe",
      "discriminator": "1234"
    }
  }
}
```

### Response Examples

**Success**:
```json
{
  "type": 4,
  "data": {
    "content": "✅ You have checked out successfully. Thank you for attending!",
    "flags": 64
  }
}
```

**Error - Already Checked Out**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ You have already checked out from this event.",
    "flags": 64
  }
}
```

**Error - Event Not Closed**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ Check-out is not available yet. The event is still in progress.",
    "flags": 64
  }
}
```

**Error - Check-Out Window Expired**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ The 15-minute check-out window has expired. Contact an admin if you need assistance.",
    "flags": 64
  }
}
```

### Button State Management

```javascript
// Enable check-out button (when admin closes event)
await buttonMessage.edit({
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`checkin:${eventId}`)
        .setLabel('Check In')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true), // DISABLED
      new ButtonBuilder()
        .setCustomId(`checkout:${eventId}`)
        .setLabel('Check Out')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(false), // ENABLED
      new ButtonBuilder()
        .setCustomId(`export:${eventId}`)
        .setLabel('Export Data')
        .setStyle(ButtonStyle.Success)
        .setDisabled(false)
    )
  ]
});

// Disable check-out button (15 minutes after closure)
await buttonMessage.edit({
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`checkin:${eventId}`)
        .setLabel('Check In')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`checkout:${eventId}`)
        .setLabel('Check Out')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true), // DISABLED
      new ButtonBuilder()
        .setCustomId(`export:${eventId}`)
        .setLabel('Export Data')
        .setStyle(ButtonStyle.Success)
        .setDisabled(false)
    )
  ]
});
```

---

## 3. Export Data Button

**Custom ID Format**: `export:{event_id}`  
**Label**: "Export Data"  
**Style**: Success (green)  
**Visibility**: Admins only (permission-based)  
**Enabled State**: Always enabled

### Interaction Flow

1. Admin clicks "Export Data" button
2. Bot validates:
   - User has admin permissions
3. Bot queries database:
   - Join check-ins and check-outs by event_id and user_id
   - Generate CSV data
4. Bot creates file attachment:
   - CSV with headers: User ID, Username, Discriminator, Check-In Time, Check-Out Time
5. Bot responds with file:
   - Ephemeral message with CSV attachment

### Request Format

Discord sends button interaction:

```json
{
  "type": 3,
  "data": {
    "custom_id": "export:550e8400-e29b-41d4-a716-446655440000",
    "component_type": 2
  },
  "guild_id": "123456789",
  "channel_id": "987654321",
  "member": {
    "user": {
      "id": "777777777",
      "username": "admin_user",
      "discriminator": "5678"
    },
    "permissions": "8" // ADMINISTRATOR
  }
}
```

### Response Examples

**Success**:
```json
{
  "type": 4,
  "data": {
    "content": "📊 Event data exported successfully!",
    "files": [
      {
        "name": "weekly-meeting-2025-12-25.csv",
        "data": "base64_encoded_csv_data"
      }
    ],
    "flags": 64
  }
}
```

CSV file content:
```csv
User ID,Username,Discriminator,Check-In Time,Check-Out Time
555555555,john_doe,1234,2025-12-25T14:05:32Z,2025-12-25T16:32:15Z
666666666,jane_smith,5678,2025-12-25T14:12:45Z,2025-12-25T16:28:03Z
777777777,bob_jones,9012,2025-12-25T14:03:21Z,
```

**Error - No Permission**:
```json
{
  "type": 4,
  "data": {
    "content": "❌ You don't have permission to export event data. Only admins can export data.",
    "flags": 64
  }
}
```

**Error - No Data**:
```json
{
  "type": 4,
  "data": {
    "content": "⚠️ No check-in data available for this event yet.",
    "flags": 64
  }
}
```

---

## Button Lifecycle Summary

### Event Timeline

```
Event Created
    ↓
[All buttons disabled except Export (admins only)]
    ↓
Start Time Reached
    ↓
[Check-In ENABLED, Check-Out disabled]
    ↓
Admin Closes Event
    ↓
[Check-In DISABLED, Check-Out ENABLED]
    ↓
15 Minutes After Closure
    ↓
[Check-In disabled, Check-Out DISABLED]
    ↓
[Export always enabled for admins]
```

### Button States Table

| Event Status | Check-In Button | Check-Out Button | Export Button |
|--------------|----------------|------------------|---------------|
| pending (before start_time) | Disabled | Disabled | Enabled (admins) |
| active (after start_time) | **Enabled** | Disabled | Enabled (admins) |
| closed (admin closes) | Disabled | **Enabled** | Enabled (admins) |
| closed (>15 min) | Disabled | Disabled | Enabled (admins) |

---

## Implementation Notes

### Custom ID Parsing

```javascript
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  const [action, eventId] = interaction.customId.split(':');
  
  switch (action) {
    case 'checkin':
      await handleCheckIn(interaction, eventId);
      break;
    case 'checkout':
      await handleCheckOut(interaction, eventId);
      break;
    case 'export':
      await handleExport(interaction, eventId);
      break;
    default:
      console.error('Unknown button action:', action);
  }
});
```

### Interaction Timeout

Discord button interactions have a **3-second response window**. Bot must acknowledge within 3 seconds:

```javascript
async function handleCheckIn(interaction, eventId) {
  // Acknowledge immediately
  await interaction.deferReply({ ephemeral: true });
  
  // Perform database operations (can take >3 seconds)
  await recordCheckIn(eventId, interaction.user);
  
  // Edit deferred reply
  await interaction.editReply({
    content: '✅ You have checked in successfully!'
  });
}
```

### Error Recovery

If button click fails (database timeout, Discord API error):
1. Log error with full context
2. Respond with generic error message to user
3. Do NOT update button state (maintain consistency)
4. Admin can manually recover by re-running operation

---

## Testing Buttons

### Manual Testing

1. Create event with `/create-event`
2. Wait for start_time (or manually update database)
3. Click "Check In" → verify announcement posted
4. Click "Check In" again → verify duplicate error
5. Close event with `/close-event`
6. Click "Check Out" → verify silent (no announcement)
7. Click "Export Data" (as admin) → verify CSV downloaded

### Integration Tests

```javascript
// Mock button interaction
const mockInteraction = {
  isButton: () => true,
  customId: 'checkin:550e8400-e29b-41d4-a716-446655440000',
  user: { id: '123', username: 'testuser' },
  reply: jest.fn(),
  channel: { send: jest.fn() }
};

// Test check-in handler
await handleCheckIn(mockInteraction, '550e8400-e29b-41d4-a716-446655440000');

expect(mockInteraction.reply).toHaveBeenCalledWith(
  expect.objectContaining({
    content: expect.stringContaining('✅')
  })
);

expect(mockInteraction.channel.send).toHaveBeenCalledWith(
  expect.stringContaining('testuser checked in')
);
```

---

## Security Considerations

1. **Custom ID Validation**: Always parse and validate event_id from custom_id
2. **Permission Checks**: Verify admin permissions server-side for Export button
3. **Rate Limiting**: Discord enforces per-user rate limits (5 interactions per 5 seconds)
4. **Duplicate Prevention**: Database unique constraint prevents duplicate check-ins/check-outs
5. **State Validation**: Always check event status before processing button clicks
