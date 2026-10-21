export interface WeatherDay {
  dayName: string;
  emoji: string;
  temp: number;
  condition: string;
  precipChance: number;
  isRainy: boolean;
}

export interface WeatherForecastResult {
  latitude: number;
  longitude: number;
  locationName: string;
  country: string;
  forecast: WeatherDay[];
  alertMessage: string | null;
}

const WMO_CODE_MAP: Record<number, { emoji: string; desc: string; isRainy: boolean }> = {
  0: { emoji: '☀️', desc: 'Clear sky', isRainy: false },
  1: { emoji: '☀️', desc: 'Mainly clear', isRainy: false },
  2: { emoji: '⛅', desc: 'Partly cloudy', isRainy: false },
  3: { emoji: '☁️', desc: 'Overcast', isRainy: false },
  45: { emoji: '🌫️', desc: 'Foggy', isRainy: false },
  48: { emoji: '🌫️', desc: 'Depositing rime fog', isRainy: false },
  51: { emoji: '🌦️', desc: 'Light drizzle', isRainy: false },
  53: { emoji: '🌦️', desc: 'Moderate drizzle', isRainy: false },
  55: { emoji: '🌦️', desc: 'Heavy drizzle', isRainy: false },
  61: { emoji: '🌧️', desc: 'Slight rain', isRainy: true },
  63: { emoji: '🌧️', desc: 'Moderate rain', isRainy: true },
  65: { emoji: '🌧️', desc: 'Heavy rain', isRainy: true },
  71: { emoji: '❄️', desc: 'Slight snow fall', isRainy: false },
  73: { emoji: '❄️', desc: 'Moderate snow fall', isRainy: false },
  75: { emoji: '❄️', desc: 'Heavy snow fall', isRainy: false },
  77: { emoji: '❄️', desc: 'Snow grains', isRainy: false },
  80: { emoji: '🌧️', desc: 'Slight rain showers', isRainy: true },
  81: { emoji: '🌧️', desc: 'Moderate rain showers', isRainy: true },
  82: { emoji: '🌧️', desc: 'Violent rain showers', isRainy: true },
  85: { emoji: '❄️', desc: 'Slight snow showers', isRainy: false },
  86: { emoji: '❄️', desc: 'Heavy snow showers', isRainy: false },
  95: { emoji: '⛈️', desc: 'Thunderstorm', isRainy: true },
  96: { emoji: '⛈️', desc: 'Thunderstorm with slight hail', isRainy: true },
  99: { emoji: '⛈️', desc: 'Thunderstorm with heavy hail', isRainy: true },
};

function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export async function fetchWeatherForecast(destination: string): Promise<WeatherForecastResult | null> {
  try {
    // 1. Geocoding
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      destination
    )}&count=1&language=en&format=json`;
    
    const geocodeRes = await fetch(geocodeUrl);
    if (!geocodeRes.ok) {
      throw new Error(`Geocoding request failed: ${geocodeRes.status}`);
    }
    
    const geocodeData = await geocodeRes.json();
    if (!geocodeData.results || geocodeData.results.length === 0) {
      console.warn(`No geocoding results found for destination: ${destination}`);
      return null;
    }
    
    const { latitude, longitude, name, country } = geocodeData.results[0];
    
    // 2. Weather Forecast
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) {
      throw new Error(`Forecast request failed: ${forecastRes.status}`);
    }
    
    const forecastData = await forecastRes.json();
    if (!forecastData.daily) {
      throw new Error(`Invalid daily forecast data format`);
    }
    
    const daily = forecastData.daily;
    const forecast: WeatherDay[] = [];
    let rainyDayIndex = -1;
    let rainyDayName = '';
    
    for (let i = 0; i < daily.time.length; i++) {
      const code = daily.weathercode[i] ?? 0;
      const weatherMap = WMO_CODE_MAP[code] || { emoji: '☀️', desc: 'Clear sky', isRainy: false };
      const maxTemp = Math.round(daily.temperature_2m_max[i] ?? 25);
      const precip = Math.round(daily.precipitation_probability_max[i] ?? 0);
      const dayName = getDayName(daily.time[i]);
      const isRainy = weatherMap.isRainy || precip > 60;
      
      if (isRainy && rainyDayIndex === -1) {
        rainyDayIndex = i + 1;
        rainyDayName = dayName;
      }
      
      forecast.push({
        dayName,
        emoji: weatherMap.emoji,
        temp: maxTemp,
        condition: weatherMap.desc,
        precipChance: precip,
        isRainy
      });
    }
    
    let alertMessage: string | null = null;
    if (rainyDayIndex !== -1) {
      alertMessage = `⚠️ Rain forecast on Day ${rainyDayIndex} (${rainyDayName}). Indoor suggestions are available.`;
    }
    
    return {
      latitude,
      longitude,
      locationName: name,
      country,
      forecast: forecast.slice(0, 7), // ensure exactly 7 days
      alertMessage
    };
  } catch (error) {
    console.error(`Error in fetchWeatherForecast for ${destination}:`, error);
    return null;
  }
}
