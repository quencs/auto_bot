# Feature Specification: Discord Event Check-In/Check-Out System

**Feature Branch**: `001-event-checkin`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "Build a Discord app specification with the following requirements: Create a Discord bot application that enables event check-in/check-out functionality within Discord servers. Admin users can create events with start/end times, regular members can check-in and check-out using buttons, and the system tracks user data and timestamps. Includes export functionality for completed events."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Member Checks In to Event (Priority: P1)

A Discord server member wants to check in to an event they're attending. They navigate to the event's text channel, wait for the event start time, and click the "Check In" button. The system records their Discord user ID, username, and the exact timestamp of their check-in. The bot immediately posts a message in the channel announcing the check-in with the user's name and timestamp.

**Why this priority**: This is the core value proposition - recording event attendance. Without this, the application has no purpose. This represents the absolute minimum viable product.

**Independent Test**: Can be fully tested by creating a single event with a start time, having one user click the check-in button when enabled, and verifying their data is recorded and an announcement message appears. Delivers immediate value for attendance tracking.

**Acceptance Scenarios**:

1. **Given** an event channel exists and the event start time has arrived, **When** a member clicks the "Check In" button, **Then** their Discord user ID, username, discriminator, and timestamp are recorded
2. **Given** a member successfully checks in, **When** their check-in is recorded, **Then** the bot posts a message in the channel displaying the user's name and check-in timestamp
3. **Given** an event channel exists but the event start time has not arrived, **When** a member views the channel, **Then** the "Check In" button is disabled or not visible
4. **Given** a member has already checked in to an event, **When** they attempt to check in again, **Then** the system prevents duplicate check-ins for the same user
5. **Given** an admin has closed the event, **When** a member views the event channel, **Then** the "Check In" button is disabled or not visible

---

### User Story 2 - Admin Creates and Manages Event (Priority: P2)

An admin wants to organize an event and track attendance. They create a new text channel for the event and configure it with a start time (when check-in becomes available). When the event actually finishes, the admin manually closes the event, which disables check-in and enables check-out. The check-out button automatically disables 15 minutes after the admin closes the event.

**Why this priority**: Without event creation, there are no events to check into. This is critical infrastructure but secondary to the check-in functionality itself, as it could theoretically be done manually or through Discord's native tools in an MVP.

**Independent Test**: Can be fully tested by an admin creating an event channel with a start time, manually closing the event when ready, and verifying the channel exists with proper button state changes. Demonstrates the ability to set up and manage event lifecycle.

**Acceptance Scenarios**:

1. **Given** a user has admin permissions (server owner or assigned admin role), **When** they create a new event, **Then** a dedicated text channel is created for the event
2. **Given** an admin is creating an event, **When** they specify a start time, **Then** the system configures the check-in button to enable at start time
3. **Given** an event is active and the admin decides the event has finished, **When** they manually close the event, **Then** the system disables the check-in button and enables the check-out button
4. **Given** an admin has closed an event, **When** 15 minutes have elapsed since closure, **Then** the system automatically disables the check-out button
5. **Given** a user without admin permissions, **When** they attempt to create an event, **Then** the system denies the action

---

### User Story 3 - Member Checks Out from Event (Priority: P3)

A Discord server member who attended an event wants to check out as they're leaving. After the admin closes the event, they navigate to the event's text channel and click the "Check Out" button. The system records their Discord user ID, username, and the exact timestamp of their check-out. Unlike check-in, no announcement message is posted for check-outs.

**Why this priority**: Check-out provides valuable data about how long attendees stayed, but the core value (knowing who attended) is already captured by check-in. This is an enhancement that adds detail but isn't essential for basic attendance tracking.

**Independent Test**: Can be fully tested by creating an event, having a user check in, having admin close the event, having the same user click check-out, and verifying both timestamps are recorded. Demonstrates duration tracking capability.

**Acceptance Scenarios**:

