# Discord Event Check-In/Check-Out Bot

A Discord bot that enables event check-in/check-out functionality for Discord servers. Admin users can create events with start times, members can check-in and check-out using buttons, and the system tracks attendance data in Supabase.

## Features

- 🎯 **Event Management**: Admins can create and close events with slash commands
- ✅ **Check-In System**: Members check-in with a button click, with announcements
- 🚪 **Check-Out Tracking**: Members can check-out to track event duration
- 📊 **Data Export**: Admins can export attendance data as CSV
- ⏰ **Automatic State Management**: Check-in enables at start time, check-out auto-disables after 15 minutes
- 🗄️ **Supabase Backend**: All data stored in PostgreSQL via Supabase

## Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v8.x or higher  
- **Discord Developer Account**: https://discord.com/developers/applications
- **Supabase Account**: https://supabase.com (free tier sufficient)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd discord-example-app
npm install
```

### 2. Discord Bot Setup

#### Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Event Check-In Bot"
4. Navigate to "Bot" section
5. Click "Add Bot"
6. **Copy the Bot Token** (you'll need this for .env)

#### Configure Bot Permissions
In the "Bot" section, enable these intents:
- ✅ **Message Content Intent** (required for message operations)
- ✅ **Server Members Intent** (required for user data)

#### Invite Bot to Server
1. Navigate to "OAuth2" → "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select permissions:
   - Manage Channels
   - Send Messages
   - Manage Messages
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it in your browser
5. Select your test server and authorize

### 3. Supabase Database Setup

#### Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Set project name: "discord-checkin-bot"
4. Choose a strong database password
5. Select your region
6. Wait ~2 minutes for initialization

#### Create Database Schema
1. Navigate to "SQL Editor" in Supabase dashboard
2. Click "New Query"
3. Copy the entire contents of `specs/001-event-checkin/database-schema.sql`
4. Paste into SQL Editor
5. Click "Run" to execute
6. Verify you see the success message

#### Get Supabase Credentials
1. Go to "Settings" → "API" in Supabase dashboard
2. Copy **Project URL** (starts with https://...supabase.co)
3. Copy **anon public** key (under "Project API keys")

### 4. Configure Environment Variables

1. Copy `.env.sample` to `.env`:
   ```bash
   cp .env.sample .env
   ```

2. Edit `.env` and fill in your credentials:
   ```env
   # Discord Bot Configuration
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_APP_ID=your_app_id_here
   PUBLIC_KEY=your_public_key_here
   
   # Supabase Configuration  
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_KEY=your_supabase_anon_key_here
   
   # Admin Configuration (Optional)
   ADMIN_ROLE_ID=your_admin_role_id_here
   ```

**Where to find these:**
- `DISCORD_TOKEN`: Bot section in Discord Developer Portal
- `DISCORD_APP_ID`: General Information page in Discord Developer Portal
- `PUBLIC_KEY`: General Information page in Discord Developer Portal
- `SUPABASE_URL`: Settings → API in Supabase dashboard
- `SUPABASE_KEY`: Settings → API in Supabase (anon public key)
- `ADMIN_ROLE_ID`: Right-click a role in Discord (Developer Mode required)

### 5. Register Slash Commands

```bash
npm run register
```

This registers the following commands:
- `/create-event` - Create a new event (admin only)
- `/close-event` - Close an active event (admin only)
- `/export-event` - Export attendance data (admin only)

### 6. Start the Bot

```bash
npm start
```

You should see: `Bot is ready!`

## Usage

### For Admins

#### Create an Event
```
/create-event name:"Team Meeting" start-time:"2025-12-25 14:00"
```
This creates a new event channel with check-in button (disabled until start time).

#### Close an Event
```
/close-event
```
Run this in the event channel when the event ends. This:
- Disables the check-in button
- Enables the check-out button for 15 minutes
- Auto-disables check-out after 15 minutes

#### Export Attendance Data
```
/export-event
```
Run this in the event channel to download a CSV file with all check-in/check-out data.

### For Members

#### Check In
1. Navigate to the event channel
2. Wait for the event start time
3. Click the "Check In" button
4. You'll see an announcement with your name and timestamp

#### Check Out
1. After the admin closes the event
2. Click the "Check Out" button within 15 minutes
3. Your check-out is recorded silently (no announcement)

## Project Structure

```
discord-example-app/
├── src/
│   ├── commands/          # Slash command handlers
│   │   ├── createEvent.js
│   │   ├── closeEvent.js
│   │   └── exportEvent.js
│   ├── handlers/          # Interaction handlers
│   │   ├── buttonHandler.js
│   │   └── eventScheduler.js
│   ├── services/          # Business logic
│   │   ├── eventService.js
│   │   ├── checkinService.js
│   │   ├── checkoutService.js
│   │   └── exportService.js
│   ├── database/          # Database connection
│   │   └── supabase.js
│   └── config/            # Configuration
│       └── permissions.js
├── specs/                 # Documentation
│   └── 001-event-checkin/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       └── database-schema.sql
├── app.js                 # Main bot entry point
├── commands.js            # Command registration
├── package.json
├── .env                   # Your credentials (not committed)
└── .env.sample            # Template
```

## Development

### Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: discord.js v14
- **Database**: Supabase (PostgreSQL)
- **Architecture**: Event-driven bot with Gateway API

### Running in Development
```bash
npm run dev
```

### Registering New Commands
After modifying commands:
```bash
npm run register
```

## Troubleshooting

### Bot doesn't respond to commands
- Verify bot token is correct in `.env`
- Check bot has proper permissions in server
- Ensure commands are registered: `npm run register`
- Check bot is online in Discord server

### Database errors
- Verify Supabase URL and key in `.env`
- Check database schema is created (run database-schema.sql)
- Ensure service role key is NOT used (use anon key)

### Check-in button doesn't enable
- Verify event start time is in the future
- Check eventScheduler is running (console logs)
- Ensure bot stayed online since event creation

### Check-out button doesn't disable after 15 minutes
- Verify bot remained online during the 15-minute window
- Check eventScheduler logs for timer execution

## Database Schema

The bot uses three tables in Supabase:

**events** - Stores event information
- event_id, event_name, channel_id, start_time, status, closed_at, created_at, created_by

**checkins** - Stores check-in records
- checkin_id, event_id, user_id, username, discriminator, timestamp

**checkouts** - Stores check-out records  
- checkout_id, event_id, user_id, timestamp

See `specs/001-event-checkin/database-schema.sql` for complete schema.

## Documentation

Comprehensive documentation is available in `specs/001-event-checkin/`:
- `spec.md` - Feature specification
- `plan.md` - Implementation plan
- `tasks.md` - Task breakdown
- `research.md` - Technical research
- `data-model.md` - Database design
- `quickstart.md` - Detailed setup guide

## Support

For issues or questions, please refer to:
- Discord.js documentation: https://discord.js.org
- Supabase documentation: https://supabase.com/docs
- Project specification: `specs/001-event-checkin/spec.md`

## License

[Your License Here]
