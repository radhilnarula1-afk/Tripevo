-- WANDR.AI Combined Database Initialization & Migration Script

-- 1. Create Enums
CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE affiliate_partner AS ENUM ('hotel', 'experience', 'flight');

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  plan user_plan DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Itineraries Table
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  destination VARCHAR(200) NOT NULL,
  preferences JSONB NOT NULL,
  itinerary_data JSONB NOT NULL,
  share_token VARCHAR(32) UNIQUE,
  is_public BOOLEAN DEFAULT false,
  budget_total INTEGER,
  budget_currency VARCHAR(3) DEFAULT 'INR',
  cost_overrides JSONB,
  estimated_total_cost INTEGER,
  trip_start_date DATE,
  trip_end_date DATE,
  weather_data JSONB,
  weather_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add Vibe Check Columns to Itineraries
ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS vibe_photo_ids VARCHAR(50)[],
ADD COLUMN IF NOT EXISTS vibe_tags TEXT[];

-- 5. Destination Trends Cache Table
CREATE TABLE IF NOT EXISTS destination_trends_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_slug VARCHAR(200) UNIQUE NOT NULL,
  google_trends JSONB,
  reddit_data JSONB,
  tavily_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Affiliate Clicks Table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id),
  user_id UUID REFERENCES users(id),
  affiliate_type affiliate_partner,
  partner_name VARCHAR(100) NOT NULL,
  destination_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Visa Cache Table
CREATE TABLE IF NOT EXISTS visa_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_country VARCHAR(3) NOT NULL,
  destination_country VARCHAR(3) NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  visa_cost_usd INTEGER,
  max_stay_days INTEGER,
  processing_days INTEGER,
  official_link TEXT,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 8. Collab Sessions Table
CREATE TABLE IF NOT EXISTS collab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  collab_token VARCHAR(32) UNIQUE NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_members INT DEFAULT 10,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Itinerary Votes Table
CREATE TABLE IF NOT EXISTS itinerary_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  activity_slot_id VARCHAR(50) NOT NULL,
  voter_session_id VARCHAR(64) NOT NULL,
  vote VARCHAR(10) CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(itinerary_id, activity_slot_id, voter_session_id)
);
