import googleTrends from 'google-trends-api';

export async function fetchGoogleTrends(destination: string) {
  try {
    const results = await googleTrends.interestOverTime({ 
      keyword: destination, 
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
    });
    const parsed = JSON.parse(results);
    const timelineData = parsed.default?.timelineData || [];
    const latestScore = timelineData.length > 0 ? timelineData[timelineData.length - 1].value[0] : 50;
    return { score: latestScore, status: 'live' };
  } catch (err) {
    console.error('Google Trends Error:', err);
    return { score: 75, status: 'fallback' };
  }
}

export async function fetchTavilyTrends(destination: string) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `What is trending right now in ${destination}? Looking for new places, events, and viral spots.`,
        search_depth: "basic",
        include_answer: false,
        max_results: 3
      })
    });
    
    if (!res.ok) throw new Error('Tavily fetch failed');
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
      return data.results.map((r: any) => ({
        title: r.title || 'Live local experience',
        url: r.url || `https://www.google.com/search?q=${encodeURIComponent(destination)}`
      }));
    }
    
    return [
      { title: 'Discovering unique local spots', url: `https://www.google.com/search?q=${encodeURIComponent(destination)}` },
      { title: 'Hidden gems off the beaten path', url: `https://www.google.com/search?q=${encodeURIComponent(destination)}` }
    ];
  } catch (err) {
    console.error('Tavily Fetch Error:', err);
    return [
      { title: 'Live local experiences', url: `https://www.google.com/search?q=${encodeURIComponent(destination)}` },
      { title: 'Pop-up events', url: `https://www.google.com/search?q=${encodeURIComponent(destination)}` }
    ];
  }
}

export async function getDestinationTrends(destination: string) {
  const [googleData, tavilyData] = await Promise.all([
    fetchGoogleTrends(destination),
    fetchTavilyTrends(destination)
  ]);

  return {
    google_trend_score: googleData.score,
    tavily_highlights: tavilyData,
    trending_now: tavilyData 
  };
}