1. **Given** an event has been closed by an admin, **When** a member who previously checked in clicks the "Check Out" button, **Then** their Discord user ID and checkout timestamp are recorded
2. **Given** an event is still active and has not been closed by an admin, **When** a member views the channel, **Then** the "Check Out" button is disabled or not visible
3. **Given** 15 minutes have passed since the admin closed the event, **When** a member views the event channel, **Then** the "Check Out" button is disabled or not visible
4. **Given** a member has not checked in to an event, **When** they attempt to check out, **Then** the system allows the check-out and records it (users may have arrived before check-in was enabled)
5. **Given** a member successfully checks out, **When** their check-out is recorded, **Then** no announcement message is posted in the channel

---

### User Story 4 - Admin Exports Event Data (Priority: P4)

An admin wants to review attendance records for a completed event. They click an "Export" button in the event channel and the system generates and downloads a file containing all check-in and check-out data, including Discord usernames, user IDs, and timestamps. The data is formatted for easy reading in spreadsheet applications.

**Why this priority**: Export is necessary for the data to have real-world utility (sharing with other systems, offline analysis), but the core tracking functionality must exist first. This is a critical feature for production but can be delayed in early MVP testing.

**Independent Test**: Can be fully tested by creating a completed event with multiple check-ins/check-outs, clicking the Export button, and verifying the downloaded file contains all expected data in a readable format. Demonstrates end-to-end data accessibility.

**Acceptance Scenarios**:

1. **Given** an event has check-in/check-out records, **When** an admin clicks the "Export" button in the event channel, **Then** the system generates a file containing all user data and timestamps
2. **Given** an exported event file, **When** opened in a spreadsheet application, **Then** the data is formatted in columns with headers (User ID, Username, Discriminator, Check-In Time, Check-Out Time)
3. **Given** a user without admin permissions, **When** they view the event channel, **Then** the "Export" button is not visible or disabled
4. **Given** an event with some users who checked in but didn't check out, **When** an admin exports the data, **Then** the export includes all check-ins with blank check-out fields where applicable

---

### Edge Cases

- What happens when a user's Discord username or discriminator changes between check-in and check-out?
- How does the system handle clock skew or timezone differences when comparing current time to event start time?
- What happens if an admin deletes the event channel before exporting data?
- How does the system handle users who leave the server after checking in but before the event is closed?
- What happens when the bot goes offline during an event and misses the scheduled enable time for check-in button?
- What happens if an admin closes an event and then the bot goes offline before the 15-minute check-out window expires?
- How does the system handle events that span midnight or cross daylight saving time boundaries?
- What happens if two admins try to create events in the same channel simultaneously?
- What happens if two admins try to close the same event at the same time?
- How does the system handle rate limiting from Discord's API when many users check in simultaneously and multiple announcement messages need to be posted?
- What happens if the Supabase database is unavailable or experiencing downtime during check-in/check-out operations?
- How does the system handle database connection timeouts or network interruptions?
- What happens if database write operations fail due to constraint violations or schema issues?
- How does the system handle concurrent database writes from multiple users checking in simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users with admin permissions (server owner or assigned admin role) to create event channels
- **FR-002**: System MUST allow admins to specify an event start time that controls when the check-in button becomes enabled
- **FR-003**: System MUST allow admins to manually close/end an event at any time
- **FR-004**: System MUST enable the check-in button at the specified event start time
- **FR-005**: System MUST disable the check-in button when an admin closes the event
- **FR-006**: System MUST enable the check-out button when an admin closes the event
- **FR-007**: System MUST disable the check-out button 15 minutes after the admin closes the event
- **FR-008**: System MUST record the following information when a user checks in: Discord user ID, username, discriminator, and timestamp
- **FR-009**: System MUST post a message in the event channel when a user checks in, displaying the user's name and check-in timestamp
- **FR-010**: System MUST NOT post announcement messages when users check out
- **FR-011**: System MUST record the following information when a user checks out: Discord user ID and timestamp
- **FR-012**: System MUST prevent duplicate check-ins from the same user for a single event
- **FR-013**: System MUST allow users to check out even if they haven't checked in (to handle cases where users arrived before check-in was enabled)
- **FR-014**: System MUST persist all check-in and check-out data
- **FR-015**: System MUST provide a check-in button/interaction in the event's text channel
- **FR-016**: System MUST provide a check-out button/interaction in the event's text channel
- **FR-017**: System MUST provide an "Export" button in the event channel for admins to download event data
- **FR-018**: System MUST export data in CSV format containing user IDs, usernames, discriminators, check-in timestamps, and check-out timestamps when the Export button is clicked
- **FR-019**: System MUST restrict export button visibility and functionality to users with admin permissions only
- **FR-020**: System MUST create a dedicated text channel for each event
- **FR-021**: System MUST use Supabase as the database backend for all data persistence
- **FR-022**: System MUST implement proper database schema with events, check-ins, and check-outs tables
- **FR-023**: System MUST use Supabase JavaScript client library (@supabase/supabase-js) for database operations
- **FR-024**: System MUST store database credentials securely in environment variables (.env file)
- **FR-025**: System MUST handle database connection errors gracefully
- **FR-026**: System MUST associate check-in and check-out records with their corresponding event channel
- **FR-027**: System MUST verify user permissions before allowing event creation and management actions

