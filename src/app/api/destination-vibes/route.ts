import { NextResponse } from 'next/server';

function getFallbackBudgetRecommendation(destination: string) {
  const d = destination.toLowerCase();
  if (d.includes('dubai') || d.includes('uae')) {
    return {
      currency: 'INR',
      recommended_daily: 18000,
      min_daily: 6000,
      max_daily: 80000,
      tier_ranges: {
        budget: [6000, 10000],
        comfort: [10000, 25000],
        luxury: [25000, 80000]
      }
    };
  }
  if (d.includes('london') || d.includes('europe') || d.includes('paris') || d.includes('swiss') || d.includes('usa') || d.includes('america') || d.includes('new york')) {
    return {
      currency: 'INR',
      recommended_daily: 25000,
      min_daily: 8000,
      max_daily: 100000,
      tier_ranges: {
        budget: [8000, 14000],
        comfort: [14000, 35000],
        luxury: [35000, 100000]
      }
    };
  }
  if (d.includes('bali') || d.includes('thailand') || d.includes('vietnam') || d.includes('asia') || d.includes('maldives') || d.includes('goa')) {
    return {
      currency: 'INR',
      recommended_daily: 8000,
      min_daily: 2500,
      max_daily: 35000,
      tier_ranges: {
        budget: [2500, 6000],
        comfort: [6000, 15000],
        luxury: [15000, 35000]
      }
    };
  }
  // Default/Indian domestic fallback
  return {
    currency: 'INR',
    recommended_daily: 5000,
    min_daily: 1500,
    max_daily: 18000,
    tier_ranges: {
      budget: [1500, 3500],
      comfort: [3500, 9000],
      luxury: [9000, 18000]
    }
  };
}

export async function POST(req: Request) {
  try {
    const { destination } = await req.json();
    if (!destination) {
      return NextResponse.json({ error: 'Missing destination' }, { status: 400 });
    }

    const prompt = `You are a travel intelligence expert. Analyze the destination "${destination}" and return destination-specific experience categories and tourist budget profiles.
    
RULES:
1. Return ONLY raw valid JSON. No markdown, no backticks, no explanation.
2. Generate exactly 10 to 12 vibe options SPECIFIC to "${destination}".
3. Each vibe must reflect what "${destination}" is ACTUALLY known for:
   - Guwahati → river cruises, wildlife safari, Kamakhya temple, Assamese cuisine, tea gardens — NOT beaches, surfing, or snorkeling
   - Bali → beach clubs, surfing, rice terraces, temple ceremonies, nightlife — NOT mountain skiing or desert safaris
   - Rajasthan → fort exploration, camel safari, royal dining, folk music, desert camping — NOT beaches or water sports
   - Paris → fine dining, art museums, fashion shopping, river cruises, cabaret — NOT wildlife or desert camping
4. Include diverse types: nature, culture, food, wellness, adventure, nightlife (only if relevant), spiritual, shopping
5. Always include at least one food/dining option and one cultural option
6. icon must be one of these exact string values (pick the most fitting): "compass", "mountain", "utensils", "leaf", "moon", "camera", "temple", "waves", "zap", "heart", "users", "coffee", "shopping-bag", "music", "boat", "tent", "binoculars", "flame", "feather", "gem"
7. tags: 2-4 lowercase keywords used by the itinerary AI to pick specific activities
8. activityBias: short 3-6 word phrase describing what to include in the itinerary for this vibe
9. category: one of "Nature", "Culture", "Food", "Wellness", "Nightlife", "Adventure", "Leisure", "Family", "Spiritual"
10. budget_recommendation: Include a dynamic destination-aware budget guide in INR. Estimate the daily budget ranges (inclusive) for a traveler based on real-world local costs of living and tourist travel expenses for:
   - "budget" (e.g. hostels, local transport, local eateries)
   - "comfort" (e.g. mid-range hotels/cafes, taxi, standard entry tickets)
   - "luxury" (e.g. premium hotels, fine dining, private tours/transfers)
   Also calculate a specific "recommended_daily" daily budget (integer) which is a smart choice for a balanced trip.

Return this EXACT JSON structure:
{
  "destination_summary": "One sentence describing what ${destination} is best known for as a travel destination.",
  "vibes": [
    {
      "id": "unique_snake_case_id",
      "icon": "temple",
      "label": "Fort & Heritage Walks",
      "tags": ["heritage", "history", "architecture", "cultural"],
      "activityBias": "Forts, palaces, heritage trails",
      "category": "Culture"
    }
  ],
  "budget_recommendation": {
    "currency": "INR",
    "recommended_daily": 14000,
    "min_daily": 3000,
    "max_daily": 80000,
    "tier_ranges": {
      "budget": [3000, 8000],
      "comfort": [8000, 25000],
      "luxury": [25000, 80000]
    }
  }
}`;

    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy_key') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: 'You are a precision travel intelligence engine. Output ONLY raw JSON. Never output markdown, prose, or code blocks.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return NextResponse.json(parsed);
        }
      }
    }

    // Fallback generic vibes
    return NextResponse.json({
      destination_summary: `${destination} offers a rich mix of cultural, natural, and culinary experiences.`,
      vibes: [
        { id: 'local_food', icon: 'utensils', label: 'Local Food Experiences', tags: ['local', 'food', 'culinary', 'street food'], activityBias: 'Local restaurants, street food, markets', category: 'Food' },
        { id: 'cultural_sites', icon: 'temple', label: 'Cultural & Heritage Sites', tags: ['cultural', 'history', 'architecture', 'heritage'], activityBias: 'Museums, heritage sites, temples', category: 'Culture' },
        { id: 'nature_walks', icon: 'leaf', label: 'Nature & Scenic Walks', tags: ['nature', 'hiking', 'outdoors', 'scenic'], activityBias: 'Parks, trails, nature reserves', category: 'Nature' },
        { id: 'relaxed_spa', icon: 'heart', label: 'Spa & Wellness', tags: ['spa', 'wellness', 'relaxation', 'chill'], activityBias: 'Spas, yoga, wellness retreats', category: 'Wellness' },
        { id: 'nightlife', icon: 'moon', label: 'Nightlife & Bars', tags: ['nightlife', 'social', 'urban', 'bars'], activityBias: 'Bars, cafes, night markets', category: 'Nightlife' },
        { id: 'shopping', icon: 'shopping-bag', label: 'Markets & Shopping', tags: ['shopping', 'markets', 'local crafts', 'souvenirs'], activityBias: 'Local markets, bazaars, boutiques', category: 'Leisure' },
        { id: 'photography', icon: 'camera', label: 'Photography & Sightseeing', tags: ['photography', 'scenic', 'sightseeing', 'viewpoints'], activityBias: 'Viewpoints, scenic spots, landmarks', category: 'Leisure' },
        { id: 'veg_food', icon: 'feather', label: 'Vegetarian / Vegan', tags: ['vegetarian', 'vegan', 'healthy', 'plant-based'], activityBias: 'Veg restaurants, healthy cafes', category: 'Food' },
        { id: 'adventure', icon: 'zap', label: 'Adventure Activities', tags: ['adventure', 'sports', 'active', 'thrilling'], activityBias: 'Adventure sports, outdoor activities', category: 'Adventure' },
        { id: 'family_fun', icon: 'users', label: 'Family-Friendly Fun', tags: ['family', 'kids', 'safe', 'fun'], activityBias: 'Kid-friendly activities, parks, shows', category: 'Family' }
      ],
      budget_recommendation: getFallbackBudgetRecommendation(destination)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
