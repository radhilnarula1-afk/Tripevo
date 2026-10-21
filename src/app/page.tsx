'use client';

import React, { useState, useEffect } from 'react';
import DateRangePicker from '@/frontend/components/DateRangePicker';
import { VibeCheck } from '@/frontend/components/preferences/VibeCheck';
import { createClient } from '@/backend/db/supabase/client';
import HeroSection from '@/frontend/components/HeroSection';
import ContentParser from '@/frontend/components/ContentParser';
import DayDiscoveryWidget from '@/frontend/components/itinerary/DayDiscoveryWidget';
import VisaRequirementWidget from '@/frontend/components/VisaRequirementWidget';
import TrendPanel from '@/frontend/components/trends/TrendPanel';
import AuthButton from '@/frontend/components/AuthButton';
import CollabChat from '@/frontend/components/collab/CollabChat';
import CollabFeatureBanner from '@/frontend/components/collab/CollabFeatureBanner';
import { buildBookingURL, buildGoibiboURL, buildGetYourGuideURL, buildZomatoURL, buildGoogleMapsURL, estimateHotelNightlyRate, inferTravelerType } from '@/backend/utils/affiliates';

interface DayItinerary {
  day: number;
  title: string;
  desc: string;
  activities: string[];
  weather_emoji?: string;
  day_budget_est?: string;
}

interface MapLocation {
  name: string;
  top: number;
  left: number;
}

interface BudgetCategory {
  name: string;
  amount: string;
}

interface VisaInfo {
  type: string;
  cost: string;
  duration: string;
}

interface ItineraryData {
  days: DayItinerary[];
  map_locations: MapLocation[];
  total_budget: string;
  budget_usage_pct: number;
  budget_categories: BudgetCategory[];
  visa_info?: VisaInfo;
}

interface WeatherDay {
  dayName: string;
  emoji: string;
  temp: number;
  condition: string;
  precipChance: number;
  isRainy: boolean;
}

interface WeatherForecast {
  latitude: number;
  longitude: number;
  locationName: string;
  country: string;
  forecast: WeatherDay[];
  alertMessage: string | null;
}

interface CollabActivity {
  id: string;
  day: number;
  title: string;
  proposedBy: string;
  votes: number;
  userVoted: 'up' | 'down' | null;
  comment?: {
    author: string;
    text: string;
    avatarClass: string;
  };
}

interface ChatMessage {
  id: string;
  sender: string;
  avatarClass: string;
  text: string;
  timestamp: string;
  votes: number;
  userVoted: 'up' | 'down' | null;
  isSuggestion?: boolean;
  dayAssociation?: number;
}

