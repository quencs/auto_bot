# Database API Contracts

**Branch**: `001-event-checkin` | **Date**: 2025-12-22

This document defines the data access layer API for interacting with Supabase PostgreSQL database. All functions use `@supabase/supabase-js` client.

---

## Supabase Client Initialization

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
```

---

## Event Operations

### 1. createEvent()

Create a new event record in the database.

**Signature**:
```javascript
async function createEvent(eventData) {
  // eventData: { event_name, channel_id, start_time, created_by }
  // Returns: { data, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('events')
  .insert({
    event_name: 'Weekly Meeting',
    channel_id: '1234567890',
    start_time: '2025-12-25T14:00:00Z',
    created_by: '555555555',
    status: 'pending'
  })
  .select()
  .single();
```

**Response (Success)**:
```javascript
{
  data: {
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    event_name: 'Weekly Meeting',
    channel_id: '1234567890',
    start_time: '2025-12-25T14:00:00Z',
    closed_at: null,
    status: 'pending',
    created_at: '2025-12-22T10:30:00Z',
    created_by: '555555555'
  },
  error: null
}
```

**Response (Error - Duplicate Channel)**:
```javascript
{
  data: null,
  error: {
    code: '23505',
    message: 'duplicate key value violates unique constraint "events_channel_id_key"'
  }
}
```

---

### 2. getEventByChannelId()

Retrieve event details by Discord channel ID.

**Signature**:
```javascript
async function getEventByChannelId(channelId) {
  // channelId: Discord channel snowflake (string)
  // Returns: { data, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('channel_id', '1234567890')
  .single();
```

**Response (Success)**:
```javascript
{
  data: {
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    event_name: 'Weekly Meeting',
    channel_id: '1234567890',
    start_time: '2025-12-25T14:00:00Z',
    closed_at: null,
    status: 'active',
    created_at: '2025-12-22T10:30:00Z',
    created_by: '555555555'
  },
  error: null
}
```

**Response (Not Found)**:
```javascript
{
  data: null,
  error: {
    code: 'PGRST116',
    message: 'The result contains 0 rows'
  }
}
```

---

### 3. updateEventStatus()

Update event status (pending → active → closed).

**Signature**:
```javascript
async function updateEventStatus(eventId, status, closedAt = null) {
  // eventId: UUID
  // status: 'pending' | 'active' | 'closed'
  // closedAt: ISO 8601 timestamp (optional, only for 'closed' status)
  // Returns: { data, error }
}
```

**Request (Activate Event)**:
```javascript
const { data, error } = await supabase
  .from('events')
  .update({ status: 'active' })
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000')
  .select()
  .single();
```

**Request (Close Event)**:
```javascript
const { data, error } = await supabase
  .from('events')
  .update({ 
    status: 'closed',
    closed_at: new Date().toISOString()
  })
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000')
  .select()
  .single();
```

**Response**:
```javascript
{
  data: {
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    event_name: 'Weekly Meeting',
    status: 'closed',
    closed_at: '2025-12-25T16:30:00Z'
  },
  error: null
}
```

---

### 4. getActiveEvents()

Retrieve all events that need timer rescheduling (for bot restart recovery).

**Signature**:
```javascript
async function getActiveEvents() {
  // Returns: { data, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('events')
  .select('*')
  .in('status', ['pending', 'active', 'closed'])
  .order('start_time', { ascending: true });
```

**Response**:
```javascript
{
  data: [
    {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      event_name: 'Weekly Meeting',
      status: 'active',
      start_time: '2025-12-25T14:00:00Z',
      closed_at: null
    },
    {
      event_id: '660e9500-f39c-52e5-b827-557766551111',
      event_name: 'Holiday Party',
      status: 'closed',
      start_time: '2025-12-26T18:00:00Z',
      closed_at: '2025-12-26T22:30:00Z'
    }
  ],
  error: null
}
```

---

## Check-In Operations

### 5. createCheckIn()

Record a user check-in.

**Signature**:
```javascript
async function createCheckIn(checkInData) {
  // checkInData: { event_id, user_id, username, discriminator }
  // Returns: { data, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('checkins')
  .insert({
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: '555555555',
    username: 'john_doe',
    discriminator: '1234'
  })
  .select()
  .single();
```

**Response (Success)**:
```javascript
{
  data: {
    checkin_id: '770e9600-g49d-63f6-c938-668877662222',
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: '555555555',
    username: 'john_doe',
    discriminator: '1234',
    timestamp: '2025-12-25T14:05:32Z'
  },
  error: null
}
```

**Response (Error - Duplicate)**:
```javascript
{
  data: null,
  error: {
    code: '23505',
    message: 'duplicate key value violates unique constraint "idx_checkins_event_user"',
    details: 'Key (event_id, user_id)=(550e8400-e29b-41d4-a716-446655440000, 555555555) already exists.'
  }
}
```

---

### 6. hasUserCheckedIn()

Check if user has already checked in to an event.

**Signature**:
```javascript
async function hasUserCheckedIn(eventId, userId) {
  // eventId: UUID
  // userId: Discord user snowflake (string)
  // Returns: { exists: boolean, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('checkins')
  .select('checkin_id')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000')
  .eq('user_id', '555555555')
  .maybeSingle();

const exists = !!data;
```

**Response (Exists)**:
```javascript
{
  data: { checkin_id: '770e9600-g49d-63f6-c938-668877662222' },
  error: null
}
// exists = true
```

**Response (Not Exists)**:
```javascript
{
  data: null,
  error: null
}
// exists = false
```

---

### 7. getCheckInCountForEvent()

Get total number of check-ins for an event.

**Signature**:
```javascript
async function getCheckInCountForEvent(eventId) {
  // eventId: UUID
  // Returns: { count, error }
}
```

**Request**:
```javascript
const { count, error } = await supabase
  .from('checkins')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000');
```

**Response**:
```javascript
{
  count: 23,
  error: null
}
```

---

## Check-Out Operations

### 8. createCheckOut()

Record a user check-out.

**Signature**:
```javascript
async function createCheckOut(checkOutData) {
  // checkOutData: { event_id, user_id }
  // Returns: { data, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('checkouts')
  .insert({
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: '555555555'
  })
  .select()
  .single();
```

**Response (Success)**:
```javascript
{
  data: {
    checkout_id: '880f0700-h50e-74g7-d049-779988773333',
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: '555555555',
    timestamp: '2025-12-25T16:32:15Z'
  },
  error: null
}
```

**Response (Error - Duplicate)**:
```javascript
{
  data: null,
  error: {
    code: '23505',
    message: 'duplicate key value violates unique constraint "idx_checkouts_event_user"'
  }
}
```

---

### 9. hasUserCheckedOut()

Check if user has already checked out from an event.

**Signature**:
```javascript
async function hasUserCheckedOut(eventId, userId) {
  // eventId: UUID
  // userId: Discord user snowflake (string)
  // Returns: { exists: boolean, error }
}
```

**Request**:
```javascript
const { data, error } = await supabase
  .from('checkouts')
  .select('checkout_id')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000')
  .eq('user_id', '555555555')
  .maybeSingle();

const exists = !!data;
```

---

### 10. getCheckOutCountForEvent()

Get total number of check-outs for an event.

**Signature**:
```javascript
async function getCheckOutCountForEvent(eventId) {
  // eventId: UUID
  // Returns: { count, error }
}
```

**Request**:
```javascript
const { count, error } = await supabase
  .from('checkouts')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000');
```

**Response**:
```javascript
{
  count: 18,
  error: null
}
```

---

## Export Operations

### 11. getEventAttendanceData()

Retrieve complete attendance data for export (check-ins joined with check-outs).

**Signature**:
```javascript
async function getEventAttendanceData(eventId) {
  // eventId: UUID
  // Returns: { data, error }
}
```

**Request** (using multiple queries and joining in application):
```javascript
// Get all check-ins
const { data: checkIns, error: checkInsError } = await supabase
  .from('checkins')
  .select('user_id, username, discriminator, timestamp')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000')
  .order('timestamp', { ascending: true });

// Get all check-outs
const { data: checkOuts, error: checkOutsError } = await supabase
  .from('checkouts')
  .select('user_id, timestamp')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440000');

// Join in application layer
const userMap = new Map();
checkIns.forEach(ci => {
  userMap.set(ci.user_id, {
    user_id: ci.user_id,
    username: ci.username,
    discriminator: ci.discriminator,
    checkin_time: ci.timestamp,
    checkout_time: null
  });
});

checkOuts.forEach(co => {
  const user = userMap.get(co.user_id);
  if (user) {
    user.checkout_time = co.timestamp;
  } else {
    // User checked out without checking in
    userMap.set(co.user_id, {
      user_id: co.user_id,
      username: '',
      discriminator: '',
      checkin_time: null,
      checkout_time: co.timestamp
    });
  }
});

const attendanceData = Array.from(userMap.values());
```

**Response**:
```javascript
{
  data: [
    {
      user_id: '555555555',
      username: 'john_doe',
      discriminator: '1234',
      checkin_time: '2025-12-25T14:05:32Z',
      checkout_time: '2025-12-25T16:32:15Z'
    },
    {
      user_id: '666666666',
      username: 'jane_smith',
      discriminator: '5678',
      checkin_time: '2025-12-25T14:12:45Z',
      checkout_time: '2025-12-25T16:28:03Z'
    },
    {
      user_id: '777777777',
      username: 'bob_jones',
      discriminator: '9012',
      checkin_time: '2025-12-25T14:03:21Z',
      checkout_time: null
    }
  ],
  error: null
}
```

---

## Error Handling

All database operations follow consistent error handling pattern:

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 23505 | Unique constraint violation | Return user-friendly "already exists" error |
| PGRST116 | No rows returned | Return "not found" error |
| 08006 | Connection failure | Retry with exponential backoff |
| 57014 | Query timeout | Log error, retry once |
| 42501 | Permission denied | Log error, check RLS policies |

### Error Response Structure

```javascript
{
  data: null,
  error: {
    code: '23505',
    message: 'duplicate key value violates unique constraint...',
    details: 'Key (event_id, user_id)=(...) already exists.',
    hint: 'Consider using ON CONFLICT clause'
  }
}
```

### Retry Logic

```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation();
      if (!result.error) return result;
      
      // Don't retry constraint violations (user errors)
      if (result.error.code === '23505') return result;
      
      // Retry transient errors
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }
      
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## Performance Monitoring

Log database query execution times:

```javascript
async function queryWithLogging(operation, queryName) {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  
  console.log({
    query: queryName,
    duration_ms: duration,
    success: !result.error,
    timestamp: new Date().toISOString()
  });
  
  return result;
}

// Usage
const result = await queryWithLogging(
  () => supabase.from('events').select('*'),
  'getActiveEvents'
);
```

---

## Connection Management

Supabase client handles connection pooling automatically:

- No need for explicit connect/disconnect
- Client reuses HTTP connections
- Automatic reconnection on network failures
- No connection limits (HTTP-based, not persistent WebSocket)

---

## Testing Database Operations

### Unit Tests (Mock Supabase)

```javascript
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { event_id: 'test-uuid' },
            error: null
          }))
        }))
      }))
    }))
  }))
}));
```

### Integration Tests (Test Database)

Use separate Supabase project for testing:
- `.env.test` with test database credentials
- Seed test data before each test
- Clean up after tests
- Verify constraints and indexes

---

## Security Notes

1. **Row-Level Security (RLS)**: Enable RLS policies on all tables in Supabase dashboard
2. **Anonymous Key**: Use Supabase anonymous key (not service role key) for application
3. **SQL Injection**: Supabase client parameterizes all queries automatically
4. **Credential Storage**: Store credentials in `.env` file (never commit to source control)
5. **Rate Limiting**: Supabase enforces rate limits based on plan tier