### Key Entities

- **Event**: Represents a scheduled gathering with a start time, manual close capability by admin, dedicated Discord text channel, and associated attendance records. Stored in Supabase database with fields: event_id, event_name, channel_id, start_time, status, created_at
- **Check-In Record**: Captures a member's attendance at an event, including their Discord user ID, username, discriminator, and the precise timestamp when they checked in. Stored in Supabase database with fields: checkin_id, event_id, user_id, username, discriminator, timestamp
- **Check-Out Record**: Captures when a member left an event, including their Discord user ID and the precise timestamp when they checked out. Stored in Supabase database with fields: checkout_id, event_id, user_id, timestamp
- **Admin User**: A Discord server member with elevated permissions (server owner or assigned admin role) who can create events and export attendance data
- **Member User**: A regular Discord server member who can check in and check out of events

### Database Schema

The system uses Supabase (PostgreSQL-based cloud database) with the following tables:

**Events Table**:
- `event_id` (UUID, Primary Key): Unique identifier for each event
- `event_name` (TEXT): Human-readable name of the event
- `channel_id` (TEXT): Discord channel ID associated with the event
- `start_time` (TIMESTAMP): Scheduled start time of the event
- `status` (TEXT): Event status (e.g., "active", "closed")
- `created_at` (TIMESTAMP): Timestamp when the event was created

**Check-ins Table**:
- `checkin_id` (UUID, Primary Key): Unique identifier for each check-in record
- `event_id` (UUID, Foreign Key): References events.event_id
- `user_id` (TEXT): Discord user ID
- `username` (TEXT): Discord username at time of check-in
- `discriminator` (TEXT): Discord discriminator at time of check-in
- `timestamp` (TIMESTAMP): Timestamp when user checked in

**Check-outs Table**:
- `checkout_id` (UUID, Primary Key): Unique identifier for each check-out record
- `event_id` (UUID, Foreign Key): References events.event_id
- `user_id` (TEXT): Discord user ID
- `timestamp` (TIMESTAMP): Timestamp when user checked out

**Note on Discord Username System**: This specification includes the `discriminator` field for Discord usernames. Discord is gradually phasing out discriminators in favor of unique usernames. The implementation should store the username as displayed at the time of check-in/check-out. Future versions may need to update the schema to use `display_name` instead of `username` + `discriminator`.

### Technical Stack