export default function TripEvoApp() {
  const supabase = createClient();

  // Global App States
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [travelers, setTravelers] = useState('1 Traveler');
  const [budgetLevel, setBudgetLevel] = useState('Premium Luxury');
  const [loading, setLoading] = useState(false);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  
  // Loaded Generation States
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [shareToken, setShareToken] = useState('');
  const [itineraryId, setItineraryId] = useState('');

  // Auth & Saved Trips States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // UI Interactive States
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeActivityName, setActiveActivityName] = useState<string | null>(null);
  const [collabLinkCopied, setCollabLinkCopied] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [extractedIdeas, setExtractedIdeas] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePreferences, setActivePreferences] = useState<any>(null);
  const [reschedulingDays, setReschedulingDays] = useState<Record<number, boolean>>({});
  const [rescheduledDays, setRescheduledDays] = useState<Record<number, boolean>>({});

  const handleRescheduleDayForIndoor = async (dayIdx: number) => {
    if (!itinerary) return;
    setReschedulingDays(prev => ({ ...prev, [dayIdx]: true }));
    try {
      const response = await fetch('/api/regenerate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          dayNumber: dayIdx + 1,
          preferences: activePreferences || {
            vibe: budgetLevel,
            activityBiases: [],
            vibeTags: [],
            vibePhotoIds: [],
            weather: weather
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Reschedule API failed');
      }

      const data = await response.json();
      if (data.day) {
        // 1. Update itinerary days
        const updatedDays = itinerary.days.map((day, idx) => {
          if (idx === dayIdx) {
            return {
              ...day,
              title: data.day.title,
              desc: data.day.desc,
              activities: data.day.activities,
              weather_emoji: data.day.weather_emoji || '⛈️',
              day_budget_est: data.day.day_budget_est || day.day_budget_est
            };
          }
          return day;
        });

        // 2. Update map locations
        const updatedMapLocs = itinerary.map_locations.filter((loc: any) => loc.day !== dayIdx + 1);
        if (data.map_locations) {
          updatedMapLocs.push(...data.map_locations);
        }

        setItinerary({
          ...itinerary,
          days: updatedDays,
          map_locations: updatedMapLocs
        });

        setRescheduledDays(prev => ({ ...prev, [dayIdx]: true }));
        triggerCustomToast(`Day ${dayIdx + 1} rescheduled for indoor activities!`);
      } else {
        throw new Error('No day data returned');
      }
    } catch (err) {
      console.error(err);
      triggerCustomToast('Failed to reschedule day. Please try again.');
    } finally {
      setReschedulingDays(prev => ({ ...prev, [dayIdx]: false }));
    }
  };

  const triggerCustomToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleAddIdeaToDay = (idea: string) => {
    if (!itinerary) return;
    const updatedDays = itinerary.days.map((day, idx) => {
      if (idx === activeDayIdx) {
        return {
          ...day,
          activities: [...day.activities, idea]
        };
      }
      return day;
    });
    setItinerary({
      ...itinerary,
      days: updatedDays,
      map_locations: [
        ...itinerary.map_locations,
        {
          name: idea,
          day: activeDayIdx + 1,
          top: 50 + (Math.random() - 0.5) * 20,
          left: 50 + (Math.random() - 0.5) * 20,
          lat: (weather?.latitude ?? 20) + (Math.random() - 0.5) * 0.04,
          lng: (weather?.longitude ?? 0) + (Math.random() - 0.5) * 0.04
        } as any
      ]
    });
    setExtractedIdeas(prev => prev.filter(x => x !== idea));
  };

  // Live Group Collaboration Simulation state
  const [collabActivities, setCollabActivities] = useState<CollabActivity[]>([
    {
      id: 'c1',
      day: 1,
      title: 'Private sunset catamaran cruise around coastal cliffs',
      proposedBy: 'Rajiv (You)',
      votes: 4,
      userVoted: null,
      comment: {
        author: 'Aria',
        text: 'This looks stunning, definitely voting yes! Fits our vibe perfectly.',
        avatarClass: 'av-purple'
      }
    },
    {
      id: 'c2',
      day: 3,
      title: 'Secret jungle waterfall canyoning expedition',
      proposedBy: 'Kabir',
      votes: 2,
      userVoted: null
    },
    {
      id: 'c3',
      day: 5,
      title: 'Michelin-starred organic fusion dinner reservation',
      proposedBy: 'Zara',
      votes: 5,
      userVoted: null,
      comment: {
        author: 'Kabir',
        text: 'Heard they have a 2-month waiting list but TripEvo priority booking bypassed it!',
        avatarClass: 'av-orange'
      }
    }
  ]);

  // Collaborative Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'Aria',
      avatarClass: 'av-purple',
      text: 'Hey everyone! Welcome to TripEvo active co-planning sandbox. Bali coordinates loaded!',
      timestamp: '12:04 PM',
      votes: 3,
      userVoted: null
    },
    {
      id: 'm2',
      sender: 'Zara',
      avatarClass: 'av-orange',
      text: 'This is gorgeous! The sunset catamaran cruise on Day 1 looks absolutely perfect. I already voted yes!',
      timestamp: '12:05 PM',
      votes: 5,
      userVoted: null
    }
  ]);
  
  const [groupCode, setGroupCode] = useState('TEVE-8Y4B');
  const [inputGroupCode, setInputGroupCode] = useState('');
  const [isSyncingSession, setIsSyncingSession] = useState(false);
  const [isSessionConnected, setIsSessionConnected] = useState(false);
  const [isSimulatingGroup, setIsSimulatingGroup] = useState(true);
  const [collabConnectionStatus, setCollabConnectionStatus] = useState<'idle' | 'connected_supabase' | 'connected_local'>('idle');
  const [activePlannersCount, setActivePlannersCount] = useState(1);

  // Visa checker nationality & state
  const [visaNationality, setVisaNationality] = useState('Indian');
  const [isVisaLoading, setIsVisaLoading] = useState(false);
  const [visaCards, setVisaCards] = useState([
    {
      id: 'bali',
      dest: 'Bali, Indonesia',
      status: 'Visa on Arrival',
      cost: '₹2,700 / 500,000 IDR',
      duration: '30 Days (Extendable)',
      req: 'Passport must be valid for at least 6 months with 2 blank pages.',
      link: 'https://molina.imigrasi.go.id/',
      badgeClass: 'blue',
      cardClass: 'visa-arrival'
    },
    {
      id: 'japan',
      dest: 'Tokyo, Japan',
      status: 'Short-term eVisa',
      cost: '3,000 JPY (approx. ₹1,650)',
      duration: '90 Days max',
      req: 'Issued within 5 working days online. Indian passport eligible.',
      link: 'https://www.evisa.mofa.go.jp/',
      badgeClass: 'cyan',
      cardClass: 'visa-evisa'
    },
    {
      id: 'maldives',
      dest: 'Maldives Islands',
      status: 'Free Visa on Arrival',
      cost: 'Free / No charge',
      duration: '30 Days',
      req: 'Requires pre-booked hotel confirmation and IMUGA declaration.',
      link: 'https://imuga.immigration.gov.mv/',
      badgeClass: 'green',
      cardClass: 'visa-free'
    }
  ]);
  const [customVisaDetail, setCustomVisaDetail] = useState<{ status: string; description: string; link?: string; cost?: string; duration?: string } | null>(null);

  // Fetch visa requirements for the three hardcoded cards dynamically
  const fetchVisaRequirements = async (nationalityName: string) => {
    if (!nationalityName.trim()) return;
    setIsVisaLoading(true);
    try {
      const destinations = [
        { id: 'bali', name: 'Bali, Indonesia' },
        { id: 'japan', name: 'Tokyo, Japan' },
        { id: 'maldives', name: 'Maldives Islands' }
      ];
      
      const updatedCards = await Promise.all(
        destinations.map(async (d) => {
          try {
            const res = await fetch('/api/visa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nationality: nationalityName, destination: d.name })
            });
            if (res.ok) {
              const data = await res.json();
              if (data) {
                const statusLower = (data.status || '').toLowerCase();
                let badgeClass = 'blue';
                let cardClass = 'visa-arrival';
                if (statusLower.includes('free') || statusLower.includes('exempt')) {
                  badgeClass = 'green';
                  cardClass = 'visa-free';
                } else if (statusLower.includes('e-visa') || statusLower.includes('evisa')) {
                  badgeClass = 'cyan';
                  cardClass = 'visa-evisa';
                } else if (statusLower.includes('required') || statusLower.includes('embassy')) {
                  badgeClass = 'amber';
                  cardClass = 'visa-required';
                }
                
                return {
                  id: d.id,
                  dest: d.name,
                  status: data.status || 'Visa Required',
                  cost: data.cost || 'Varies',
                  duration: data.duration || 'Varies',
                  req: data.description || '',
                  link: data.link || '',
                  badgeClass,
                  cardClass
                };
              }
            }
          } catch (e) {
            console.error('Error fetching visa details for', d.id, e);
          }
          // Return default if error
          return visaCards.find(c => c.id === d.id) || {
            id: d.id,
            dest: d.name,
            status: 'Unknown',
            cost: 'Unknown',
            duration: 'Unknown',
            req: 'Unable to load details.',
            link: '',
            badgeClass: 'blue',
            cardClass: 'visa-arrival'
          };
        })
      );
      
      setVisaCards(updatedCards);
    } catch (err) {
      console.error('Error updating visa cards:', err);
    } finally {
      setIsVisaLoading(false);
    }
  };

  // Fetch custom visa requirements for the currently searched destination + nationality
  useEffect(() => {
    if (!destination) {
      setCustomVisaDetail(null);
      return;
    }
    const fetchCustomVisa = async () => {
      try {
        const destParts = destination.split(',');
        const destCountry = destParts.length > 1 ? destParts[destParts.length - 1].trim() : destination;
        const res = await fetch('/api/visa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nationality: visaNationality, destination: destCountry })
        });
        if (res.ok) {
          const data = await res.json();
          setCustomVisaDetail(data);
        }
      } catch (e) {
        console.error('Failed to fetch custom visa:', e);
      }
    };
    fetchCustomVisa();
  }, [destination, visaNationality]);

  // Ref to the live Supabase channel so broadcastEvent can reuse it
  const supabaseChannelRef = React.useRef<any>(null);

  // Synchronize Theme Attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch user profile and saved trips on login
  useEffect(() => {
    const fetchUserAndTrips = async (user: any) => {
      setCurrentUser(user);
      if (user) {
        // Ensure user exists in public.users (fails gracefully if RLS blocks, but initializes key)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser) {
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null
          });
        }

        const { data, error } = await supabase
          .from('itineraries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setSavedTrips(data);
        }
      } else {
        setSavedTrips([]);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      fetchUserAndTrips(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        fetchUserAndTrips(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Auto-save pending itinerary once user logs in
  useEffect(() => {
    if (currentUser) {
      const pendingSaveId = localStorage.getItem('TripEvo_pending_save_itinerary_id');
      if (pendingSaveId) {
        localStorage.removeItem('TripEvo_pending_save_itinerary_id');
        const autoSave = async () => {
          setSaveLoading(true);
          try {
            const res = await fetch('/api/auth/save-itinerary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itineraryId: pendingSaveId }),
            });
            if (res.ok) {
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
              const { data, error } = await supabase
                .from('itineraries')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
              if (!error && data) {
                setSavedTrips(data);
              }
            }
          } catch (err) {
            console.error('Error auto-saving itinerary:', err);
          } finally {
            setSaveLoading(false);
          }
        };
        autoSave();
      }
    }
  }, [currentUser]);

  // Leaflet Map state elements
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  // Dynamically load Leaflet CDN assets when workspace is client-ready
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setMapLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Dynamic helper to resolve true destination center from weather or AI locations
  const getDestinationCenter = () => {
    if (weather?.latitude && weather?.longitude && weather.latitude !== 0) {
      return { lat: weather.latitude, lng: weather.longitude, hasRealCoords: true };
    }
    const validLocs = (itinerary?.map_locations || []).filter(
      (l: any) => typeof l.lat === 'number' && typeof l.lng === 'number' && l.lat !== 0 && l.lng !== 0
    );
    if (validLocs.length > 0) {
      const avgLat = validLocs.reduce((sum: number, l: any) => sum + l.lat, 0) / validLocs.length;
      const avgLng = validLocs.reduce((sum: number, l: any) => sum + l.lng, 0) / validLocs.length;
      return { lat: avgLat, lng: avgLng, hasRealCoords: true };
    }
    return { lat: 26.18, lng: 91.73, hasRealCoords: false };
  };

  // Initialize leaflet map instance
  useEffect(() => {
    if (!mapLoaded || !itinerary) return;
    const L = (window as any).L;
    if (!L) return;

    const center = getDestinationCenter();
    const defaultZoom = center.hasRealCoords ? 12 : 10;

    let map = mapInstance;
    const container = document.getElementById('real-map');
    if (!container) return;

    if (!map) {
      map = L.map('real-map', {
        zoomControl: false,
        attributionControl: false
      }).setView([center.lat, center.lng], defaultZoom);

      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      setMapInstance(map);

      // Force Leaflet to recalculate container boundaries as soon as DOM stabilizes
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 250);
    } else {
      map.setView([center.lat, center.lng], defaultZoom);
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 150);
    }
  }, [mapLoaded, itinerary]);

  // Update map markers and fly-to view dynamically based on active day/activity
  useEffect(() => {
    if (!mapInstance || !itinerary) return;
    const L = (window as any).L;
    if (!L) return;

    // Ensure map tiles load cleanly without grey/white clipping
    setTimeout(() => {
      try { mapInstance.invalidateSize(); } catch (_) {}
    }, 100);

    const center = getDestinationCenter();
    const currentMarkers: any[] = [];

    const customIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div class="map-pulse-dot"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const activeIcon = L.divIcon({
      className: 'custom-map-icon active',
      html: `<div class="map-pulse-dot active"></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    // Safely parse day numbers whether the model returned numbers ("1") or strings ("Day 1")
    const dayLocations = (itinerary.map_locations || []).filter((loc: any, idx: number) => {
      let dayNum: number | null = null;
      if (typeof loc.day === 'number') {
        dayNum = loc.day;
      } else if (loc.day) {
        const match = String(loc.day).match(/\d+/);
        if (match) dayNum = parseInt(match[0], 10);
      }
      if (dayNum !== null) {
        return dayNum === activeDayIdx + 1;
      }
      return idx === activeDayIdx;
    });

    if (dayLocations.length > 0) {
      const latLngs: [number, number][] = [];

      dayLocations.forEach((loc: any, idx: number) => {
        const lat = (typeof loc.lat === 'number' && loc.lat !== 0) ? loc.lat : (center.lat + (idx * 0.012 - 0.006));
        const lng = (typeof loc.lng === 'number' && loc.lng !== 0) ? loc.lng : (center.lng + (idx * 0.012 - 0.006));
        latLngs.push([lat, lng]);

        // Determine if this marker should be active/focused
        let isFocused = false;
        if (activeActivityName) {
          const actNorm = activeActivityName.toLowerCase();
          const nameNorm = String(loc.name || '').toLowerCase();
          isFocused = nameNorm.includes(actNorm) || actNorm.includes(nameNorm) ||
                      nameNorm.split(' ').some(w => w.length > 3 && actNorm.includes(w));
          // If no direct name substring match, match by activity index
          if (!isFocused && itinerary.days[activeDayIdx]?.activities) {
            const actIdx = itinerary.days[activeDayIdx].activities.indexOf(activeActivityName);
            if (actIdx !== -1 && actIdx === idx) {
              isFocused = true;
            }
          }
        } else {
          isFocused = idx === 0;
        }

        const marker = L.marker([lat, lng], { 
          icon: isFocused ? activeIcon : customIcon,
          zIndexOffset: isFocused ? 1000 : 100 
        }).bindPopup(
          `<div style="font-family:sans-serif;padding:3px 4px;min-width:140px;">
             <strong style="color:#0E0B1F;font-size:13px;display:block;margin-bottom:2px;">${loc.name}</strong>
             <span style="color:#E87C5A;font-weight:600;font-size:11px;">Day ${activeDayIdx + 1} • Stop ${idx + 1}</span>
           </div>`,
          { closeButton: false, offset: [0, -6] }
        );

        marker.addTo(mapInstance);
        currentMarkers.push(marker);

        if (isFocused) {
          marker.openPopup();
          mapInstance.flyTo([lat, lng], 14, {
            animate: true,
            duration: 0.8,
            easeLinearity: 0.3
          });
        }

        marker.on('click', () => {
          setActiveActivityName(loc.name);
        });
      });

      // If user switched days without picking an activity, zoom to fit all of the day's stops together
      if (!activeActivityName && latLngs.length > 1) {
        try {
          const bounds = L.latLngBounds(latLngs);
          mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
        } catch (_) {}
      }
    } else {
      // Fallback if no specific locations generated for this day: fly smoothly to city center
      mapInstance.flyTo([center.lat, center.lng], 12, {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.3
      });
    }

    // Clean-up function to remove active markers when dependencies change or component unmounts
    return () => {
      currentMarkers.forEach(m => {
        try { mapInstance.removeLayer(m); } catch (_) {}
      });
    };
  }, [mapInstance, itinerary, activeDayIdx, activeActivityName]);

  // Unified day selection handler to update index and reset activity focus
  const handleDaySelect = (idx: number) => {
    setActiveActivityName(null);
    setActiveDayIdx(idx);
  };

  // Premium Loader Component with Dynamic Cycling Steps & Modern Glass Glow
  const LOADING_STEPS = [
    { title: "Analyzing local microclimates & forecasts...", sub: "Calibrating seasonal weather & comfort ratings" },
    { title: "Curating hidden spots & trending dining...", sub: "Discovering verified culinary gems & cultural trails" },
    { title: "Synthesizing your custom vibe matrix...", sub: "Tailoring every morning, afternoon, and night" },
    { title: "Optimizing transit routes & pacing...", sub: "Arranging smooth geographical flow with minimal transit" },
    { title: "Assembling your bespoke itinerary...", sub: "Finalizing budget breakdowns & interactive map pins" }
  ];

  const Loader = () => {
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2400);
      return () => clearInterval(interval);
    }, []);

    const currentStep = LOADING_STEPS[stepIndex];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-page)]/85 backdrop-blur-xl transition-all duration-500">
        {/* Ambient glow orbs */}
        <div className="absolute w-[360px] h-[360px] bg-gradient-to-tr from-[#E87C5A]/25 via-[#6C5CE7]/25 to-[#D4A853]/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

        <div className="relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-[36px] bg-[var(--bg-alt)]/90 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.6)] max-w-[440px] w-[90%] mx-auto text-center overflow-hidden">
          {/* Subtle top edge highlight */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Video Container with layered ambient shadow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#E87C5A] to-[#6C5CE7] opacity-30 blur-lg" />
            <video
              autoPlay
              loop
              muted
              playsInline
              src="/loading.mp4"
              className="relative w-44 h-44 object-cover rounded-2xl border border-white/15 shadow-2xl"
            />
          </div>

          {/* Title */}
          <div className="font-serif text-2xl sm:text-[26px] font-semibold text-[var(--text-primary)] tracking-tight mb-2">
            TripEvo is crafting your trip
          </div>

          {/* Live Step Badge with pulsing indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs text-[var(--text-secondary)] mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E87C5A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E87C5A]"></span>
            </span>
            <span>Step {stepIndex + 1} of {LOADING_STEPS.length}</span>
          </div>

          {/* Dynamic Cycling Text with fade transition */}
          <div className="min-h-[58px] flex flex-col items-center justify-center transition-all duration-300">
            <div key={`title-${stepIndex}`} className="text-sm font-medium text-[var(--text-primary)] animate-fadeIn">
              {currentStep.title}
            </div>
            <div key={`sub-${stepIndex}`} className="text-xs text-[var(--text-secondary)] mt-1 animate-fadeIn">
              {currentStep.sub}
            </div>
          </div>

          {/* Animated Shimmer Progress Track */}
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-6 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-[#E87C5A] via-[#D4A853] to-[#6C5CE7] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((stepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Quick select destination
  const handleQuickSelect = (name: string) => {
    setDestination(name);
    // Smooth scroll down to form
    const searchForm = document.getElementById('search-form-wrap');
    if (searchForm) {
      searchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Trigger vibe check flow
  const handlePlanTrip = (searchDest?: string) => {
    if (searchDest) {
      setDestination(searchDest);
    } else if (!destination) {
      triggerCustomToast('Please enter a destination to start planning your trip.');
      return;
    }
    setShowVibeCheck(true);
    // Scroll to top of hero to see vibe check board clearly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic fetch itinerary data
  const triggerItineraryGeneration = async (options: {
    photoIds?: string[];
    tags?: string[];
    activityBiases?: string[];
  }) => {
    setLoading(true);
    setShowVibeCheck(false);

    // Calculate duration from date range, fallback to 7 days
    const durationDays = dateRange.start && dateRange.end
      ? Math.max(1, Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / 86400000))
      : 7;

    try {
      const res = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          preferences: {
            vibe: budgetLevel,
            durationDays,
            dateStart: dateRange.start,
            vibePhotoIds: options.photoIds || [],
            vibeTags: options.tags || [],
            activityBiases: options.activityBiases || []
          }
        })
      });

      if (!res.ok) {
        throw new Error('API server returned generation error status.');
      }

      const data = await res.json();
      
      if (data.itinerary) {
        setActivePreferences({
          vibe: budgetLevel,
          durationDays,
          dateStart: dateRange.start,
          vibePhotoIds: options.photoIds || [],
          vibeTags: options.tags || [],
          activityBiases: options.activityBiases || [],
          weather: data.weather
        });
        setItinerary(data.itinerary);
        setWeather(data.weather);
        setTrends(data.trends);
        setShareToken(data.share_token);
        setItineraryId(data.itinerary_id);
        setActiveDayIdx(0);

        // Smooth scroll to itinerary presentation view
        setTimeout(() => {
          const viewSection = document.getElementById('itinerary-view');
          if (viewSection) {
            viewSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 400);
      } else {
        triggerCustomToast('Itinerary generation failed — please check your destination name and retry.');
      }
    } catch (err: any) {
      console.error(err);
      triggerCustomToast('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVibeCheckComplete = async (selectedVibeIds: string[], mergedTags: string[], selectedBudget: string, activityBiases: string[]) => {
    setShowVibeCheck(false);
    setBudgetLevel(selectedBudget);
    triggerItineraryGeneration({ photoIds: selectedVibeIds, tags: mergedTags, activityBiases });
  };

  const handleVibeCheckSkip = () => {
    triggerItineraryGeneration({});
  };

  // ─── PRODUCTION COLLABORATION WORKSPACE SERVICES ───
  
  // Helper to send real-time sync packets
  const broadcastEvent = (event: string, payload: any) => {
    // 1. Live Supabase broadcast — reuse the already-subscribed channel ref
    if (collabConnectionStatus === 'connected_supabase' && supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event,
          payload
        });
      } catch (err) {
        console.warn('Supabase broadcast failed:', err);
      }
    }
    
    // 2. Browser BroadcastChannel — multi-tab sync (same origin, same room code)
    try {
      const localChannel = new BroadcastChannel(`tripevo-collab-${groupCode.toLowerCase()}`);
      localChannel.postMessage({ event, payload });
      localChannel.close();
    } catch (err) {
      console.warn('Local tab broadcast failed:', err);
    }
  };

  // Real-time Supabase / BroadcastChannel multi-client listener
  useEffect(() => {
    if (!isSessionConnected) return;

    let supabaseChannel: any = null;
    let localChannel: any = null;

    // Check if Supabase env credentials are actively defined (not placeholder)
    const isSupabaseConfigured =
      supabase &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const channelName = `tripevo-collab-${groupCode.toLowerCase()}`;
      supabaseChannel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: 'Rajiv' }
        }
      });

      // Synchronize messages
      supabaseChannel.on('broadcast', { event: 'chat_message' }, ({ payload }: any) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        if (payload.isSuggestion) {
          setCollabActivities(prev => {
            if (prev.some(act => act.id === `collab-${payload.id}`)) return prev;
            return [...prev, {
              id: `collab-${payload.id}`,
              day: payload.dayAssociation || 1,
              title: payload.text,
              proposedBy: payload.sender,
              votes: payload.votes || 1,
              userVoted: null
            }];
          });
        }
      });

      // Synchronize chat bubble votes — payload is the full updated message
      supabaseChannel.on('broadcast', { event: 'vote_cast' }, ({ payload }: any) => {
        setChatMessages(prev => {
          const exists = prev.some(m => m.id === payload.id);
          if (exists) {
            // Update vote count, but keep userVoted as null for other tabs (they didn't vote)
            return prev.map(m => m.id === payload.id ? { ...m, votes: payload.votes } : m);
          }
          // Message not in this tab yet — add it so the vote count shows
          return [...prev, { ...payload, userVoted: null }];
        });
      });

      // Synchronize activities list votes
      supabaseChannel.on('broadcast', { event: 'activity_vote' }, ({ payload }: any) => {
        setCollabActivities(prev =>
          prev.map(act => act.id === payload.activityId ? { ...act, votes: payload.votes } : act)
        );
      });

      // Synchronize new activities
      supabaseChannel.on('broadcast', { event: 'activity_added' }, ({ payload }: any) => {
        setCollabActivities(prev => {
          if (prev.some(act => act.id === payload.id)) return prev;
          return [...prev, payload];
        });
      });

      // Presence tracking of online planners
      supabaseChannel.on('presence', { event: 'sync' }, () => {
        const presenceState = supabaseChannel.presenceState();
        const activeUsersCount = Object.keys(presenceState).length;
        setActivePlannersCount(activeUsersCount);
      });

      supabaseChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setCollabConnectionStatus('connected_supabase');
          // Store channel in ref so broadcastEvent can reuse it
          supabaseChannelRef.current = supabaseChannel;
          supabaseChannel.track({ online_at: new Date().toISOString() });
        } else {
          setCollabConnectionStatus('connected_local');
          setActivePlannersCount(3);
        }
      });
    } else {
      // Local fallback channel setup
      setCollabConnectionStatus('connected_local');
      setActivePlannersCount(3); // Rajiv, Zara, Aria

      try {
        localChannel = new BroadcastChannel(`tripevo-collab-${groupCode.toLowerCase()}`);
        localChannel.onmessage = (e: MessageEvent) => {
          const { event, payload } = e.data;
          
          if (event === 'chat_message') {
            setChatMessages(prev => {
              if (prev.some(m => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
            if (payload.isSuggestion) {
              setCollabActivities(prev => {
                if (prev.some(act => act.id === `collab-${payload.id}`)) return prev;
                return [...prev, {
                  id: `collab-${payload.id}`,
                  day: payload.dayAssociation || 1,
                  title: payload.text,
                  proposedBy: payload.sender,
                  votes: payload.votes || 1,
                  userVoted: null
                }];
              });
            }
          } else if (event === 'vote_cast') {
            setChatMessages(prev => {
              const exists = prev.some(m => m.id === payload.id);
              if (exists) {
                return prev.map(m => m.id === payload.id ? { ...m, votes: payload.votes } : m);
              }
              return [...prev, { ...payload, userVoted: null }];
            });
          } else if (event === 'activity_vote') {
            setCollabActivities(prev =>
              prev.map(act => act.id === payload.activityId ? { ...act, votes: payload.votes } : act)
            );
          } else if (event === 'activity_added') {
            setCollabActivities(prev => {
              if (prev.some(act => act.id === payload.id)) return prev;
              return [...prev, payload];
            });
          }
        };
      } catch (err) {
        console.warn('Local broadcast initialization failed:', err);
      }
    }

    return () => {
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
        supabaseChannelRef.current = null;
      }
      if (localChannel) {
        localChannel.close();
      }
    };
  }, [isSessionConnected, groupCode]);

  // Synchronize dynamic welcome if travelers dropdown flips to group co-planning
  useEffect(() => {
    if (travelers === 'Group Collab (5+)') {
      setIsSessionConnected(true);
    }
  }, [travelers]);

  // Handle active planner activities voting
  const handleCollabVote = (id: string, dir: 'up' | 'down') => {
    let updatedVotes = 0;
    setCollabActivities(prev =>
      prev.map(act => {
        if (act.id !== id) return act;
        
        if (act.userVoted === dir) {
          updatedVotes = dir === 'up' ? act.votes - 1 : act.votes + 1;
          broadcastEvent('activity_vote', { activityId: id, votes: updatedVotes });
          return { ...act, votes: updatedVotes, userVoted: null };
        }
        
        let diff = 0;
        if (dir === 'up') {
          diff = act.userVoted === 'down' ? 2 : 1;
        } else {
          diff = act.userVoted === 'up' ? -2 : -1;
        }
        
        updatedVotes = act.votes + diff;
        broadcastEvent('activity_vote', { activityId: id, votes: updatedVotes });
        return { ...act, votes: updatedVotes, userVoted: dir };
      })
    );
  };

  // Join existing session by custom room code
  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputGroupCode.trim()) return;

    const targetCode = inputGroupCode.trim().toUpperCase();
    setIsSyncingSession(true);

    setTimeout(() => {
      setGroupCode(targetCode);
      setIsSyncingSession(false);
      setIsSessionConnected(true);
      
      // Sync simulated joining activities
      setTimeout(() => {
        const welcomeMsgId = `m-welcome-${Date.now()}`;
        const joinMsg: ChatMessage = {
          id: welcomeMsgId,
          sender: 'System',
          avatarClass: '',
          text: `Rajiv joined session lobby ${targetCode}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          votes: 0,
          userVoted: null
        };
        setChatMessages(prev => [...prev, joinMsg]);
        broadcastEvent('chat_message', joinMsg);

        if (isSimulatingGroup) {
          setTimeout(() => {
            const zMsg: ChatMessage = {
              id: `m-zara-${Date.now()}`,
              sender: 'Zara',
              avatarClass: 'av-orange',
              text: `Hey Rajiv! Thrilled you joined room ${targetCode}! We were just locking in Day 3's secret waterfall trail. Tell us your thoughts!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              votes: 4,
              userVoted: null
            };
            setChatMessages(prev => [...prev, zMsg]);
            broadcastEvent('chat_message', zMsg);
          }, 1500);
        }
      }, 800);
    }, 1500);
  };

  // Copy sharing link with unique generated room token
  const copyCollabLink = () => {
    const randomCode = `TEVE-${Math.floor(1000 + Math.random() * 9000)}`;
    setGroupCode(randomCode);
    setIsSessionConnected(true);

    // Share URL: if we have a share token use /share/[token]?room=CODE, else use /?room=CODE
    const baseUrl = shareToken
      ? `${window.location.origin}/share/${shareToken}?room=${randomCode}`
      : `${window.location.origin}/?room=${randomCode}`;
    navigator.clipboard.writeText(baseUrl);
    setCollabLinkCopied(true);

    if (isSimulatingGroup) {
      setTimeout(() => {
        const s1: ChatMessage = {
          id: `m-sys-z-${Date.now()}`,
          sender: 'System',
          avatarClass: '',
          text: 'Zara joined the co-planning lobby',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          votes: 0,
          userVoted: null
        };
        setChatMessages(prev => [...prev, s1]);
        broadcastEvent('chat_message', s1);

        setTimeout(() => {
          const s2: ChatMessage = {
            id: `m-sys-k-${Date.now()}`,
            sender: 'System',
            avatarClass: '',
            text: 'Kabir joined the co-planning lobby',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            votes: 0,
            userVoted: null
          };
          setChatMessages(prev => [...prev, s2]);
          broadcastEvent('chat_message', s2);

          setTimeout(() => {
            const zMsg: ChatMessage = {
              id: `m-zara-${Date.now()}`,
              sender: 'Zara',
              avatarClass: 'av-orange',
              text: `Yo! Connection synced. Rajiv, the sunset catamaran cruise on Day 1 looks spectacular. Let's make it happen!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              votes: 7,
              userVoted: null
            };
            setChatMessages(prev => [...prev, zMsg]);
            broadcastEvent('chat_message', zMsg);

            // Increment votes on Day 1 proposal
            setTimeout(() => {
              setCollabActivities(prev =>
                prev.map(act => {
                  if (act.id === 'c1') {
                    broadcastEvent('activity_vote', { activityId: 'c1', votes: 7 });
                    return { ...act, votes: 7 };
                  }
                  return act;
                })
              );
            }, 1000);

          }, 1500);
        }, 1200);
      }, 2000);
    }

    setTimeout(() => setCollabLinkCopied(false), 3000);
  };

  // Submit Rajiv's custom chat message / suggestion
  const handleCollabSendMessage = (text: string, isProposal: boolean, day: number) => {
    if (!text.trim()) return;

    const messageId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: messageId,
      sender: 'Rajiv (You)',
      avatarClass: 'av-blue',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      votes: 1,
      userVoted: 'up',
      isSuggestion: isProposal,
      dayAssociation: isProposal ? day : undefined
    };

    setChatMessages(prev => [...prev, newMsg]);

    if (isProposal) {
      const newActivity: CollabActivity = {
        id: `collab-${messageId}`,
        day: day,
        title: text,
        proposedBy: 'Rajiv (You)',
        votes: 1,
        userVoted: 'up'
      };
      setCollabActivities(prev => [...prev, newActivity]);
      broadcastEvent('activity_added', newActivity);
    }

    broadcastEvent('chat_message', newMsg);

    // Trigger simulator replies
    if (isSimulatingGroup) {
      if (isProposal) {
        setTimeout(() => {
          const rId = `reply-${Date.now()}`;
          const simReply: ChatMessage = {
            id: rId,
            sender: 'Zara',
            avatarClass: 'av-orange',
            text: `Wow Rajiv, proposing "${text}" for Day ${day} is incredibly luxury. Fully upvoted!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            votes: 3,
            userVoted: null
          };
          setChatMessages(prev => [...prev, simReply]);
          broadcastEvent('chat_message', simReply);

          // Simulated upvotes
          setTimeout(() => {
            setCollabActivities(prev =>
              prev.map(act => {
                if (act.id === `collab-${messageId}`) {
                  broadcastEvent('activity_vote', { activityId: act.id, votes: 4 });
                  return { ...act, votes: 4 };
                }
                return act;
              })
            );
          }, 1000);

        }, 2000);
      } else {
        setTimeout(() => {
          const rId = `reply-${Date.now()}`;
          const simReply: ChatMessage = {
            id: rId,
            sender: 'Aria',
            avatarClass: 'av-purple',
            text: `Excellent point Rajiv! Adding that to our shared planning agenda.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            votes: 2,
            userVoted: null
          };
          setChatMessages(prev => [...prev, simReply]);
          broadcastEvent('chat_message', simReply);
        }, 2200);
      }
    }
  };

  // Upvote/Downvote dynamic chat messages
  const handleChatMessageVote = (messageId: string, dir: 'up' | 'down') => {
    setChatMessages(prev =>
      prev.map(msg => {
        if (msg.id !== messageId) return msg;

        let nVotes: number;
        let nVoted: 'up' | 'down' | null;

        if (msg.userVoted === dir) {
          // Toggle off
          nVotes = dir === 'up' ? msg.votes - 1 : msg.votes + 1;
          nVoted = null;
        } else {
          const diff = dir === 'up'
            ? (msg.userVoted === 'down' ? 2 : 1)
            : (msg.userVoted === 'up' ? -2 : -1);
          nVotes = msg.votes + diff;
          nVoted = dir;
        }

        const updatedMsg = { ...msg, votes: nVotes, userVoted: nVoted };
        // Broadcast the FULL updated message so other tabs can upsert it
        broadcastEvent('vote_cast', updatedMsg);
        return updatedMsg;
      })
    );
  };

  // Newsletter subscribe
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setNewsletterSubscribed(true);
    setEmailInput('');
  };

  const handleSaveItinerary = async () => {
    if (!itineraryId) return;

    if (!currentUser) {
      localStorage.setItem('TripEvo_pending_save_itinerary_id', itineraryId);
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setSaveLoading(true);
    try {
      const res = await fetch('/api/auth/save-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itineraryId,
          destination,
          preferences: { vibe: budgetLevel, weather },
          itineraryData: itinerary
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        const { data, error } = await supabase
          .from('itineraries')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setSavedTrips(data);
        }
      } else {
        const errorData = await res.json();
        triggerCustomToast(errorData.error || 'Failed to save itinerary. Please try again.');
      }
    } catch (err) {
      console.error('Error saving itinerary:', err);
      triggerCustomToast('Error saving itinerary. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShareTrip = () => {
    if (!shareToken) return;
    const shareUrl = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const handleAffiliateClick = async (partnerName: string, affiliateType: string, url: string) => {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: itineraryId || null,
          partnerName,
          affiliateType,
          destinationUrl: url,
        }),
      });
    } catch (err) {
      console.error('Error tracking affiliate click:', err);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Visa status checker for Indian passports dynamically
  const getIndianPassportVisaStatus = (dest: string) => {
    const d = dest.toLowerCase();
    if (d.includes('bali') || d.includes('indonesia')) {
      return {
        type: 'Visa on Arrival',
        cost: 'Free / ₹2,700 (fast track)',
        duration: '30 Days (Extendable)',
        class: 'visa-arrival',
        badgeColor: 'blue',
        req: 'Passport must be valid for at least 6 months with 2 blank pages.',
        link: 'https://molina.imigrasi.go.id/'
      };
    }
    if (d.includes('japan') || d.includes('tokyo') || d.includes('kyoto')) {
      return {
        type: 'eVisa / Short-Term',
        cost: '3,000 JPY (approx. ₹1,650)',
        duration: '90 Days',
        class: 'visa-evisa',
        badgeColor: 'cyan',
        req: 'Issued within 5 working days online. Indian passport eligible.',
        link: 'https://www.evisa.mofa.go.jp/'
      };
    }
    if (d.includes('maldives') || d.includes('male')) {
      return {
        type: 'Visa on Arrival',
        cost: 'Free / Complimentary',
        duration: '30 Days',
        class: 'visa-free',
        badgeColor: 'green',
        req: 'Requires pre-booked hotel confirmation and IMUGA declaration.',
        link: 'https://imuga.immigration.gov.mv/'
      };
    }
    if (d.includes('morocco') || d.includes('marrakesh')) {
      return {
        type: 'eVisa Required',
        cost: '770 MAD (approx. ₹6,300)',
        duration: '30 Days',
        class: 'visa-required',
        badgeColor: 'amber',
        req: 'Valid eVisa mandatory prior to departure. Requires travel insurance.',
        link: 'https://www.acces-maroc.ma/'
      };
    }
    // Domestic India destinations e.g. Rajasthan, Jaipur, Mumbai
    return {
      type: 'Domestic Travel',
      cost: 'No Visa Requirements',
      duration: 'Unlimited Duration',
      class: 'visa-free',
      badgeColor: 'green',
      req: 'Requires standard Government Photo ID (Aadhaar/PAN/Voter ID) for flights.',
      link: ''
    };
  };

  const visaDetails = getIndianPassportVisaStatus(destination || 'bali');

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>
      {loading && <Loader />}

      {toastMessage && (
        <div className="fixed top-24 right-6 z-[9999] bg-white/10 dark:bg-[#1A1035]/80 backdrop-blur-xl border border-[#E87C5A]/50 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <div className="w-8 h-8 rounded-full bg-[#E87C5A]/20 flex items-center justify-center text-[#E87C5A]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {toastMessage}
          </div>
        </div>
      )}

      {/* ─── NAVIGATION NAVBAR ─── */}
      <nav>
        <a href="#" className="nav-logo" style={{ textDecoration: 'none' }}>
          TripEvo<span className="nav-logo-dot" />AI
        </a>
        <div className="nav-links">
          <a href="#trending-section">Destinations</a>
          <a 
            href={itinerary ? "#itinerary-view" : "#"} 
            onClick={(e) => {
              if (!itinerary) {
                e.preventDefault();
                const searchInput = document.getElementById('main-destination-input');
                if (searchInput) {
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setTimeout(() => {
                    searchInput.focus();
                  }, 500);
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                triggerCustomToast("Make your custom itinerary now!");
              }
            }}
          >
            Itineraries
          </a>
          <a href="#collab-section">Collaboration</a>
          <a href="#packages-section">Curated Packages</a>
        </div>
        <div className="nav-right" style={{ gap: '16px' }}>
          {/* Custom Theme Switcher */}
          <button 
            className="theme-toggle" 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="Toggle color theme"
          >
            <div className="toggle-thumb">
              <svg className="sun-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
              <svg className="moon-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            </div>
          </button>
          
          {currentUser && (
            <button 
              className="my-trips-btn px-4 py-2 text-xs font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
              onClick={() => setShowSavedDrawer(true)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              {currentUser?.user_metadata?.full_name?.split(' ')[0]
                ? `${currentUser.user_metadata.full_name.split(' ')[0]}'s Trips`
                : 'My Trips'}
            </button>
          )}

          <AuthButton />

          <button className="nav-cta" onClick={() => handlePlanTrip()}>
            Plan Now
          </button>
        </div>
      </nav>

      {showVibeCheck ? (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-[var(--bg-page)]">
          <div style={{ width: '100%', zIndex: 10, position: 'relative' }}>
            <VibeCheck 
              destination={destination}
              onComplete={handleVibeCheckComplete}
              onSkip={handleVibeCheckSkip}
              onIdeasExtracted={(ideas) => setExtractedIdeas(ideas)}
            />
          </div>
        </section>
      ) : (
        <HeroSection onSearch={(dest) => handlePlanTrip(dest || 'Bali, Indonesia')} />
      )}

      {/* ─── DYNAMIC ITINERARY VIEW (MOUNTED ON GENERATION) ─── */}
      {itinerary && (
        <section id="itinerary-view" className="itinerary">
          <div className="itin-container">
            <div className="section-label" style={{ textAlign: 'center' }}>Live Itinerary Generated</div>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '10px' }}>
              Day-by-Day Journey in <em>{destination}</em>
            </h2>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Optimized for <strong style={{ color: '#E87C5A' }}>{budgetLevel}</strong>. Active weather patterns evaluated.
            </p>

            <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
              {/* Share & Co-Plan Button — first for psychology (commitment + social proof) */}
              {shareToken && (
                <button
                  onClick={handleShareTrip}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer"
                  style={{
                    background: shareCopied
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #E87C5A 0%, #D4A853 100%)'
                  }}
                >
                  {shareCopied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  )}
                  {shareCopied ? 'Link Copied!' : 'Share & Co-Plan'}
                </button>
              )}

              {/* Save to Account Button */}
              <button
                onClick={handleSaveItinerary}
                disabled={saveLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100 cursor-pointer border-none"
                style={{
                  background: saveSuccess 
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, #242132 0%, #151221 100%)',
                  border: '1px solid var(--border)'
                }}
              >
                {saveLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : saveSuccess ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                )}
                {saveSuccess ? 'Saved to Account!' : saveLoading ? 'Saving...' : 'Save to Account'}
              </button>

              {/* Regenerate Button */}
              <button
                onClick={() => {
                  setItinerary(null);
                  setWeather(null);
                  setTrends(null);
                  setReschedulingDays({});
                  setRescheduledDays({});
                  setActivePreferences(null);
                  setShowVibeCheck(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer no-print"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                title="Start over with new preferences"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-4"/>
                </svg>
                Regenerate
              </button>

              {/* Download PDF Button */}
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer no-print"
                style={{ background: 'linear-gradient(135deg, #242132 0%, #151221 100%)', border: '1px solid var(--border)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 17 12 21 16 17"></polyline>
                  <line x1="12" y1="12" x2="12" y2="21"></line>
                  <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path>
                </svg>
                Download PDF
              </button>
            </div>

            {/* Interactive Real Leaflet Map (Full Width Banner) */}
            <div className="w-full mb-8 relative z-10 no-print">
              <div className="itin-map w-full h-[280px] md:h-[450px] aspect-auto" style={{ position: 'relative', overflow: 'hidden', borderRadius: '22px' }}>
                <div id="real-map" style={{ width: '100%', height: '100%', borderRadius: '22px' }} />
                
                {/* Map overlay card - updates on every day click */}
                <div className="absolute top-4 right-4 z-[400] w-[270px] bg-white dark:bg-[#1E1F22] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.18)] border border-[var(--border)] overflow-hidden hidden sm:block">
                  <div className="p-3 border-b border-[var(--border)] bg-gray-50 dark:bg-[#2B2D31] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E87C5A] animate-pulse" />
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Day {itinerary.days[activeDayIdx]?.day}</span>
                    </div>
                    <button
                      onClick={() => {
                        const loc = itinerary.map_locations?.find((l: any) => l.day === activeDayIdx + 1);
                        const q = loc ? `${loc.lat},${loc.lng}` : encodeURIComponent(destination);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="bg-black dark:bg-white text-white dark:text-black text-[10px] px-2.5 py-1 rounded-full font-semibold transition-transform hover:scale-105 cursor-pointer border-none"
                    >Open in Maps</button>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 tracking-wider">Location</div>
                    <div className="text-sm font-bold text-[var(--text-primary)] mb-2 leading-tight">
                      {itinerary.map_locations?.find((l: any) => l.day === activeDayIdx + 1)?.name || itinerary.days[activeDayIdx]?.title}
                    </div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 tracking-wider">Morning</div>
                    <div className="flex gap-3 items-start">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">{itinerary.days[activeDayIdx]?.activities[0] || 'Explore the area'}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">9:00 AM • {itinerary.days[activeDayIdx]?.weather_emoji} {weather?.forecast[activeDayIdx]?.condition || 'Clear'}</div>
                      </div>
                    </div>
                  </div>
                </div>
                               {/* Day navigation arrows on map */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2">
                  <button
                    onClick={() => handleDaySelect(Math.max(0, activeDayIdx - 1))}
                    disabled={activeDayIdx === 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110"
                    style={{ background: 'rgba(14,11,31,0.85)', backdropFilter: 'blur(8px)', color: '#fff' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>

                  {/* Day dot indicators */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(14,11,31,0.85)', backdropFilter: 'blur(8px)' }}>
                    {itinerary.days.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleDaySelect(i)}
                        className="border-none cursor-pointer p-0 transition-all"
                        style={{
                          width: i === activeDayIdx ? '20px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          background: i === activeDayIdx ? '#E87C5A' : 'rgba(255,255,255,0.35)',
                          transition: 'all 0.25s ease'
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleDaySelect(Math.min(itinerary.days.length - 1, activeDayIdx + 1))}
                    disabled={activeDayIdx === itinerary.days.length - 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110"
                    style={{ background: 'rgba(14,11,31,0.85)', backdropFilter: 'blur(8px)', color: '#fff' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>

                {!mapLoaded && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)', zIndex: 10 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading interactive map engine...</span>
                  </div>
                )}
              </div>
            </div>


            {/* Split layout for itinerary logic */}
            {weather && weather.alertMessage && (
              <div className="weather-note max-w-4xl mx-auto mb-8">
                <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong style={{ color: '#E87C5A' }}>Weather Reschedule Alert:</strong> {weather.alertMessage}
                </div>
              </div>
            )}

            <div className="itin-grid">
              {/* Wrapped Left Column to resolve 2-column layout bugs */}
              <div className="flex flex-col">
                {/* Left Side: Interactive Day-by-Day Cards */}
                <div className="itin-days">
                  {itinerary.days.map((day, idx) => {
                    const isActive = idx === activeDayIdx;
                    return (
                      <div 
                        key={idx} 
                        className={`itin-day ${isActive ? 'active' : ''}`}
                        onClick={() => handleDaySelect(idx)}
                      >
                        <div className="day-num">{day.day}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Weather badge relocated to top of day card */}
                          <div className="day-weather mb-1.5 opacity-100 flex items-center gap-1.5 font-bold text-xs" style={{ opacity: 1 }}>
                            <span>{day.weather_emoji || '☀️'}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{weather?.forecast[idx]?.condition || 'Clear Sky'}</span>
                          </div>

                          <div className="day-title">{day.title}</div>
                          <p className="day-desc">{day.desc}</p>

                          {/* Weather Suggestion Box */}
                          {weather?.forecast[idx]?.isRainy && (
                            <div 
                              style={{
                                marginTop: '12px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: rescheduledDays[idx] ? 'rgba(16, 185, 129, 0.08)' : 'rgba(232, 124, 90, 0.08)',
                                border: rescheduledDays[idx] ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(232, 124, 90, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                                cursor: 'default'
                              }}
                              onClick={(e) => e.stopPropagation()} // prevent day selection click bubble
                            >
                              <span style={{ 
                                fontSize: '12px', 
                                color: rescheduledDays[idx] ? '#10B981' : '#E87C5A', 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                {rescheduledDays[idx] ? '✓' : '⛈️'} Suggestion: Recommend indoor activities due to bad weather
                              </span>
                              
                              {rescheduledDays[idx] ? (
                                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                                  Indoor Itinerary Loaded
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRescheduleDayForIndoor(idx)}
                                  disabled={reschedulingDays[idx]}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#E87C5A',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                    opacity: reschedulingDays[idx] ? 0.7 : 1
                                  }}
                                >
                                  {reschedulingDays[idx] ? 'Rescheduling...' : 'Apply Suggestion'}
                                </button>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex flex-col gap-4 relative pl-4 border-l-2 border-[#E87C5A]/30">
                            {day.activities.map((act, actIdx) => {
                              const timeSlots = ['Morning (9:00 AM)', 'Late Morning (11:30 AM)', 'Afternoon (2:00 PM)', 'Late Afternoon (4:30 PM)', 'Evening (7:00 PM)', 'Night (9:30 PM)'];
                              const timeLabel = timeSlots[actIdx] ?? `Activity ${actIdx + 1}`;
                              const isActActive = activeActivityName && (
                                act.toLowerCase().includes(activeActivityName.toLowerCase()) ||
                                activeActivityName.toLowerCase().includes(act.toLowerCase())
                              );
                              return (
                                <div
                                  key={actIdx}
                                  onClick={() => setActiveActivityName(act)}
                                  className={`relative flex flex-col bg-[var(--bg-alt)] border rounded-lg p-3 w-full shadow-sm cursor-pointer transition-all duration-300 ${
                                    isActActive
                                      ? 'border-[#E87C5A] shadow-[0_0_12px_rgba(232,124,90,0.15)] bg-[var(--bg-card)]'
                                      : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                                  }`}
                                >
                                  <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-[#E87C5A] border-2 border-[var(--bg-page)]" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E87C5A] mb-1">{timeLabel}</span>
                                  <span className="text-sm text-[var(--text-primary)]">{act}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="day-meta mt-3 pt-2 border-t border-[var(--border)] flex justify-between items-center text-xs text-[var(--text-muted)]">
                            <span>Est. Activities Budget: ₹{day.day_budget_est || '8,500'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Saved Ideas section */}
                {extractedIdeas.length > 0 && (
                  <div className="mt-8 bg-[var(--bg-glass)] border border-[var(--border)] rounded-2xl p-5 shadow-xl animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Custom Saved Ideas</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4">
                      Places extracted from your vibe checks. Add them to Day {activeDayIdx + 1}{"'s"} activities!
                    </p>
                    <div className="flex flex-col gap-2">
                      {extractedIdeas.map((idea, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--border-hover)] transition-all">
                          <span className="text-sm text-[var(--text-primary)] font-medium">{idea}</span>
                          <button
                            onClick={() => handleAddIdeaToDay(idea)}
                            className="px-3 py-1.5 bg-[#E87C5A] hover:bg-[#d4693e] text-white rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add to Day {activeDayIdx + 1}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan Together with Friends prompt card */}
                <div className="mt-8 bg-gradient-to-r from-[rgba(232,124,90,0.06)] to-[rgba(212,168,83,0.06)] border border-[#E87C5A]/20 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#E87C5A]/10 blur-2xl rounded-full" />
                  <h4 className="font-['Playfair_Display'] text-lg font-bold text-[var(--text-primary)] mb-2">
                    Plan Together with Friends!
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-4 leading-relaxed">
                    Collaborate in real-time. Share voting, make suggestions, and coordinate flights with your crew.
                  </p>
                  <button
                    onClick={() => {
                      const formSection = document.getElementById('create-join-forms');
                      if (formSection) {
                        formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="px-5 py-2.5 bg-[#E87C5A] hover:bg-[#d4693e] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-95 border-none cursor-pointer"
                  >
                    Start Co-Planning Session
                  </button>
                </div>

                {/* Complete Your Trip Sticky Footer */}
                {(() => {
                  const nights = itinerary.days.length;
                  const profile = inferTravelerType(travelers);
                  const nightlyRate = estimateHotelNightlyRate(budgetLevel);
                  const hotelTotal = nightlyRate * nights;
                  const actTotal = itinerary.days.reduce((sum, d) => sum + parseInt((d.day_budget_est || '8500').replace(/,/g, ''), 10), 0);
                  const grandTotal = hotelTotal + actTotal;
                  const checkIn = dateRange.start || new Date().toISOString().split('T')[0];
                  const checkOut = dateRange.end || new Date(Date.now() + nights * 86400000).toISOString().split('T')[0];
                  const allHotelsUrl = buildBookingURL(destination, checkIn, checkOut, profile);
                  const goibiboUrl = buildGoibiboURL(destination, checkIn, checkOut, profile.adults, profile.children);
                  const estimatedSavings = Math.round(grandTotal * 0.17);
                  return (
                    <div className="mx-0 mt-8 mb-6 rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-alt) 100%)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Complete Your Trip — {nights} nights in {destination}</span>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>✓ ~₹{estimatedSavings.toLocaleString('en-IN')} saved vs. booking separately</span>
                      </div>
                      <div className="flex gap-4 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Activities: <strong style={{ color: 'var(--text-primary)' }}>₹{actTotal.toLocaleString('en-IN')}</strong></span>
                        <span>Hotels: <strong style={{ color: 'var(--text-primary)' }}>~₹{hotelTotal.toLocaleString('en-IN')}</strong></span>
                        <span>Est. Total: <strong style={{ color: '#E87C5A' }}>₹{grandTotal.toLocaleString('en-IN')}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => handleAffiliateClick('Booking.com', 'hotel', allHotelsUrl)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #003580 0%, #0071c2 100%)' }}
                        >
                          Book all hotels on Booking.com
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </button>
                        <button
                          onClick={() => handleAffiliateClick('Goibibo', 'hotel', goibiboUrl)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-none cursor-pointer transition-all hover:scale-[1.02]"
                          style={{ background: 'var(--bg-glass)', color: '#E87C5A', border: '1px solid #E87C5A44' }}
                        >
                          View on Goibibo
                        </button>
                      </div>
                      <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>We earn a commission on bookings — at no extra cost to you. Prices are estimates; verify before booking.</p>
                    </div>
                  );
                })()}
              </div>

              {/* Right Side: Budget, Forecast & Visa Requirements */}
              <div className="itin-right">
                {/* Consolidated tabbed discovery widget at the top */}
                {itinerary.days[activeDayIdx] && (
                  <div className="mb-4">
                    <DayDiscoveryWidget
                      activeDayIdx={activeDayIdx}
                      dayData={itinerary.days[activeDayIdx]}
                      destination={destination}
                      dateRange={dateRange}
                      travelers={travelers}
                      budgetLevel={budgetLevel}
                      onAffiliateClick={handleAffiliateClick}
                    />
                  </div>
                )}

                  {/* Live Trend Intelligence */}
                  <TrendPanel trends={trends} destination={destination} />

                  {/* Visa & Document Requirements */}
                  <VisaRequirementWidget destination={destination} />



                  {/* Real-time Weather Forecast Widget */}
                  {weather && (
                    <div className="weather-widget">
                      <div className="weather-header">
                        <div className="weather-title">7-Day Real weather forecast</div>
                        <div className="weather-dest">{weather.locationName}, {weather.country}</div>
                      </div>
                      <div className="weather-days">
                        {weather.forecast.map((wDay, idx) => {
                          const isActive = idx === activeDayIdx;
                          return (
                            <div 
                              key={idx} 
                              className={`weather-day ${wDay.isRainy ? 'rain' : ''}`}
                              style={{ 
                                borderColor: isActive ? '#E87C5A' : 'var(--border)',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)'
                              }}
                            >
                              <div className="weather-day-label">{wDay.dayName}</div>
                              <div className="weather-icon">{wDay.emoji}</div>
                              <div className="weather-temp">{wDay.temp}°C</div>
                              <div className="weather-precip">{wDay.precipChance}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

      {/* ─── PASSPORT VISA REQUIREMENTS CARD LIST ─── */}
      <section className="visa-section">
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center', marginBottom: '40px' }}>
          <span className="section-label" style={{ display: 'inline-block', background: 'rgba(232, 124, 90, 0.1)', padding: '6px 14px', borderRadius: '30px' }}>
            Passport & Visa Checker
          </span>
          <h2 className="section-title" style={{ marginTop: '12px' }}>
            {visaNationality} Passport <em>Entry</em> Intelligence
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Check passport requirements for your nationality traveling to our key destinations. Select a destination above or enter your nationality below.
          </p>

          {/* Nationality Selector Input (Unified Search Pill) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--search-bg)',
            border: '1px solid var(--border)',
            borderRadius: '40px',
            padding: '6px 8px 6px 18px',
            marginTop: '24px',
            maxWidth: '460px',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxShadow: '0 8px 32px var(--shadow-card)',
            transition: 'border-color 0.3s'
          }}
          className="focus-within:border-[#E87C5A]/50"
          >
            <input
              type="text"
              placeholder="Check passport requirements (e.g. Indian, Canadian...)"
              value={visaNationality}
              onChange={(e) => setVisaNationality(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchVisaRequirements(visaNationality);
                }
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                padding: '8px 0',
                color: 'var(--text-primary)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => fetchVisaRequirements(visaNationality)}
              disabled={isVisaLoading}
              style={{
                background: 'linear-gradient(135deg,#E87C5A,#d4693e)',
                color: '#fff',
                border: 'none',
                padding: '10px 22px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                borderRadius: '30px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(232,124,90,0.3)',
                transition: 'all 0.2s'
              }}
              className="hover:scale-[1.03] active:scale-[0.97]"
            >
              {isVisaLoading ? (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              )}
              <span>{isVisaLoading ? 'Checking...' : 'Check Visa'}</span>
            </button>
          </div>
        </div>

        <div className="visa-grid">
          {visaCards.map((card) => (
            <div key={card.id} className={`visa-card ${card.cardClass}`}>
              <span className={`visa-badge ${card.badgeClass}`}>{card.status}</span>
              <h3 className="visa-dest">{card.dest}</h3>
              <div className="visa-detail">Cost: <span>{card.cost}</span></div>
              <div className="visa-detail">Duration: <span>{card.duration}</span></div>
              <div className="visa-detail">Process: <span>{card.req}</span></div>
              {card.link && (
                <a href={card.link} target="_blank" rel="noopener noreferrer" className="visa-link">
                  Official Portal
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>

        {destination && (
          <div style={{ maxWidth: '600px', margin: '30px auto 0', background: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Auto-evaluated requirements for {destination} ({visaNationality} Passport):</div>
            {customVisaDetail ? (
              <>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#E87C5A', marginTop: '6px' }}>
                  {customVisaDetail.status || 'Visa Required'}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                  {customVisaDetail.description || 'No detailed requirements found.'}
                </p>
                {customVisaDetail.link && (
                  <a href={customVisaDetail.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#E87C5A', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
                    Official Visa Portal
                  </a>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#E87C5A', marginTop: '6px' }}>
                  {visaDetails.type} — {visaDetails.cost} ({visaDetails.duration})
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                  {visaDetails.req}
                </p>
              </>
            )}
          </div>
        )}

        <div className="visa-disclaimer">
          Disclaimer: Visa regulations change frequently. Always check official consular notices before ticketing. TripEvo compiles information dynamically based on real-time intelligence feeds.
        </div>
      </section>

      {/* ─── LIVE CO-PLANNING COLLABORATION HUB ─── */}
      {!isSessionConnected ? (
        <>
          {/* Banner */}
          <CollabFeatureBanner 
            onStartPlanning={() => {
              document.getElementById('create-join-forms')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Create Room & Join Room Cards */}
          <section id="create-join-forms" className="py-12 px-6" style={{ background: 'var(--bg-page)' }}>
            <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch max-w-2xl mx-auto w-full">
              {/* Create Room */}
              <div className="flex-1 p-6 rounded-2xl border flex flex-col items-center text-center gap-4" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(232,124,90,0.15)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base mb-1">Create a Room</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Start a co-planning session. Share the room code with your travel crew.</p>
                </div>
                <button
                  onClick={() => {
                    const code = `TEVE-${Math.floor(1000 + Math.random() * 9000)}`;
                    setGroupCode(code);
                    setIsSessionConnected(true);
                    setCollabConnectionStatus('connected_local');
                    if (shareToken) {
                      const shareUrl = `${window.location.origin}/share/${shareToken}?room=${code}`;
                      navigator.clipboard.writeText(shareUrl);
                      triggerCustomToast(`Room ${code} created! Link copied to clipboard.`);
                    } else {
                      triggerCustomToast(`Room ${code} created! Generate an itinerary to get a shareable link.`);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 border-none cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #E87C5A 0%, #D4A853 100%)' }}
                >
                  Create Chat Room
                </button>
              </div>

              {/* Join Room */}
              <div className="flex-1 p-6 rounded-2xl border flex flex-col items-center text-center gap-4" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(100,100,255,0.15)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7B8CDE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base mb-1">Join a Room</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter a room code your friend shared to start co-planning together.</p>
                </div>
                <form onSubmit={handleJoinSession} className="w-full flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Enter room code (e.g. TEVE-1234)"
                    value={inputGroupCode}
                    onChange={(e) => setInputGroupCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="submit"
                    disabled={isSyncingSession}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 border-none cursor-pointer disabled:opacity-60"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {isSyncingSession ? 'Connecting...' : 'Join Room'}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Active Chat Room */
        <section id="collab-section" className="relative py-20 px-6 overflow-hidden" style={{ background: 'var(--bg-alt)' }}>
          <div className="max-w-6xl mx-auto w-full">
            <CollabChat
              messages={chatMessages}
              onSendMessage={handleCollabSendMessage}
              onVote={handleChatMessageVote}
              roomCode={groupCode}
              activePlannersCount={activePlannersCount}
              shareUrl={shareToken ? `${window.location.origin}/share/${shareToken}?room=${groupCode}` : undefined}
              collabLinkCopied={collabLinkCopied}
              onCopyLink={shareToken ? () => {
                const shareUrl = `${window.location.origin}/share/${shareToken}?room=${groupCode}`;
                navigator.clipboard.writeText(shareUrl);
                setCollabLinkCopied(true);
                setTimeout(() => setCollabLinkCopied(false), 2000);
              } : undefined}
              onLeave={() => {
                setIsSessionConnected(false);
                setCollabConnectionStatus('idle');
                setChatMessages([]);
              }}
            />
          </div>
        </section>
      )}

      {/* ─── DUST OVER WITH CURATED PACKAGES ─── */}
      <section className="packages" id="packages-section">
        <div className="section-header">
          <div>
            <div className="section-label">All-Inclusive Premium Packages</div>
            <h2 className="section-title">Curated Premium Packages</h2>
          </div>
          <a href="#" className="see-all">View all packages</a>
        </div>

        <div className="pkg-scroll">
          {/* Card 1 */}
          <div className="pkg-card" onClick={() => handleQuickSelect('Japan')}>
            <div className="pkg-img">
              <div className="pkg-img-bg bg-pkg1" />
              <div className="pkg-badge">Featured</div>
              <div className="pkg-urgency">🔥 8 viewing now</div>
            </div>
            <div className="pkg-body">
              <div className="pkg-duration">9 Days • 8 Nights</div>
              <h3 className="pkg-title">Japan Cultural Harmony Tour</h3>
              <div className="pkg-features">
                <span className="pkg-feat">Tokyo</span>
                <span className="pkg-feat">Kyoto</span>
                <span className="pkg-feat">Ryokan Stay</span>
              </div>
              <div className="pkg-footer">
                <div>
                  <div className="pkg-price">₹1,85,000 <small>/person</small></div>
                  <div className="pkg-was">Was ₹2,24,000 · Save 17%</div>
                </div>
                <button className="pkg-btn">Curate</button>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="pkg-card" onClick={() => handleQuickSelect('Bali')}>
            <div className="pkg-img">
              <div className="pkg-img-bg bg-pkg2" />
              <div className="pkg-badge sale">Best Value</div>
              <div className="pkg-urgency">⚡ Only 4 spots left</div>
            </div>
            <div className="pkg-body">
              <div className="pkg-duration">7 Days • 6 Nights</div>
              <h3 className="pkg-title">Bali Bliss Beach & Jungle Retreat</h3>
              <div className="pkg-features">
                <span className="pkg-feat">Ubud</span>
                <span className="pkg-feat">Seminyak</span>
                <span className="pkg-feat">Spa Villa</span>
              </div>
              <div className="pkg-footer">
                <div>
                  <div className="pkg-price">₹78,000 <small>/person</small></div>
                  <div className="pkg-was">Was ₹94,000 · Save 17%</div>
                </div>
                <button className="pkg-btn">Curate</button>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="pkg-card" onClick={() => handleQuickSelect('Maldives')}>
            <div className="pkg-img">
              <div className="pkg-img-bg bg-pkg3" />
              <div className="pkg-badge">Luxury</div>
              <div className="pkg-urgency">🔥 12 viewing now</div>
            </div>
            <div className="pkg-body">
              <div className="pkg-duration">6 Days • 5 Nights</div>
              <h3 className="pkg-title">Maldives Private Overwater Indulgence</h3>
              <div className="pkg-features">
                <span className="pkg-feat">Overwater Villa</span>
                <span className="pkg-feat">All-Inclusive</span>
              </div>
              <div className="pkg-footer">
                <div>
                  <div className="pkg-price">₹2,45,000 <small>/person</small></div>
                  <div className="pkg-was">Was ₹2,96,000 · Save 17%</div>
                </div>
                <button className="pkg-btn">Curate</button>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="pkg-card" onClick={() => handleQuickSelect('Morocco')}>
            <div className="pkg-img">
              <div className="pkg-img-bg bg-pkg4" />
              <div className="pkg-badge">Adventure</div>
              <div className="pkg-urgency">⚡ 3 spots left</div>
            </div>
            <div className="pkg-body">
              <div className="pkg-duration">8 Days • 7 Nights</div>
              <h3 className="pkg-title">Imperial Cities & Sahara Nights</h3>
              <div className="pkg-features">
                <span className="pkg-feat">Marrakesh</span>
                <span className="pkg-feat">Sahara Camp</span>
              </div>
              <div className="pkg-footer">
                <div>
                  <div className="pkg-price">₹1,12,000 <small>/person</small></div>
                  <div className="pkg-was">Was ₹1,35,000 · Save 17%</div>
                </div>
                <button className="pkg-btn">Curate</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TOP TRENDING DESTINATIONS GRID ─── */}
      <section className="destinations" id="trending-section">
        <div className="section-header">
          <div>
            <div className="section-label">Popular Searches</div>
            <h2 className="section-title">Trending Now <em>2026</em></h2>
          </div>
          <a href="#" className="see-all">See all destinations</a>
        </div>

        <div className="dest-grid">
          {/* Card 1: Bali (Large) */}
          <div className="dest-card large" onClick={() => handleQuickSelect('Bali')}>
            <div className="dest-bg bg-bali" />
            <div className="dest-overlay" />
            <span className="trend-badge">▲ 92% Heat</span>
            <div className="dest-info">
              <div className="dest-country">Indonesia</div>
              <h3 className="dest-name">Bali Island</h3>
              <div className="dest-meta">
                <span className="dest-price">From ₹42,000</span>
                <span className="dest-rating">★ 4.9 (42k searches)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Japan */}
          <div className="dest-card" onClick={() => handleQuickSelect('Tokyo')}>
            <div className="dest-bg bg-japan" />
            <div className="dest-overlay" />
            <div className="dest-info">
              <div className="dest-country">East Asia</div>
              <h3 className="dest-name">Tokyo & Kyoto</h3>
              <div className="dest-meta">
                <span className="dest-price">From ₹1,20,000</span>
                <span className="dest-rating">★ 4.8</span>
              </div>
            </div>
          </div>

          {/* Card 3: Maldives */}
          <div className="dest-card" onClick={() => handleQuickSelect('Maldives')}>
            <div className="dest-bg bg-maldives" />
            <div className="dest-overlay" />
            <span className="dest-tag">Honeymoon</span>
            <div className="dest-info">
              <div className="dest-country">Indian Ocean</div>
              <h3 className="dest-name">Maldives</h3>
              <div className="dest-meta">
                <span className="dest-price">From ₹95,000</span>
                <span className="dest-rating">★ 4.9</span>
              </div>
            </div>
          </div>

          {/* Card 4: Morocco */}
          <div className="dest-card" onClick={() => handleQuickSelect('Morocco')}>
            <div className="dest-bg bg-morocco" />
            <div className="dest-overlay" />
            <div className="dest-info">
              <div className="dest-country">North Africa</div>
              <h3 className="dest-name">Marrakesh</h3>
              <div className="dest-meta">
                <span className="dest-price">From ₹88,000</span>
                <span className="dest-rating">★ 4.7</span>
              </div>
            </div>
          </div>

          {/* Card 5: Rajasthan */}
          <div className="dest-card" onClick={() => handleQuickSelect('Rajasthan')}>
            <div className="dest-bg bg-rajasthan" />
            <div className="dest-overlay" />
            <span className="trend-badge">🔥 Rising</span>
            <div className="dest-info">
              <div className="dest-country">India Heritage</div>
              <h3 className="dest-name">Rajasthan Forts</h3>
              <div className="dest-meta">
                <span className="dest-price">From ₹18,000</span>
                <span className="dest-rating">★ 4.9</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials">
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <span className="section-label">Real Traveler Experiences</span>
          <h2 className="section-title">What TripEvo Users Say</h2>
        </div>

        <div className="testi-grid">
          {/* Testi 1 */}
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">
              "The weather intelligence rescheduled our Day 4 hike in Kyoto to Day 5 because of a rain alert, automatically moving a sushi workshop inside. Absolute lifesaver!"
            </p>
            <div className="testi-author">
              <div className="testi-avatar av1">R</div>
              <div>
                <div className="testi-name">Rohan Mehta</div>
                <div className="testi-dest">Traveled to Japan</div>
              </div>
            </div>
          </div>

          {/* Testi 2 */}
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">
              "Indian passport VoA documentation rules for Bali can be confusing, but TripEvo compiled the portal link and health declaration requirements in one screen. Planning was flawless."
            </p>
            <div className="testi-author">
              <div className="testi-avatar av2">P</div>
              <div>
                <div className="testi-name">Pooja Sharma</div>
                <div className="testi-dest">Traveled to Bali</div>
              </div>
            </div>
          </div>

          {/* Testi 3 */}
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">
              "We planned a group trip with 6 guys. Being able to vote on catamaran versus jungle trekking in the co-planning sandbox saved us hours in WhatsApp debates."
            </p>
            <div className="testi-author">
              <div className="testi-avatar av3">S</div>
              <div>
                <div className="testi-name">Samir Goel</div>
                <div className="testi-dest">Traveled to Morocco</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NEWSLETTER SIGNUP CTA ─── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Receive Travel Design Inspiration</h2>
          <p className="cta-sub">
            Join <strong style={{ color: '#E87C5A' }}>52,000+ travelers</strong> getting weekly curated destination drops, visa alerts, and exclusive AI-curated itinerary previews.
          </p>

          {newsletterSubscribed ? (
            <div style={{ color: '#E87C5A', fontWeight: '500', fontSize: '15px', padding: '12px', background: 'rgba(232,124,90,.08)', borderRadius: '30px' }}>
              ✓ You have been subscribed successfully! Check your inbox soon.
            </div>
          ) : (
            <form className="email-row" onSubmit={handleNewsletterSubmit}>
              <input 
                type="email" 
                className="email-input" 
                placeholder="Enter your email address" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
              <button type="submit" className="email-btn">Subscribe</button>
            </form>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer>
        <div className="footer-logo">TripEvo</div>
        <div className="footer-links">
          <a href="#">About</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms & Conditions</a>
          <a href="#">Support Helpdesk</a>
        </div>
        <div className="footer-copy">© 2026 TripEvo. All rights reserved. Designed with luxury.</div>
      </footer>

      {/* ─── SAVED TRIPS DRAWER ─── */}
      {showSavedDrawer && (
        <div className="fixed inset-0 z-[999] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowSavedDrawer(false)} />
          <div className="relative w-full max-w-[420px] h-full bg-[#0E0B1F]/95 backdrop-blur-xl border-l border-[var(--border)] shadow-[20px_0_60px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[#151221]/80">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                  My Saved Journeys
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your luxury curated collections</p>
              </div>
              <button 
                onClick={() => setShowSavedDrawer(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[#1E1C2E] transition-colors text-[#80848E] hover:text-white cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {savedTrips.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-[#E87C5A]/10 flex items-center justify-center text-[#E87C5A] mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white">No saved itineraries yet</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-[240px]">
                    Create and save some premium trips to see them listed here.
                  </p>
                </div>
              ) : (
                savedTrips.map((trip) => {
                  const data = trip.itinerary_data as ItineraryData;
                  const dateString = new Date(trip.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  return (
                    <div 
                      key={trip.id}
                      className="bg-[#1C1A2E]/50 border border-[var(--border)] rounded-2xl p-4 hover:border-[#E87C5A]/50 hover:bg-[#1C1A2E]/80 transition-all group cursor-pointer"
                      onClick={() => {
                        setItinerary(data);
                        setDestination(trip.destination);
                        setItineraryId(trip.id);
                        setShareToken(trip.share_token);
                        const weatherObj = trip.weather_data || trip.preferences?.weather || null;
                        setWeather(weatherObj);
                        
                        // Set activePreferences from saved trip
                        if (trip.preferences) {
                          setActivePreferences(trip.preferences);
                        } else {
                          setActivePreferences({
                            vibe: trip.itinerary_data?.budgetLevel || 'Premium Luxury',
                            vibeTags: trip.vibe_tags || [],
                            vibePhotoIds: trip.vibe_photo_ids || [],
                            weather: weatherObj
                          });
                        }
                        
                        // Reset rescheduling states
                        setReschedulingDays({});
                        setRescheduledDays({});
                        
                        setShowSavedDrawer(false);
                        setTimeout(() => {
                          const viewSection = document.getElementById('itinerary-view');
                          if (viewSection) {
                            viewSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 200);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-[#E87C5A] uppercase tracking-wider">
                          {trip.preferences?.vibe || 'Luxury'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{dateString}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#E87C5A] transition-colors line-clamp-1">
                        {trip.destination}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {data?.days?.[0]?.title || 'Premium Travel Plan'}
                      </p>
                      
                      <div className="mt-3 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-secondary)] font-medium">
                          {data?.days?.length || 7} Days • {data?.total_budget ? `₹${data.total_budget}` : 'Dynamic'}
                        </span>
                        <span className="text-[#E87C5A] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Load Details
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
