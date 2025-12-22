<!--
SYNC IMPACT REPORT - Constitution Version 1.1.0
===============================================
Version Change: 1.0.0 → 1.1.0 (Minor amendment - new principle added)

Established Principles:
- I. Event-Driven Architecture (unchanged)
- II. Data Integrity & Tracking (AMENDED - added Supabase requirement)
- III. Time-Based Automation (AMENDED - changed to manual close instead of auto-close)
- IV. Discord API Best Practices (unchanged)
- V. Observability & Debugging (renumbered to VII, AMENDED - added database logging)
- VI. User Interaction Transparency (NEW - check-in announcements, silent check-outs, button-based export)

Technical Constraints Updates:
- Technology Stack: Added Supabase (@supabase/supabase-js) requirement
- Data Storage: Changed from generic storage to mandatory Supabase PostgreSQL with specific schema
- Performance Standards: Added database operation performance requirement (2 seconds)
- Deployment: Added Supabase connectivity requirement

Development Standards Updates:
- Error Handling: Added database error handling requirements
- Code Organization: Added data access layer requirement
- Testing Requirements: Added database operation testing
- Documentation: Added Supabase setup and database migration scripts

Compliance Review Updates:
- Added database credential security check

Bump Rationale: 
- New principle (VI) added - MINOR version bump
- Significant amendments to existing principles (II, III)
- Changed from auto-close to manual close architecture
- Mandatory Supabase database backend

Templates Status:
- ✅ plan-template.md (needs review - database architecture added)
- ✅ spec-template.md (already updated with Supabase requirements)
- ✅ tasks-template.md (needs review - database tasks required)

Follow-up Items: 
- Update implementation plan to include Supabase setup and schema creation
- Create database migration scripts
- Update testing strategy for database operations

Commit Message: docs: amend constitution v1.1.0 - add Supabase requirement and manual event closure
-->

# Discord Check-In/Check-Out App Constitution

## Core Principles

### I. Event-Driven Architecture
All check-in/check-out operations MUST be triggered by user interactions or time-based events. Each event check-in MUST create an isolated text channel. Events MUST track their start time independently from channel creation time to enable accurate auto-close scheduling.

**Rationale**: Event isolation prevents cross-contamination of user data. Independent start time tracking ensures the 15-minute auto-close timer is based on event semantics, not implementation details.

### II. Data Integrity & Tracking
Every user interaction MUST capture Discord user information (user ID, username, discriminator) and precise timestamps (ISO 8601 format with timezone). Check-in and check-out records MUST be immutable once created. All data MUST persist reliably in Supabase (PostgreSQL) database to prevent loss during bot restarts or crashes. Database operations MUST handle connection failures gracefully.

**Rationale**: User accountability and audit trails require immutable, timestamped records. Discord user IDs ensure accurate tracking even when usernames change. Supabase provides reliable cloud-based PostgreSQL database with ACID compliance and data durability.

### III. Time-Based Automation
Each event MUST define an explicit event start time. Check-in button MUST enable at event start time. Admin MUST be able to manually close events at any time. When admin closes an event, check-in button MUST disable and check-out button MUST enable. Check-out button MUST automatically disable 15 minutes after admin closes the event. All scheduled tasks MUST be resilient to bot restarts and recoverable from persistent storage.

**Rationale**: Predictable event lifecycles based on domain time (event start) rather than technical time (channel creation) provide better user experience. Manual close gives admins flexibility to end events when they actually finish. 15-minute check-out window provides reasonable time for attendees to check out. Persistence ensures reliability.

### IV. Discord API Best Practices
All Discord API interactions MUST handle rate limits gracefully with exponential backoff. Channel creation, permission management, and message operations MUST validate responses and handle failures. Bot MUST request only minimum required permissions (Manage Channels, Send Messages, Read Message History).

**Rationale**: Discord API reliability requires defensive programming. Minimal permissions reduce security risk and simplify bot approval process.

### VI. User Interaction Transparency
Check-in actions MUST provide immediate visual feedback to the entire channel. When a user checks in, the bot MUST post an announcement message displaying the user's name and check-in timestamp. Check-out actions MUST NOT post announcement messages to reduce channel noise. Export functionality MUST be button-based for ease of use, not command-based.

