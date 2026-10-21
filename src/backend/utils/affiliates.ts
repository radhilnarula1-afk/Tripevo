/**
 * TripEvo Affiliate URL Builder Utilities
 *
 * All affiliate URLs are constructed here — never hardcoded in JSX.
 * Affiliate IDs come from environment variables for easy swap-in after sign-up.
 *
 * Programs:
 *  - Booking.com  → affiliate.booking.com     (up to 4% per booking)
 *  - Goibibo      → vcommission.com            (₹250–₹400 CPA)
 *  - GetYourGuide → partners.getyourguide.com  (8% per activity)
 *  - Zomato       → zomato.com/partners        (₹30–₹80 per order)
 */

export type TravelerType = 'solo' | 'couple' | 'children' | 'pets' | 'group';

export interface TripProfile {
  travelerType: TravelerType;
  adults: number;
  children?: number;
  hasPets?: boolean;
}

/**
 * Builds a Booking.com affiliate search URL personalised to the traveler type.
 * Applies smart filters: kids club for families, romantic properties for couples, etc.
 */
export function buildBookingURL(
  city: string,
  checkIn: string,   // YYYY-MM-DD
  checkOut: string,  // YYYY-MM-DD
  profile: TripProfile
): string {
  const aid = process.env.NEXT_PUBLIC_BOOKING_AID || 'PLACEHOLDER_BOOKING_AID';
  const base = 'https://www.booking.com/searchresults.html';

  const params = new URLSearchParams({
    aid,
    ss: city,
    checkin: checkIn,
    checkout: checkOut,
    group_adults: String(profile.adults),
    utm_source: 'TripEvo',
    utm_medium: 'affiliate',
  });

  // Traveler-type specific filters (from Blueprint PDF, Section 02)
  if (profile.travelerType === 'children' && profile.children) {
    params.set('group_children', String(profile.children));
    params.set('nflt', 'facility%3D28');  // Kids club filter
  } else if (profile.travelerType === 'couple') {
    params.set('nflt', 'property_type%3D204');  // Romantic properties
  } else if (profile.travelerType === 'pets' || profile.hasPets) {
    params.set('pets', '1');
  }

  return `${base}?${params.toString()}`;
}

/**
 * Builds a Goibibo hotel search URL tracked via VCommission (₹250–₹400 CPA).
 * Falls back to direct URL with UTM params until VCommission wrapper is set up.
 */
export function buildGoibiboURL(
  city: string,
  checkIn: string,   // YYYYMMDD format
  checkOut: string,  // YYYYMMDD format
  adults: number,
  children = 0
): string {
  const vcTracker = process.env.NEXT_PUBLIC_VCOMMISSION_TRACKER || '';
  const checkInFmt = checkIn.replace(/-/g, '');
  const checkOutFmt = checkOut.replace(/-/g, '');

  const base = 'https://www.goibibo.com/hotels/';
  const params = new URLSearchParams({
    city,
    checkin: checkInFmt,
    checkout: checkOutFmt,
    adults: String(adults),
    childs: String(children),
    rooms: '1',
    utm_source: 'TripEvo',
    utm_medium: 'affiliate',
  });

  const url = `${base}?${params.toString()}`;
  // Prepend VCommission click-tracker wrapper once registered
  return vcTracker ? `${vcTracker}?url=${encodeURIComponent(url)}` : url;
}

/**
 * Builds a GetYourGuide activity search URL.
 */
export function buildGetYourGuideURL(activityName: string, city: string): string {
  const partnerId = process.env.NEXT_PUBLIC_GYG_PARTNER_ID || 'PLACEHOLDER_GYG_ID';
  const params = new URLSearchParams({
    q: `${activityName} ${city}`,
    partner_id: partnerId,
    utm_source: 'TripEvo',
    utm_medium: 'affiliate',
  });
  return `https://www.getyourguide.com/s?${params.toString()}`;
}

/**
 * Builds a Zomato restaurant search deeplink for cafes near a destination.
 * Revenue: ₹30–₹80 per order. Register at zomato.com/partners.
 */
export function buildZomatoURL(city: string, cuisine = 'cafe'): string {
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const params = new URLSearchParams({
    q: cuisine,
    utm_source: 'TripEvo',
    utm_medium: 'affiliate',
  });
  return `https://www.zomato.com/${citySlug}/restaurants?${params.toString()}`;
}

/**
 * Builds a Google Maps nearby search URL — used as fallback when Zomato unavailable.
 * Does not generate affiliate revenue but builds user trust.
 */
export function buildGoogleMapsURL(query: string, near: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(query + ' near ' + near)}`;
}

/**
 * Estimates a nightly hotel rate based on destination and budget tier.
 * Used for the "Complete Your Trip" footer cost breakdown.
 */
export function estimateHotelNightlyRate(budgetTier: string): number {
  const rates: Record<string, number> = {
    budget: 1500,
    mid: 3500,
    premium: 8000,
    luxury: 18000,
  };
  return rates[budgetTier?.toLowerCase()] ?? 3500;
}

/**
 * Infers TravelerType from the app's travelers state string.
 */
export function inferTravelerType(travelers: string): TripProfile {
  const t = travelers?.toLowerCase() || '';
  if (t.includes('children') || t.includes('family') || t.includes('kids')) {
    return { travelerType: 'children', adults: 2, children: 2 };
  }
  if (t.includes('couple') || t.includes('2')) {
    return { travelerType: 'couple', adults: 2 };
  }
  if (t.includes('group') || t.includes('5+')) {
    return { travelerType: 'group', adults: 5 };
  }
  return { travelerType: 'solo', adults: 1 };
}
