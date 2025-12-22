# Quickstart Guide: Discord Event Check-In/Check-Out System

**Branch**: `001-event-checkin` | **Date**: 2025-12-22

This guide provides step-by-step instructions for developers to set up, run, and test the Discord Event Check-In/Check-Out System.

---

## Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v8.x or higher
- **Discord Developer Account**: https://discord.com/developers/applications
- **Supabase Account**: https://supabase.com (free tier sufficient)
- **Git**: For cloning repository

---

## Step 1: Discord Bot Setup

### 1.1 Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name: "Event Check-In Bot"
4. Navigate to "Bot" section
5. Click "Add Bot"
6. **Save Bot Token** (needed for .env file)

### 1.2 Configure Bot Permissions

In the "Bot" section:
- Enable "Message Content Intent" (required for message operations)
- Enable "Server Members Intent" (required for user data)

Required Bot Permissions (numeric value: 268446736):
- ✅ Manage Channels
- ✅ Send Messages
- ✅ Manage Messages
- ✅ Read Message History
- ✅ Use Slash Commands

### 1.3 Invite Bot to Test Server

1. Navigate to "OAuth2" → "URL Generator"
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select permissions (above list)
4. Copy generated URL
5. Open URL in browser and invite to your test Discord server

---

## Step 2: Supabase Database Setup

### 2.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Project name: "discord-checkin-bot"
4. Database password: (generate strong password)
5. Region: Choose closest to your location
6. Wait for project to initialize (~2 minutes)

### 2.2 Create Database Schema

1. Navigate to "SQL Editor" in Supabase dashboard
2. Click "New Query"
3. Copy and paste the following schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  start_time TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  CONSTRAINT chk_status CHECK (status IN ('pending', 'active', 'closed'))
);

CREATE INDEX idx_events_channel_id ON events(channel_id);
CREATE INDEX idx_events_status ON events(status);

