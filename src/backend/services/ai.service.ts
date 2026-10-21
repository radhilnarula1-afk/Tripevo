import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');



export async function generateItineraryData(destination: string, preferences: any, trends: any) {
  const vibeInfo = preferences.vibeTags && preferences.vibeTags.length > 0
    ? `User selected experience preferences: ${preferences.vibeTags.join(', ')}.`
    : '';

  // The most important personalization signal: the specific activity biases the user picked
  const activityBiasInfo = preferences.activityBiases && preferences.activityBiases.length > 0
    ? `CRITICAL — User specifically selected these experiences for their trip to ${destination}:
${preferences.activityBiases.map((b: string, i: number) => `  ${i + 1}. ${b}`).join('\n')}
YOU MUST build every single day's activities around these preferences ONLY. Do NOT include generic activities that contradict these choices. For example, if the user did NOT select beaches, do NOT include beach activities — even if the destination has beaches.`
    : '';

  const weatherInfo = preferences.weather && preferences.weather.forecast
    ? `Real Weather Forecast for ${destination}: ${JSON.stringify(preferences.weather.forecast)}. Please assign the correct weather_emoji to each day's day object based on this forecast.`
    : '';

  // Inject the real geocoded coordinates from the weather API so the LLM
  // has the actual anchor coordinates for this specific destination.
  const geoCenter = preferences.weather
    ? `Geocoded center for ${destination}: latitude=${preferences.weather.latitude}, longitude=${preferences.weather.longitude}. All map_locations MUST use coordinates close to this center (within 0.5 degrees).`
    : `You MUST look up and use the real-world latitude and longitude for ${destination}. Do NOT use example coordinates.`;

  const days = preferences.durationDays || 7;
  const budgetTier = preferences.vibe || 'Premium Luxury';

  // Real-world per-day cost benchmarks (INR) by destination cost tier × budget level
  // These are approximate ranges — AI should use its knowledge to pick the right band
  const budgetGuide = `
BUDGET CALCULATION RULES — compute all budget figures from scratch based on real costs:
- Destination: "${destination}" — research its ACTUAL cost of living for tourists
- Trip duration: ${days} days
- Budget tier: "${budgetTier}"

Per-day cost benchmarks (INR) by destination type:
┌─────────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Destination Type    │ Backpacker       │ Balanced         │ Premium Luxury   │
├─────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Tier-1 Indian city  │ ₹2,000–4,000/day │ ₹5,000–9,000/day │₹12,000–22,000/day│
│ Tier-2 Indian city  │ ₹1,500–3,000/day │ ₹3,500–7,000/day │ ₹9,000–18,000/day│
│ NE India / Hills    │ ₹1,800–3,500/day │ ₹4,000–8,000/day │₹10,000–20,000/day│
│ Goa / Beach resorts │ ₹2,500–5,000/day │ ₹6,000–12,000/day│₹15,000–35,000/day│
│ SE Asia (Bali etc.) │ ₹3,000–6,000/day │ ₹7,000–15,000/day│₹18,000–40,000/day│
│ Middle East / Dubai │ ₹6,000–10,000/day│₹14,000–25,000/day│₹35,000–80,000/day│
│ Europe / Americas   │ ₹8,000–14,000/day│₹18,000–35,000/day│₹45,000–100,000/day│
│ Japan / Australia   │ ₹6,000–11,000/day│₹14,000–28,000/day│₹35,000–75,000/day│
└─────────────────────┴──────────────────┴──────────────────┴──────────────────┘

Pick the right tier for "${destination}" and multiply by ${days} days to get total_budget.
Split as: Accommodation ~40%, Activities ~30%, Food & Leisure ~30%.
budget_usage_pct should realistically reflect how stretched the budget is (60–90%, varies).
day_budget_est for each day should vary — some days are heavier (activity days) and some lighter (travel/rest days). DO NOT use the same number for all days.
All amounts must be INTEGERS formatted with Indian comma notation (e.g. "1,24,500" or "12,400").
DO NOT copy any example values — compute everything fresh from the destination and budget tier.`;

  const prompt = `You are TripEvo, an expert travel curator. Create a highly personalized ${days}-day travel itinerary for "${destination}".

${activityBiasInfo}

${budgetGuide}

${vibeInfo}
${weatherInfo}
${geoCenter}
Trending now at destination: ${JSON.stringify(trends)}

RULES — follow strictly:
1. Return ONLY a raw valid JSON object. No markdown, no backticks, no explanation text.
2. All content (days, activities, locations) must be SPECIFIC to "${destination}" — not generic.
3. If activityBiases were specified above, EVERY activity on EVERY day must align with those. Non-negotiable.
4. map_locations: An array containing the REAL named places/activities and coordinates for EACH activity listed in the days' activities list, tagged with the corresponding day number. Ensure every activity in the days list has a matching location entry in map_locations with accurate lat/lng coordinates near the geo center.
5. visa_info must reflect actual entry requirements for "${destination}" for an Indian passport holder.
6. budget figures must be freshly computed for "${destination}" + "${budgetTier}" — never copied from examples.
7. Weather Integration: Assign the correct weather_emoji to each day's object matching the weather forecast. Outdoor activities are allowed on any day, as the user will choose whether to apply indoor suggestions manually.

JSON structure (replace ALL placeholder values with real computed ones):
{
  "days": [
    {
      "day": 1,
      "title": "Specific day title for ${destination}",
      "desc": "Detailed description of specific places and experiences in ${destination}",
      "activities": ["Real Activity 1 in ${destination}", "Real Activity 2 in ${destination}"],
      "weather_emoji": "☀️",
      "day_budget_est": "<COMPUTE: realistic spend for this specific day>"
    }
  ],
  "map_locations": [
    {
      "day": 1,
      "name": "Real Activity 1 or place name in ${destination}",
      "lat": <REAL latitude>,
      "lng": <REAL longitude>
    }
  ],
  "total_budget": "<COMPUTE: days × per-day cost for ${destination} at ${budgetTier} tier>",
  "budget_usage_pct": <COMPUTE: realistic 60–90 integer>,
  "budget_categories": [
    { "name": "Accommodation", "amount": "<COMPUTE: ~40% of total>" },
    { "name": "Activities", "amount": "<COMPUTE: ~30% of total>" },
    { "name": "Food & Leisure", "amount": "<COMPUTE: ~30% of total>" }
  ],
  "visa_info": {
    "type": "Real visa type for Indian passport to ${destination}",
    "cost": "Real cost",
    "duration": "Real duration"
  }
}`;


  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy_key') {
    try {
      console.log(`[TripEvo] Using Groq openai/gpt-oss-120b for: ${destination}`);
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
              content: `You are TripEvo, a precision travel itinerary engine. You output ONLY raw JSON — never markdown, never prose. Every itinerary you produce is deeply specific to the exact destination requested. You always use real, accurate geographic coordinates for map locations.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          console.log(`[TripEvo] Groq generated itinerary for "${destination}" with ${parsed.days?.length || 0} days`);
          return parsed;
        }
      } else {
        const errText = await response.text();
        console.warn(`[TripEvo] Groq API error ${response.status}:`, errText);
      }
    } catch (groqError) {
      console.error('[TripEvo] Groq generation failed. Falling back to Gemini:', groqError);
    }
  }

  // Fallback to Gemini
  console.log(`[TripEvo] Using Gemini for: ${destination}`);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(responseText);
  } catch (e: any) {
    console.error('[TripEvo] Gemini generation error:', e);
    return {
      days: [],
      map_locations: [],
      total_budget: '0',
      budget_usage_pct: 0,
      budget_categories: [],
      visa_info: { type: 'N/A', cost: 'N/A', duration: 'N/A' }
    };
  }
}

export async function extractPlacesFromText(text: string): Promise<string[]> {
  const prompt = `You are an expert travel coordinator. Analyze the following text extracted from a travel blog, website, or social media post and extract a list of specific places, landmarks, restaurants, cafes, hotels, sights, or activities mentioned that a traveler could visit.
  
Rules:
1. Return ONLY a JSON array of strings representing the extracted places/activities. No markdown, no formatting, no backticks, no other text.
2. If no specific places are mentioned in the text, return an empty array [].
3. Make sure names are clean, recognizable, and distinct (e.g. "Ubud Sacred Monkey Forest" instead of just "monkey forest").

Text to analyze:
"""
${text}
"""

JSON array output format:
["Place Name 1", "Place Name 2"]`;

  try {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy_key') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) return parsed;
          if (parsed.places && Array.isArray(parsed.places)) return parsed.places;
          if (parsed.locations && Array.isArray(parsed.locations)) return parsed.locations;
          const values = Object.values(parsed);
          if (values.length > 0 && Array.isArray(values[0])) return values[0] as string[];
        }
      }
    }
    
    // Fallback to Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(responseText);
  } catch (error) {
    console.error('[TripEvo] Error extracting places from text:', error);
    return [];
  }
}

export async function regenerateDayIndoorData(destination: string, dayNumber: number, preferences: any) {
  const vibeInfo = preferences.vibeTags && preferences.vibeTags.length > 0
    ? `User selected experience preferences: ${preferences.vibeTags.join(', ')}.`
    : '';

  const activityBiasInfo = preferences.activityBiases && preferences.activityBiases.length > 0
    ? `The activities should still try to align with these biases where possible, but must prioritize being indoors: ${preferences.activityBiases.join(', ')}`
    : '';

  const geoCenter = preferences.weather
    ? `Geocoded center for ${destination}: latitude=${preferences.weather.latitude}, longitude=${preferences.weather.longitude}. All map_locations MUST use coordinates close to this center (within 0.5 degrees).`
    : `All map_locations MUST use coordinates close to the real latitude/longitude of ${destination}.`;

  const prompt = `You are TripEvo, an expert travel curator. Rewrite Day ${dayNumber} of a trip to "${destination}" to be strictly indoor-only because of bad weather (heavy rain or thunderstorm).
  
CRITICAL INDOOR-ONLY RULES:
- EVERY activity scheduled for this day MUST be strictly indoor-only (e.g. covered museums, indoor art galleries, cooking classes, shopping malls, spas, wellness retreats, indoor markets, cafes, covered historic sites).
- DO NOT schedule any outdoor activities (e.g. outdoor temple walks, hikes, forests, viewpoints, boat tours, outdoor gardens, beaches, or open-air walking tours are strictly forbidden).
- All content must be deeply specific to "${destination}".
- You MUST return a valid JSON object matching the exact structure below. Do NOT wrap in markdown, do NOT output code blocks, do NOT include explanation text.

${activityBiasInfo}
${vibeInfo}
${geoCenter}

JSON structure:
{
  "day": {
    "day": ${dayNumber},
    "title": "Specific indoor day title for ${destination}",
    "desc": "Detailed description of specific indoor places and experiences in ${destination}",
    "activities": ["Real Indoor Activity 1 in ${destination}", "Real Indoor Activity 2 in ${destination}", "Real Indoor Activity 3 in ${destination}"],
    "weather_emoji": "⛈️",
    "day_budget_est": "Realistic spend amount in INR for this day"
  },
  "map_locations": [
    {
      "day": ${dayNumber},
      "name": "Real Indoor Activity 1 or place name in ${destination}",
      "lat": <REAL latitude>,
      "lng": <REAL longitude>
    }
  ]
}`;


  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy_key') {
    try {
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
              content: `You are TripEvo, a precision travel intelligence engine. You output ONLY raw JSON matching the requested schema. You never write markdown code blocks, prose, or introductions.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      }
    } catch (err) {
      console.error('[TripEvo] Groq day reschedule failed. Falling back to Gemini:', err);
    }
  }

  // Fallback to Gemini 1.5 Flash
  console.log(`[TripEvo] Rescheduling Day ${dayNumber} of ${destination} for bad weather using Gemini`);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(responseText);
  } catch (e: any) {
    console.error('[TripEvo] Gemini day reschedule error:', e);
    return {
      day: {
        day: dayNumber,
        title: "Rainy Day Indoor Activities",
        desc: `Explore indoor museums, cozy cafes, and local indoor markets in ${destination} to stay dry.`,
        activities: ["Visit a local covered market", "Cozy up in a local cafe", "Explore a prominent history museum"],
        weather_emoji: "⛈️",
        day_budget_est: "5,000"
      },
      map_locations: []
    };
  }
}