- **Platform**: Discord Bot (discord.js library)
- **Runtime**: Node.js (>=18.x)
- **Database**: Supabase (PostgreSQL-based cloud database)
- **Database Client**: @supabase/supabase-js npm package
- **Configuration**: Environment variables stored in .env file
  - `SUPABASE_URL`: Supabase project URL
  - `SUPABASE_KEY`: Supabase anonymous key
  - `DISCORD_TOKEN`: Discord bot token
  - `DISCORD_APP_ID`: Discord application ID
  - `ADMIN_ROLE_ID` (optional): Discord role ID for admin permissions (if not set, only server owner has admin access)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a new event with start time in under 1 minute
- **SC-002**: Members can successfully check in to an event with a single button click after the event starts
- **SC-003**: When a member checks in, an announcement message appears in the channel within 2 seconds displaying their name and timestamp
- **SC-004**: Check-in button automatically enables at start time and disables when admin closes the event
- **SC-005**: Check-out button automatically enables when admin closes the event and disables 15 minutes after closure
- **SC-006**: The system accurately records 100% of check-in and check-out timestamps within 1 second of the actual button click
- **SC-007**: Admins can export complete attendance data by clicking the Export button and downloading the file in under 30 seconds
- **SC-008**: The system prevents duplicate check-ins, with 0% duplicate records in the exported data
- **SC-009**: The system handles at least 100 concurrent check-ins during event start time without data loss or significant delay (within 5 seconds per interaction)
- **SC-010**: Exported data files open successfully in standard spreadsheet applications with properly formatted columns and headers
- **SC-011**: 95% of users successfully complete their first check-in attempt without errors or confusion
- **SC-012**: Check-out button automatically disables exactly 15 minutes after admin closes the event with accuracy within 30 seconds

## Assumptions

- The Discord bot has the necessary permissions to create text channels in the server
- The Discord bot has appropriate permissions to manage messages and interactions within event channels
- Admin permissions are defined as either server owner status or membership in a designated admin role
- All times (event start, event closure, check-in/check-out timestamps) are stored in UTC to avoid timezone ambiguity
- The Discord server has a stable internet connection and the bot remains online during events
- Discord's API rate limits will not be exceeded during typical event usage patterns
- Users understand basic Discord navigation and can locate event channels
- The 15-minute check-out window after event end is sufficient for most use cases
- Check-in and check-out actions are voluntary and users may skip either or both
- Event channels persist after events complete to maintain access to historical data
- Supabase database is accessible and operational with stable network connectivity
- Database credentials (SUPABASE_URL and SUPABASE_KEY) are correctly configured in environment variables
- Supabase anonymous key has appropriate row-level security policies configured for the application's needs

## Dependencies

- Discord platform and Discord API availability
- Discord bot must be invited to the server with appropriate permissions
- Server administrators must configure admin roles if using role-based permissions
- Time synchronization between the bot server and Discord's servers
- Supabase account and project setup (Project URL: https://supabase.com/dashboard/project/obcwyxboxypsbqjnyapc)
- @supabase/supabase-js npm package installed
- Environment variables configuration:
  - `.env` file with SUPABASE_URL and SUPABASE_KEY
  - Database credentials provided via environment variables (never committed to source control)
- Supabase database tables created with proper schema (events, check-ins, check-outs)
- Network connectivity between the bot server and Supabase cloud database

## Out of Scope

The following features are explicitly excluded from this specification:

- Editing or modifying event start time after event creation
- Reopening a closed event
- Deleting events or event channels
- Manual admin override to check in/out users on their behalf
- Notification reminders before events start
- Integration with external calendar systems
- Automatic role assignment based on attendance
- Attendance statistics or analytics dashboards
- Multi-language support for button labels and messages
- Customizable check-out timeout (fixed at 15 minutes)
- Retroactive check-in/check-out (adding records for past times)
- Event capacity limits or registration requirements
- Private events or access control beyond channel permissions
- Attendance verification or validation (preventing fraudulent check-ins)
- Integration with other Discord bots or services