-- Check-ins table
CREATE TABLE checkins (
  checkin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  discriminator TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_event_id ON checkins(event_id);
CREATE INDEX idx_checkins_user_id ON checkins(user_id);
CREATE UNIQUE INDEX idx_checkins_event_user ON checkins(event_id, user_id);

-- Check-outs table
CREATE TABLE checkouts (
  checkout_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkouts_event_id ON checkouts(event_id);
CREATE INDEX idx_checkouts_user_id ON checkouts(user_id);
CREATE UNIQUE INDEX idx_checkouts_event_user ON checkouts(event_id, user_id);
```

4. Click "Run" to execute schema creation
5. Verify tables created in "Table Editor"

### 2.3 Get API Credentials

1. Navigate to "Settings" → "API"
2. Copy the following values:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **Project API Key (anon public)**: `eyJ...` (long JWT token)
3. **Save these for .env file**

---

## Step 3: Project Setup

### 3.1 Clone Repository

```bash
cd /path/to/your/projects
git clone https://github.com/your-repo/discord-example-app.git
cd discord-example-app
git checkout 001-event-checkin
```

### 3.2 Install Dependencies

```bash
npm install
```

This installs:
- `discord.js@14.x` - Discord bot library
- `@supabase/supabase-js@2.x` - Supabase client
- `dotenv@16.x` - Environment variable management
- `jest@29.x` (dev) - Testing framework

### 3.3 Configure Environment Variables

Create `.env` file in project root:

```bash
# Copy template
cp .env.sample .env
```

Edit `.env` with your credentials:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_APP_ID=your_discord_application_id_here
DISCORD_PUBLIC_KEY=your_discord_public_key_here

# Discord Server (for testing)
GUILD_ID=your_test_server_id_here

# Admin Role (optional - if not set, only server owner has admin)
ADMIN_ROLE_ID=your_admin_role_id_here

# Supabase Database Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Environment
NODE_ENV=development
```

**Finding Discord IDs**:
1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click server name → Copy Server ID (GUILD_ID)
3. Right-click role → Copy Role ID (ADMIN_ROLE_ID)
4. Application ID found in Discord Developer Portal → "General Information"

---

## Step 4: Register Slash Commands

Before running the bot, register slash commands with Discord:

```bash
npm run register
```

**Expected Output**:
```
Registering slash commands...
Successfully registered 3 commands:
- /create-event
- /close-event
- /event-status
```

**Note**: Commands take ~1 hour to appear globally. For instant testing, use guild commands (already configured in code).

---

## Step 5: Run the Bot

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

**Expected Output**:
```
[2025-12-22 10:30:00] Bot starting...
[2025-12-22 10:30:01] Connected to Supabase: https://obcwyxboxypsbqjnyapc.supabase.co
[2025-12-22 10:30:02] Logged in as Event Check-In Bot#1234
[2025-12-22 10:30:02] Recovering active events...
[2025-12-22 10:30:03] Recovered 0 active events
[2025-12-22 10:30:03] Bot ready! Listening for interactions...
```

---

## Step 6: Test Basic Functionality

### 6.1 Create Test Event

In your Discord test server:

```
/create-event event-name:"Test Event" start-time:"2025-12-22 15:00"
```

**Expected Result**:
- ✅ New channel created: `#test-event`
- ✅ Bot posts message with buttons (Check In disabled, Check Out disabled)
- ✅ Ephemeral confirmation message to you

### 6.2 Manually Enable Check-In (for testing)

**Option A**: Wait until start time (buttons auto-enable)

**Option B**: Manually update database to trigger immediately:

```sql
-- In Supabase SQL Editor
UPDATE events 
SET status = 'active', start_time = NOW() 
WHERE event_name = 'Test Event';
```

Then restart bot to trigger button update.

### 6.3 Test Check-In

1. Click "Check In" button in `#test-event` channel
2. **Expected Results**:
   - ✅ Ephemeral message: "You have checked in successfully!"
   - ✅ Public announcement: "🎉 YourUsername checked in at 15:05:32 UTC"
   - ✅ Database record created (verify in Supabase Table Editor)

3. Click "Check In" again
4. **Expected Result**:
   - ❌ Error: "You have already checked in to this event."

### 6.4 Test Close Event

```
/close-event
```

**Expected Results**:
- ✅ Ephemeral confirmation: "Event closed! Check-out enabled for 15 minutes"
- ✅ Check-In button disabled
- ✅ Check-Out button enabled

### 6.5 Test Check-Out

1. Click "Check Out" button
2. **Expected Results**:
   - ✅ Ephemeral message: "You have checked out successfully. Thank you for attending!"
   - ✅ No public announcement (silent check-out)
   - ✅ Database record created

### 6.6 Test Export Data

1. Click "Export Data" button (admin only)
2. **Expected Result**:
   - ✅ CSV file downloaded: `test-event-2025-12-22.csv`
   - ✅ File contains: User ID, Username, Check-In Time, Check-Out Time

**Sample CSV**:
```csv
User ID,Username,Discriminator,Check-In Time,Check-Out Time
123456789,YourUsername,1234,2025-12-22T15:05:32Z,2025-12-22T16:30:15Z
```

---

## Step 7: Verify Database Records

### 7.1 Check Events Table

In Supabase dashboard → "Table Editor" → "events":

| event_id | event_name | channel_id | status | start_time | closed_at |
|----------|------------|------------|--------|------------|-----------|
| uuid... | Test Event | 123... | closed | 2025-12-22 15:00 | 2025-12-22 16:30 |

### 7.2 Check Check-Ins Table

"Table Editor" → "checkins":

| checkin_id | event_id | user_id | username | timestamp |
|------------|----------|---------|----------|-----------|
| uuid... | uuid... | 123... | YourUsername | 2025-12-22 15:05:32 |

### 7.3 Check Check-Outs Table

"Table Editor" → "checkouts":

| checkout_id | event_id | user_id | timestamp |
|-------------|----------|---------|-----------|
| uuid... | uuid... | 123... | 2025-12-22 16:30:15 |

---

## Step 8: Run Tests

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

**Expected Coverage**:
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

---

## Common Issues & Solutions

### Issue 1: Bot Not Responding to Commands

**Symptoms**: Slash commands don't appear or show "Application did not respond"

**Solutions**:
1. Verify bot is online: Check console for "Bot ready!" message
2. Re-run command registration: `npm run register`
3. Wait up to 1 hour for global commands (or use guild commands)
4. Check bot has "applications.commands" scope in invite URL

### Issue 2: Database Connection Failed

**Symptoms**: Error "Could not connect to Supabase"

**Solutions**:
1. Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
2. Check Supabase project is active (not paused)
3. Verify network connectivity to Supabase
4. Check Supabase dashboard for API rate limits

### Issue 3: Permission Denied Errors

**Symptoms**: Bot cannot create channels or post messages

**Solutions**:
1. Verify bot has required permissions (Manage Channels, Send Messages)
2. Check bot role is higher than channel permissions
3. Re-invite bot with correct permission integer: 268446736

### Issue 4: Buttons Not Updating

**Symptoms**: Buttons remain disabled after start time

**Solutions**:
1. Check bot logs for timer errors
2. Verify event status in database (should be 'active')
3. Restart bot to trigger recovery and reschedule timers
4. Check server time synchronization (UTC)

### Issue 5: Duplicate Key Errors

**Symptoms**: Database constraint violation errors

**Solutions**:
1. This is expected behavior (prevents duplicate check-ins)
2. Error should be caught and shown to user as friendly message
3. If error not handled, check error handling code

---

## Development Workflow

### Making Changes

1. Create feature branch:
```bash
git checkout -b feature/your-feature
```

2. Make changes in `src/` directory
3. Run tests: `npm test`
4. Test manually in Discord
5. Commit with descriptive message
6. Push and create pull request

### Hot Reload (Development)

Use nodemon for automatic restart on file changes:
```bash
npm run dev
```

### Debugging

Enable debug logging:
```env
# In .env
DEBUG=true
LOG_LEVEL=debug
```

View logs:
```bash
npm start | tee bot.log
```

---

## Project Structure

```
discord-example-app/
├── src/
│   ├── index.js              # Main bot entry point
│   ├── commands/
│   │   ├── create-event.js   # /create-event handler
│   │   ├── close-event.js    # /close-event handler
│   │   └── event-status.js   # /event-status handler
│   ├── interactions/
│   │   ├── check-in.js       # Check-in button handler
│   │   ├── check-out.js      # Check-out button handler
│   │   └── export.js         # Export button handler
│   ├── database/
│   │   ├── client.js         # Supabase client initialization
│   │   └── queries.js        # Database query functions
│   ├── utils/
│   │   ├── permissions.js    # Admin permission checks
│   │   ├── timers.js         # Timer scheduling & recovery
│   │   └── logger.js         # Structured logging
│   └── constants.js          # Configuration constants
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.js
├── .env                       # Environment variables (not in git)
├── .env.sample               # Template for .env
├── package.json
└── README.md
```

---

## Next Steps

1. **Test with Multiple Users**: Invite friends to test concurrent check-ins
2. **Test Timer Recovery**: Stop bot during active event, restart, verify timers resume
3. **Test Edge Cases**: Try checking out without checking in, checking in after event closed
4. **Performance Test**: Create event with 100+ users checking in simultaneously
5. **Export Testing**: Verify CSV opens correctly in Excel/Google Sheets

---

## Production Deployment

### Using PM2 (Recommended)

1. Install PM2:
```bash
npm install -g pm2
```

2. Start bot:
```bash
pm2 start src/index.js --name discord-checkin-bot
```

3. Enable auto-restart on system boot:
```bash
pm2 startup
pm2 save
```

4. Monitor:
```bash
pm2 logs discord-checkin-bot
pm2 monit
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t discord-checkin-bot .
docker run -d --env-file .env discord-checkin-bot
```

---

## Resources

- **Discord.js Documentation**: https://discord.js.org/
- **Supabase Documentation**: https://supabase.com/docs
- **Discord Developer Portal**: https://discord.com/developers/docs
- **Project Repository**: https://github.com/your-repo/discord-example-app
- **Issue Tracker**: https://github.com/your-repo/discord-example-app/issues

---

## Support

For questions or issues:
1. Check this quickstart guide
2. Review project README.md
3. Search existing GitHub issues
4. Create new issue with detailed description

**Happy coding! 🚀**
