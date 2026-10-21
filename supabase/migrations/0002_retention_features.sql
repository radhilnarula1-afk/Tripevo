-- 1. Add Vibe Check Columns to itineraries
ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS vibe_photo_ids VARCHAR(50)[],
ADD COLUMN IF NOT EXISTS vibe_tags TEXT[];

-- 2. Create Collab Sessions Table
CREATE TABLE IF NOT EXISTS collab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  collab_token VARCHAR(32) UNIQUE NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_members INT DEFAULT 10,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Itinerary Votes Table
CREATE TABLE IF NOT EXISTS itinerary_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  activity_slot_id VARCHAR(50) NOT NULL,
  voter_session_id VARCHAR(64) NOT NULL,
  vote VARCHAR(10) CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(itinerary_id, activity_slot_id, voter_session_id)
);
