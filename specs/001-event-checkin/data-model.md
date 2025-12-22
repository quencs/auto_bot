# Data Model: Discord Event Check-In/Check-Out System

**Branch**: `001-event-checkin` | **Date**: 2025-12-22

## Overview

This document defines the data entities, relationships, and state transitions for the Discord Event Check-In/Check-Out System. All data is persisted in Supabase PostgreSQL database.

---

## Entity Definitions

### 1. Event

Represents a scheduled event with check-in/check-out tracking.

**Database Table**: `events`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| event_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| event_name | TEXT | NOT NULL | Human-readable event name |
| channel_id | TEXT | NOT NULL, UNIQUE | Discord channel ID (snowflake) |
| start_time | TIMESTAMPTZ | NOT NULL | Scheduled start time (UTC) |
| closed_at | TIMESTAMPTZ | NULL | Timestamp when admin closed event |
| status | TEXT | NOT NULL, DEFAULT 'pending' | Event status: 'pending', 'active', 'closed' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| created_by | TEXT | NOT NULL | Discord user ID of admin who created event |

**Indexes**:
- `idx_events_channel_id` ON `channel_id` (for quick channel lookup)
- `idx_events_status` ON `status` (for recovery queries)

**State Transitions**:
```
pending → active   (when current time >= start_time)
active → closed    (when admin closes event)
```

**Validation Rules**:
- `start_time` must be in the future at creation time (validated in application layer)
- `event_name` must be 3-100 characters
- `channel_id` must be unique (one event per channel)

---

### 2. Check-In Record

Captures member attendance with announcement message context.

**Database Table**: `checkins`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| checkin_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| event_id | UUID | NOT NULL, REFERENCES events(event_id) ON DELETE CASCADE | Associated event |
| user_id | TEXT | NOT NULL | Discord user ID (snowflake) |
| username | TEXT | NOT NULL | Discord username at check-in time |
| discriminator | TEXT | NULL | Discord discriminator (deprecated by Discord but captured) |
| timestamp | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Check-in timestamp (UTC) |

**Indexes**:
- `idx_checkins_event_id` ON `event_id` (for event export queries)
- `idx_checkins_user_id` ON `user_id` (for duplicate check queries)
- `UNIQUE INDEX idx_checkins_event_user` ON `(event_id, user_id)` (prevent duplicate check-ins)

**Validation Rules**:
- `(event_id, user_id)` must be unique (one check-in per user per event)
- `timestamp` must be >= event.start_time (validated in application layer)

**Immutability**:
- Records are never updated or deleted (audit trail)
- If user checks in again, application prevents duplicate (constraint violation)

---

### 3. Check-Out Record

Captures member departure with silent tracking (no announcement).

**Database Table**: `checkouts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| checkout_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| event_id | UUID | NOT NULL, REFERENCES events(event_id) ON DELETE CASCADE | Associated event |
| user_id | TEXT | NOT NULL | Discord user ID (snowflake) |
| timestamp | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Check-out timestamp (UTC) |

**Indexes**:
- `idx_checkouts_event_id` ON `event_id` (for event export queries)
- `idx_checkouts_user_id` ON `user_id` (for user history queries)
- `UNIQUE INDEX idx_checkouts_event_user` ON `(event_id, user_id)` (prevent duplicate check-outs)

**Validation Rules**:
- `(event_id, user_id)` must be unique (one check-out per user per event)
- `timestamp` must be >= event.closed_at (validated in application layer)
- Check-out is allowed even if user has no check-in record (per FR-013)

**Immutability**:
- Records are never updated or deleted (audit trail)

---

## Entity Relationships

```
┌─────────────────┐
│     events      │
│  (event_id PK)  │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴─────────────────────┐
    │                          │
    ▼                          ▼
┌──────────────┐       ┌──────────────┐
│   checkins   │       │  checkouts   │
│(checkin_id PK)│       │(checkout_id PK)│
│event_id FK   │       │event_id FK   │
│user_id       │       │user_id       │
└──────────────┘       └──────────────┘
```

**Relationship Notes**:
- One event has many check-ins (0 to N)
- One event has many check-outs (0 to N)
- Check-ins and check-outs are independent (user can check-out without check-in)
- No direct FK between check-ins and check-outs (joined by event_id + user_id)

---

## State Machine: Event Lifecycle

### States

1. **pending**: Event created, start_time in future, check-in button disabled
2. **active**: Current time >= start_time, check-in button enabled, event open
3. **closed**: Admin manually closed event, check-in disabled, check-out enabled (15-minute window)

### Transitions

```
┌─────────┐  start_time reached   ┌────────┐  admin closes  ┌────────┐
│ pending ├──────────────────────>│ active ├───────────────>│ closed │
└─────────┘  (automatic)           └────────┘  (manual)      └────────┘
                                                                   │
                                                                   │ 15 minutes
                                                                   │ (automatic)
                                                                   ▼
                                                          [check-out disabled]
