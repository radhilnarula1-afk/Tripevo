import { supabase } from '@/backend/db/supabase';

export async function getCachedTrends(destination: string) {
  const slug = destination.toLowerCase().replace(/\s+/g, '-');
  try {
    const { data } = await supabase
      .from('destination_trends_cache')
      .select('*')
      .eq('destination_slug', slug)
      .single();
      
    if (data && new Date(data.expires_at) > new Date()) {
      const highlights = data.tavily_data?.trending || [];
      // If the cache contains old string format, invalidate it to force fresh fetch with URLs
      if (highlights.length > 0 && typeof highlights[0] === 'string') {
        console.log(`[Cache] Stale string-based trends cache detected for "${destination}" — invalidating to fetch URLs`);
        return null;
      }
      return {
        google_trend_score: data.google_trends?.score || 85,
        tavily_highlights: highlights,
        trending_now: highlights
      };
    }
  } catch (err) {
    console.log('Supabase cache fetch failed (likely not configured).');
  }
  return null;
}

export async function setCachedTrends(destination: string, trends: any) {
  const slug = destination.toLowerCase().replace(/\s+/g, '-');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  try {
    await supabase
      .from('destination_trends_cache')
      .upsert({
        destination_slug: slug,
        google_trends: { score: trends.google_trend_score },
        tavily_data: { trending: trends.trending_now },
        expires_at: expiresAt.toISOString()
      });
  } catch (err) {
    console.log('Supabase cache set failed.');
  }
}