**Rationale**: Visible check-in announcements create social accountability and event atmosphere, encouraging participation. Silent check-outs prevent spam during event endings. Button-based export provides intuitive admin experience without memorizing commands.

### VII. Observability & Debugging
All state transitions (check-in, check-out, event start, manual close, check-out auto-disable) MUST emit structured logs with timestamps, user IDs, and event context. Errors MUST log full context including Discord API responses and database errors. Logs MUST be queryable by event ID, user ID, and timestamp range. Database operations MUST log query execution times for performance monitoring.

**Rationale**: Structured logging enables debugging production issues, auditing user actions, and monitoring system health without code changes. Database query logging helps identify performance bottlenecks.

## Technical Constraints

**Technology Stack**: Node.js (>=18.x) with discord.js library for Discord Bot API integration. Supabase (@supabase/supabase-js) for database operations with PostgreSQL backend. Environment variables for configuration (.env file with SUPABASE_URL, SUPABASE_KEY, DISCORD_TOKEN, DISCORD_APP_ID - never commit secrets).

**Data Storage**: Supabase (PostgreSQL-based cloud database) MUST be used for all data persistence. Database schema MUST include: events table (event_id, event_name, channel_id, start_time, status, created_at), check-ins table (checkin_id, event_id, user_id, username, discriminator, timestamp), check-outs table (checkout_id, event_id, user_id, timestamp). MUST survive bot restarts. MUST support atomic writes and proper foreign key relationships.

**Performance Standards**: Check-in/check-out operations MUST respond within 3 seconds. Channel creation MUST complete within 5 seconds. Database operations MUST complete within 2 seconds under normal conditions. Auto-disable timer precision within ±30 seconds acceptable.

**Deployment**: Bot MUST run as long-lived process (not serverless). MUST support graceful shutdown (cleanup pending timers, close database connections). MUST restart automatically on crashes. MUST have network connectivity to Supabase cloud database.

## Development Standards

**Error Handling**: All Discord API calls MUST be wrapped in try-catch blocks. All Supabase database operations MUST handle connection errors, timeouts, and constraint violations gracefully. User-facing errors MUST provide actionable messages. Internal errors MUST log full stack traces without exposing to users. Database connection failures MUST be retried with exponential backoff.

**Code Organization**: Separate concerns: Discord interaction handling, business logic (event management, user tracking), data persistence (Supabase client), scheduled tasks. Each module MUST be independently testable. Database queries MUST be encapsulated in a data access layer.

**Testing Requirements**: Critical paths (check-in, check-out, admin close trigger, check-out auto-disable) MUST have integration tests. Discord API interactions MUST be mockable. Database operations MUST be testable with mock Supabase client. Edge cases (concurrent check-ins, restart during events, database failures) MUST be tested.

**Documentation**: All slash commands MUST have clear descriptions and parameter help text. README MUST include setup instructions (Discord app creation, Supabase project setup, environment variables, permissions). Data schemas MUST be documented (database tables, event structure, user record format). Database migration scripts MUST be provided for schema setup.

## Governance

This constitution supersedes all ad-hoc decisions. All feature changes MUST align with core principles or propose amendments with rationale. Complexity not justified by principles MUST be rejected in favor of simpler alternatives.

**Amendment Process**: Proposed amendments MUST document: (1) principle/section being changed, (2) justification with concrete examples, (3) impact on existing features, (4) migration plan if breaking changes required. Amendments MUST increment version (MAJOR for principle removal/redefinition, MINOR for new principles, PATCH for clarifications).

**Compliance Review**: All pull requests MUST verify adherence to principles. Code reviews MUST check: Supabase data persistence implementation, timestamp handling, error handling coverage (including database errors), structured logging presence. Violations require justification or rework. Database credentials MUST never be committed to source control.

**Development Guidance**: Use this constitution to evaluate design decisions. When uncertain, prefer solutions that maximize observability, data integrity, and user clarity over implementation convenience.

**Version**: 1.1.0 | **Ratified**: 2025-12-22 | **Last Amended**: 2025-12-22
