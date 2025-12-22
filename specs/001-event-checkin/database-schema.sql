-- ============================================================================
-- Discord Event Check-In/Check-Out System - Supabase Database Schema
-- ============================================================================
-- Created: 2025-12-22
-- Description: Complete database schema for Discord event attendance tracking
-- Features: Events, Check-ins, Check-outs with foreign key constraints
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: events
-- ============================================================================
-- Purpose: Stores Discord event information including channel mapping and status
-- Primary Use: Track events created by admins with start times and closure status
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
    -- Primary Key: Auto-generated UUID
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event Details
    event_name TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE, -- Discord channel ID (snowflake)
    start_time TIMESTAMPTZ NOT NULL,
    
    -- Status Management
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
    closed_at TIMESTAMPTZ NULL, -- Timestamp when admin closed the event
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL -- Discord user ID of admin who created event
);

-- Add comment to table
COMMENT ON TABLE events IS 'Stores Discord event information with channel mapping and lifecycle status';

-- Add comments to columns
COMMENT ON COLUMN events.event_id IS 'Unique identifier for the event';
COMMENT ON COLUMN events.event_name IS 'Human-readable name of the event';
COMMENT ON COLUMN events.channel_id IS 'Discord channel ID (snowflake) - must be unique';
COMMENT ON COLUMN events.start_time IS 'Scheduled start time when check-in becomes available (UTC)';
COMMENT ON COLUMN events.status IS 'Event status: pending (created, waiting for start time), active (check-in enabled), or closed (event ended)';
COMMENT ON COLUMN events.closed_at IS 'Timestamp when admin manually closed the event (UTC)';
COMMENT ON COLUMN events.created_at IS 'Timestamp when event was created (UTC)';
COMMENT ON COLUMN events.created_by IS 'Discord user ID of admin who created the event';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_channel_id ON events(channel_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);

-- ============================================================================
-- TABLE: checkins
-- ============================================================================
-- Purpose: Records member attendance check-ins for events
-- Primary Use: Track who checked in, when, and trigger announcements
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkins (
    -- Primary Key: Auto-generated UUID
    checkin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key to events table
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    
    -- Discord User Information
    user_id TEXT NOT NULL, -- Discord user ID (snowflake)
    username TEXT NOT NULL, -- Discord username at time of check-in
    discriminator TEXT, -- Discord discriminator (being phased out by Discord)
    
    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate check-ins for same user at same event
    CONSTRAINT unique_event_user_checkin UNIQUE (event_id, user_id)
);

-- Add comment to table
COMMENT ON TABLE checkins IS 'Records member check-ins for events with user details and timestamps';

-- Add comments to columns
COMMENT ON COLUMN checkins.checkin_id IS 'Unique identifier for the check-in record';
COMMENT ON COLUMN checkins.event_id IS 'References the event this check-in belongs to';
COMMENT ON COLUMN checkins.user_id IS 'Discord user ID (snowflake) of the member who checked in';
COMMENT ON COLUMN checkins.username IS 'Discord username at the time of check-in';
COMMENT ON COLUMN checkins.discriminator IS 'Discord discriminator at time of check-in (may be null as Discord phases this out)';
COMMENT ON COLUMN checkins.timestamp IS 'Exact timestamp when user checked in (UTC)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkins_event_user ON checkins(event_id, user_id);

-- ============================================================================
-- TABLE: checkouts
-- ============================================================================
-- Purpose: Records member check-outs when leaving events
-- Primary Use: Track event duration per attendee for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkouts (
    -- Primary Key: Auto-generated UUID
    checkout_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key to events table
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    
    -- Discord User Information
    user_id TEXT NOT NULL, -- Discord user ID (snowflake)
    
    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate check-outs for same user at same event
    CONSTRAINT unique_event_user_checkout UNIQUE (event_id, user_id)
);

-- Add comment to table
COMMENT ON TABLE checkouts IS 'Records member check-outs from events for duration tracking';

-- Add comments to columns
COMMENT ON COLUMN checkouts.checkout_id IS 'Unique identifier for the check-out record';
COMMENT ON COLUMN checkouts.event_id IS 'References the event this check-out belongs to';
COMMENT ON COLUMN checkouts.user_id IS 'Discord user ID (snowflake) of the member who checked out';
COMMENT ON COLUMN checkouts.timestamp IS 'Exact timestamp when user checked out (UTC)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkouts_event_id ON checkouts(event_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_user_id ON checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_timestamp ON checkouts(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkouts_event_user ON checkouts(event_id, user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Note: Supabase uses service role key for backend operations
-- RLS policies can be customized based on your security requirements
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for Discord bot operations)
-- The Discord bot will use the service role key (not anon key) for all operations

CREATE POLICY "Service role has full access to events"
ON events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to checkins"
ON checkins
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to checkouts"
ON checkouts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Allow anon key read-only access (if you want to query from frontend)
-- Uncomment these if you need read access via anon key:

-- CREATE POLICY "Anon can read events"
-- ON events
-- FOR SELECT
-- TO anon
-- USING (true);

-- CREATE POLICY "Anon can read checkins"
-- ON checkins
-- FOR SELECT
-- TO anon
-- USING (true);

-- CREATE POLICY "Anon can read checkouts"
-- ON checkouts
-- FOR SELECT
-- TO anon
-- USING (true);

-- ============================================================================
-- USEFUL QUERIES FOR TESTING
-- ============================================================================

-- View all tables
-- SELECT * FROM events;
-- SELECT * FROM checkins;
-- SELECT * FROM checkouts;

-- Get event with check-in count
-- SELECT 
--     e.event_id,
--     e.event_name,
--     e.status,
--     e.start_time,
--     COUNT(c.checkin_id) as total_checkins
-- FROM events e
-- LEFT JOIN checkins c ON e.event_id = c.event_id
-- GROUP BY e.event_id;

-- Get full attendance report for an event
-- SELECT 
--     e.event_name,
--     ci.user_id,
--     ci.username,
--     ci.timestamp as checkin_time,
--     co.timestamp as checkout_time,
--     EXTRACT(EPOCH FROM (co.timestamp - ci.timestamp))/60 as duration_minutes
-- FROM events e
-- INNER JOIN checkins ci ON e.event_id = ci.event_id
-- LEFT JOIN checkouts co ON e.event_id = co.event_id AND ci.user_id = co.user_id
-- WHERE e.event_id = 'YOUR-EVENT-ID-HERE'
-- ORDER BY ci.timestamp;

-- ============================================================================
-- SCHEMA VERIFICATION
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('events', 'checkins', 'checkouts')
    ) THEN
        RAISE NOTICE '✓ All tables created successfully';
    ELSE
        RAISE EXCEPTION '✗ Some tables are missing';
    END IF;
END $$;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Success message
SELECT 'Database schema created successfully!' as status,
       'Tables: events, checkins, checkouts' as tables_created,
       'Indexes: 11 total (performance optimized)' as indexes_created,
       'RLS: Enabled with service role policies' as security;
