CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE affiliate_partner AS ENUM ('hotel', 'experience', 'flight');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  plan user_plan DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE itineraries (
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

CREATE TABLE destination_trends_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_slug VARCHAR(200) UNIQUE NOT NULL,
  google_trends JSONB,
  reddit_data JSONB,
  tavily_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id),
  user_id UUID REFERENCES users(id),
  affiliate_type affiliate_partner,
  partner_name VARCHAR(100) NOT NULL,
  destination_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE visa_cache (
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