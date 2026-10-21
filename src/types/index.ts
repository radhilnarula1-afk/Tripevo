export interface Preferences {
  groupSize: number;
  hasKids: boolean;
  activityLevel: 'chill' | 'moderate' | 'adventure';
  foodPreference: string;
  budgetRange: 'budget' | 'mid' | 'luxury';
  durationDays: number;
  vibeKeywords: string[];
}
export interface Itinerary {
  days: { day: number; title: string; desc: string; activities: any[] }[];
  hotels: any[];
  experiences: any[];
}