```

### Transition Triggers

| Transition | Trigger | Actor | Side Effects |
|------------|---------|-------|--------------|
| pending → active | `current_time >= start_time` | System (setTimeout) | Enable check-in button, log event start |
| active → closed | Admin clicks "Close Event" button | Admin user | Set `closed_at`, disable check-in, enable check-out, schedule 15-min timer |
| closed → [check-out disabled] | `current_time >= closed_at + 15 minutes` | System (setTimeout) | Disable check-out button, log window closure |

### State Persistence
- Event status stored in `events.status` column
- Bot restart recovery: Query events with status='active' or status='closed', reschedule timers

---

## Data Access Patterns

### 1. Create Event
```sql
INSERT INTO events (event_name, channel_id, start_time, created_by, status)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING *;
```

### 2. Check-In User
```sql
-- Check for duplicate
SELECT checkin_id FROM checkins
WHERE event_id = $1 AND user_id = $2;

-- If no duplicate, insert
INSERT INTO checkins (event_id, user_id, username, discriminator, timestamp)
VALUES ($1, $2, $3, $4, NOW())
RETURNING *;
```

### 3. Check-Out User
```sql
-- Check for duplicate
SELECT checkout_id FROM checkouts
WHERE event_id = $1 AND user_id = $2;

-- If no duplicate, insert
INSERT INTO checkouts (event_id, user_id, timestamp)
VALUES ($1, $2, NOW())
RETURNING *;
```

### 4. Close Event (Admin)
```sql
UPDATE events
SET status = 'closed', closed_at = NOW()
WHERE event_id = $1
RETURNING *;
```

### 5. Export Event Data
```sql
-- Get all check-ins and check-outs for event
SELECT 
  c.user_id,
  c.username,
  c.discriminator,
  c.timestamp AS checkin_time,
  co.timestamp AS checkout_time
FROM checkins c
LEFT JOIN checkouts co ON c.event_id = co.event_id AND c.user_id = co.user_id
WHERE c.event_id = $1
ORDER BY c.timestamp ASC;
```

### 6. Recovery Query (Bot Restart)
```sql
-- Get all events that need timer rescheduling
SELECT * FROM events
WHERE status IN ('pending', 'active', 'closed')
ORDER BY start_time ASC;
```

---

## Data Validation Rules

### Application-Layer Validation

1. **Event Creation**:
   - `event_name`: 3-100 characters, alphanumeric + spaces
   - `start_time`: Must be at least 5 minutes in the future
   - `channel_id`: Must not exist in database (unique constraint)
   - Creator must have admin permissions

2. **Check-In**:
   - Event must be in 'active' status
   - User must not have existing check-in for this event
   - Current time must be >= event.start_time

3. **Check-Out**:
   - Event must be in 'closed' status
   - User must not have existing check-out for this event
   - Current time must be <= event.closed_at + 15 minutes

4. **Close Event**:
   - Event must be in 'active' status
   - User must have admin permissions
   - Event must belong to the Discord server

5. **Export Data**:
   - User must have admin permissions
   - Event must exist

### Database Constraints

- **Primary Keys**: All tables have UUID primary keys (immutable, globally unique)
- **Foreign Keys**: CASCADE delete (if event deleted, check-ins/check-outs deleted)
- **Unique Constraints**: Prevent duplicate check-ins/check-outs per user per event
- **NOT NULL**: Critical fields (event_name, channel_id, user_id, timestamps)

---

## Data Integrity Guarantees

### ACID Properties

1. **Atomicity**: 
   - Check-in operation (database insert + announcement post) treated as logical unit
   - If announcement fails, check-in still recorded (data integrity priority)

2. **Consistency**:
   - Unique constraints prevent duplicate records
   - Foreign keys maintain referential integrity
   - Status transitions follow state machine rules

3. **Isolation**:
   - Concurrent check-ins handled by database transaction isolation (READ COMMITTED)
   - Unique constraints prevent race conditions on duplicate check-ins

4. **Durability**:
   - All data persisted to Supabase PostgreSQL (ACID-compliant)
   - Timestamps in UTC prevent timezone ambiguity

### Immutability

- Check-in and check-out records are **never updated or deleted** (audit trail)
- Event status transitions are **append-only** (closed_at timestamp added, not modified)
- User information captured at check-in time (username, discriminator) preserved even if user changes name

---

## Performance Considerations

### Query Optimization

1. **Indexes**: 
   - Covering indexes on foreign keys (event_id, user_id)
   - Composite unique index for duplicate prevention
   - Status index for recovery queries

2. **Expected Load**:
   - Check-ins: Spike at event start (100 users in 1 minute)
   - Check-outs: Distributed over 15-minute window
   - Exports: Infrequent (1-2 per event after completion)

3. **Query Patterns**:
   - Write-heavy during check-in window (INSERT operations)
   - Read-heavy during export (JOIN operation)
   - Recovery query on bot startup (infrequent)

### Scalability

- **Partition strategy**: If events table grows > 1M rows, partition by created_at (monthly)
- **Archive strategy**: Move events older than 1 year to archive table
- **Connection pooling**: Supabase client handles connection pooling automatically

---

## Schema Migration Script

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

---

## Summary

This data model provides:
- **Three core entities**: Events, Check-Ins, Check-Outs
- **Clear relationships**: One-to-many with cascade delete
- **State machine**: Pending → Active → Closed lifecycle
- **Immutable records**: Audit trail for compliance
- **Performance**: Indexed for common queries
- **Integrity**: ACID guarantees with constraints
- **Recovery**: Bot restart resilience via status queries

All functional requirements (FR-001 to FR-027) are supported by this data model.
