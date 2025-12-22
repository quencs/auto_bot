import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required Supabase environment variables. ' +
    'Please ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file.'
  );
}

// Create Supabase client
// Using anon key for Row Level Security (RLS) compliance
// The client will automatically handle connection pooling
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Don't persist auth sessions (bot doesn't need user auth)
  },
  db: {
    schema: 'public', // Use public schema (default)
  },
});

// Helper function to test database connection
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection test error:', err);
    return false;
  }
}

// Export for use in other modules
export default supabase;
