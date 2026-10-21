import { NextResponse } from 'next/server';
import { generateItineraryData } from '@/backend/services/ai.service';
import { getDestinationTrends } from '@/backend/services/trends.service';
import { getCachedTrends, setCachedTrends } from '@/backend/services/cache.service';
import { createClient } from '@/backend/db/supabase/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { fetchWeatherForecast } from '@/lib/weather';

export async function POST(req: Request) {
  try {
    const { destination, preferences } = await req.json();
    
    // Check Cache for trends
    let trends = await getCachedTrends(destination);
    if (!trends) {
      trends = await getDestinationTrends(destination);
      setCachedTrends(destination, trends).catch(console.error);
    }

    // Bug 3 fix: Only fetch live weather if trip starts within 14 days (Open-Meteo forecast range)
    // If trip is further out, skip weather-based rescheduling to avoid false indoor-day warnings
    let weather = null;
    const dateStart = preferences.dateStart;
    let daysUntilTrip = 0;
    if (dateStart) {
      daysUntilTrip = Math.ceil((new Date(dateStart).getTime() - Date.now()) / 86400000);
    }

    if (!dateStart || daysUntilTrip <= 14) {
      // Trip is imminent — fetch real weather forecast
      const rawWeather = await fetchWeatherForecast(destination);
      if (rawWeather && dateStart && daysUntilTrip > 0) {
        // Offset the forecast array so forecast[0] = the actual travel start date
        const offsetForecast = rawWeather.forecast.slice(daysUntilTrip);
        // Pad with "unknown" if trip is longer than forecast remaining
        while (offsetForecast.length < (preferences.durationDays || 7)) {
          offsetForecast.push({ dayName: '?', emoji: '☀️ ', temp: 28, condition: 'Clear sky', precipChance: 0, isRainy: false });
        }
        weather = {
          ...rawWeather,
          forecast: offsetForecast.slice(0, preferences.durationDays || 7),
          // Recalculate alert for the offset window
          alertMessage: offsetForecast.some((d: any) => d.isRainy)
            ? `⚠️ Rain forecast during your trip. Indoor suggestions are available for wet days.`
            : null
        };
      } else {
        weather = rawWeather;
      }
    } else {
      // Trip is >14 days away — weather unknown, use seasonal estimate only
      console.log(`[TripEvo Weather] Trip to ${destination} starts in ${daysUntilTrip} days — skipping live forecast`);
    }

    // Generate weather-aware and vibe-aligned itinerary
    const itinerary = await generateItineraryData(destination, { ...preferences, weather }, trends);
    
    const itineraryId = uuidv4();
    const shareToken = Math.random().toString(36).substring(2, 10);
    
    // Save to DB (fails gracefully if Supabase isn't configured yet)
    // Bug 1 fix: store weather_data separately so the save-itinerary restore works even if preferences.weather is stripped
    try {
      const supabase = createClient(cookies());
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Ensure user exists in public.users to satisfy foreign key constraint
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser) {
          const { error: userInsertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatar_url: user.user_metadata?.avatar_url || null
            });
          if (userInsertError) {
            console.error('Failed to create user during itinerary generation:', userInsertError);
          }
        }
      }

      await supabase.from('itineraries').insert({
        id: itineraryId,
        user_id: user?.id || null,
        destination,
        preferences: { ...preferences, weather },
        itinerary_data: itinerary,
        weather_data: weather,
        share_token: shareToken,
        vibe_photo_ids: preferences.vibePhotoIds || [],
        vibe_tags: preferences.vibeTags || []
      });
    } catch (dbError) {
      console.log('Supabase not configured yet or error saving.', dbError);
    }

    return NextResponse.json({ 
      itinerary, 
      trends, 
      weather, 
      itinerary_id: itineraryId, 
      share_token: shareToken 
    });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}