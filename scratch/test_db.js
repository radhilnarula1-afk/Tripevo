const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'undefined');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('\n--- Fetching user sessions/auth ---');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers().catch(err => ({ error: err }));
  if (usersError) {
    console.log('List users failed (expected if admin key is needed):', usersError.message);
  } else {
    console.log('Users found:', users.map(u => ({ id: u.id, email: u.email })));
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser();
  console.log('Auth GetUser:', authUser, authError);

  console.log('\n--- Fetching itineraries ---');
  const { data, error } = await supabase
    .from('itineraries')
    .select('id, user_id, destination, created_at')
    .limit(10);
  
  if (error) {
    console.error('Error fetching itineraries:', error.message);
  } else {
    console.log('Fetched itineraries (limit 10):');
    console.log(data);
  }
}

test();
