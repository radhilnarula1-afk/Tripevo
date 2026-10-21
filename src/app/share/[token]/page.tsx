'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/backend/db/supabase/client';
import AuthButton from '@/frontend/components/AuthButton';

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
  lat?: number;
  lng?: number;
}

interface BudgetCategory {
  name: string;
  amount: string;
}

interface ItineraryData {
  days: DayItinerary[];
  map_locations: MapLocation[];
  total_budget: string;
  budget_usage_pct: number;
  budget_categories: BudgetCategory[];
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

interface VoteCount {
  up: number;
  down: number;
  userVote: 'up' | 'down' | null;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSuggestion?: boolean;
  dayAssociation?: number;
  voteCount?: number;
  userVoted?: 'up' | 'down' | null;
}

export default function SharedItineraryPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<any>(null);
  const [itineraryId, setItineraryId] = useState<string>('');
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteCount>>({});
  const [voterSessionId, setVoterSessionId] = useState<string>('');
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeActivityName, setActiveActivityName] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [suggestionDay, setSuggestionDay] = useState(1);
  const [chatGuestName, setChatGuestName] = useState('');
  const [chatNameSet, setChatNameSet] = useState(false);
  const [activePlanners, setActivePlanners] = useState(1);

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  // Ref to subscribed chat channel for reuse in sendChatMessage
  const chatChannelRef = React.useRef<any>(null);

  // Room code from ?room= query param (set when main page shares a collab link)
  const [roomCode, setRoomCode] = useState<string>('');

  // Initialize Voter Session ID and read ?room= param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let localSessionId = localStorage.getItem('tripevo_voter_session_id');
    if (!localSessionId) {
      localSessionId = `voter_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      localStorage.setItem('tripevo_voter_session_id', localSessionId);
    }
    setVoterSessionId(localSessionId);

    // Pick up room code from URL e.g. /share/abc123?room=TEVE-1234
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    if (room) setRoomCode(room.toUpperCase());
  }, []);

  // Fetch Itinerary and Votes
  useEffect(() => {
    if (!token) return;

    const fetchItineraryAndVotes = async () => {
      try {
        setLoading(true);
        // Fetch itinerary details by token
        const { data: itinData, error: itinError } = await supabase
          .from('itineraries')
          .select('*')
          .eq('share_token', token)
          .single();

        if (itinError || !itinData) {
          console.error('Failed to load itinerary:', itinError);
          setLoading(false);
          return;
        }

        setItinerary(itinData);
        setItineraryId(itinData.id);
        setItineraryData(itinData.itinerary_data as ItineraryData);
        
        // Retrieve weather from preferences or weather_data column
        const prefs = itinData.preferences as any;
        const weatherObj = itinData.weather_data || prefs?.weather || null;
        setWeather(weatherObj);

        // Fetch votes for this itinerary
        await fetchVotes(itinData.id);
      } catch (err) {
        console.error('Error fetching shared data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItineraryAndVotes();
  }, [token, voterSessionId]);

  // Fetch Votes Helper
  const fetchVotes = async (idToQuery: string) => {
    if (!idToQuery || !voterSessionId) return;

    const { data: votesList, error } = await supabase
      .from('itinerary_votes')
      .select('*')
      .eq('itinerary_id', idToQuery);

    if (error) {
      console.error('Error fetching votes:', error);
      return;
    }

    // Process and aggregate votes
    const votesMap: Record<string, VoteCount> = {};
    
    // Pre-initialize empty structures
    if (itineraryData?.days) {
      itineraryData.days.forEach((day, dayIdx) => {
        day.activities.forEach((_, actIdx) => {
          const key = `day_${dayIdx}_act_${actIdx}`;
          votesMap[key] = { up: 0, down: 0, userVote: null };
        });
      });
    }

    votesList?.forEach((v: any) => {
      const key = v.activity_slot_id;
      if (!votesMap[key]) {
        votesMap[key] = { up: 0, down: 0, userVote: null };
      }
      
      if (v.vote === 'up') {
        votesMap[key].up += 1;
      } else if (v.vote === 'down') {
        votesMap[key].down += 1;
      }

      if (v.voter_session_id === voterSessionId) {
        votesMap[key].userVote = v.vote as 'up' | 'down';
      }
    });

    setVotes(votesMap);
  };

  // Setup Realtime listener for votes
  useEffect(() => {
    if (!itineraryId || !voterSessionId) return;

    const channelName = `realtime-shared-votes-${itineraryId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itinerary_votes',
          filter: `itinerary_id=eq.${itineraryId}`,
        },
        () => {
          // Re-fetch votes when database notifications arrive
          fetchVotes(itineraryId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itineraryId, voterSessionId, itineraryData]);

  // Setup Realtime Chat Channel
  useEffect(() => {
    if (!itineraryId && !roomCode) return;

    // If a room code is provided (from the share link), use the main page's collab channel
    // so messages sync between the main page and share page in real time
    const chatChannelName = roomCode
      ? `tripevo-collab-${roomCode.toLowerCase()}`
      : `tripevo-chat-${itineraryId}`;

    const chatChannel = supabase
      .channel(chatChannelName, { config: { broadcast: { self: true }, presence: { key: voterSessionId || 'guest' } } })
      .on('broadcast', { event: 'chat_message' }, ({ payload }: any) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .on('broadcast', { event: 'chat_msg' }, ({ payload }: any) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(chatChannel.presenceState()).length;
        setActivePlanners(Math.max(1, count));
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Store in ref so sendChatMessage can reuse it
          chatChannelRef.current = chatChannel;
          if (voterSessionId) {
            chatChannel.track({ joined_at: new Date().toISOString() });
          }
        }
      });

    return () => {
      supabase.removeChannel(chatChannel);
      chatChannelRef.current = null;
    };
  }, [itineraryId, voterSessionId, roomCode]);

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const name = chatGuestName || `Guest-${voterSessionId.substring(6, 10)}`;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: name,
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSuggestion,
      dayAssociation: isSuggestion ? suggestionDay : undefined,
      voteCount: 0,
      userVoted: null
    };

    // Use the stored subscribed channel ref — do NOT create a new channel here
    if (chatChannelRef.current) {
      const eventName = roomCode ? 'chat_message' : 'chat_msg';
      chatChannelRef.current.send({ type: 'broadcast', event: eventName, payload: msg });
    }
    setChatInput('');
    setIsSuggestion(false);
  };

  // Handle Casting a Vote
  const castVote = async (dayIdx: number, actIdx: number, direction: 'up' | 'down') => {
    if (!itineraryId || !voterSessionId) return;

    const key = `day_${dayIdx}_act_${actIdx}`;
    const current = votes[key] || { up: 0, down: 0, userVote: null };

    // Toggle vote logic
    if (current.userVote === direction) {
      // Undo vote
      // Optimistic update
      setVotes(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          up: direction === 'up' ? prev[key].up - 1 : prev[key].up,
          down: direction === 'down' ? prev[key].down - 1 : prev[key].down,
          userVote: null
        }
      }));

      const { error } = await supabase
        .from('itinerary_votes')
        .delete()
        .match({
          itinerary_id: itineraryId,
          activity_slot_id: key,
          voter_session_id: voterSessionId
        });

      if (error) {
        console.error('Delete vote failed:', error);
        fetchVotes(itineraryId); // Rollback
      }
    } else {
      // Cast new vote or flip vote direction
      const oldDirection = current.userVote;
      
      // Optimistic update
      setVotes(prev => {
        const nextUp = direction === 'up' ? prev[key].up + 1 : prev[key].up;
        const nextDown = direction === 'down' ? prev[key].down + 1 : prev[key].down;
        const finalUp = oldDirection === 'up' ? nextUp - 1 : nextUp;
        const finalDown = oldDirection === 'down' ? nextDown - 1 : nextDown;
        
        return {
          ...prev,
          [key]: {
            up: finalUp,
            down: finalDown,
            userVote: direction
          }
        };
      });

      const { error } = await supabase
        .from('itinerary_votes')
        .upsert({
          itinerary_id: itineraryId,
          activity_slot_id: key,
          voter_session_id: voterSessionId,
          vote: direction
        }, {
          onConflict: 'itinerary_id,activity_slot_id,voter_session_id'
        });

      if (error) {
        console.error('Upsert vote failed:', error);
        fetchVotes(itineraryId); // Rollback
      }
    }
  };

  // Leaflet CDN Script injector
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
    const validLocs = (itineraryData?.map_locations || []).filter(
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
    if (!mapLoaded || !itineraryData) return;
    const L = (window as any).L;
    if (!L) return;

    const center = getDestinationCenter();
    const defaultZoom = center.hasRealCoords ? 12 : 10;

    let map = mapInstance;
    const container = document.getElementById('shared-map');
    if (!container) return;

    if (!map) {
      map = L.map('shared-map', {
        zoomControl: false,
        attributionControl: false
      }).setView([center.lat, center.lng], defaultZoom);

      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      setMapInstance(map);

      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 250);
    } else {
      map.setView([center.lat, center.lng], defaultZoom);
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 150);
    }
  }, [mapLoaded, itineraryData]);

  // Update map markers and fly-to view dynamically based on active day/activity
  useEffect(() => {
    if (!mapInstance || !itineraryData) return;
    const L = (window as any).L;
    if (!L) return;

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

    // Safely parse day numbers
    const dayLocations = (itineraryData.map_locations || []).filter((loc: any, idx: number) => {
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

        let isFocused = false;
        if (activeActivityName) {
          const actNorm = activeActivityName.toLowerCase();
          const nameNorm = String(loc.name || '').toLowerCase();
          isFocused = nameNorm.includes(actNorm) || actNorm.includes(nameNorm) ||
                      nameNorm.split(' ').some(w => w.length > 3 && actNorm.includes(w));
          if (!isFocused && itineraryData.days[activeDayIdx]?.activities) {
            const actIdx = itineraryData.days[activeDayIdx].activities.indexOf(activeActivityName);
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

      if (!activeActivityName && latLngs.length > 1) {
        try {
          const bounds = L.latLngBounds(latLngs);
          mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
        } catch (_) {}
      }
    } else {
      mapInstance.flyTo([center.lat, center.lng], 12, {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.3
      });
    }

    return () => {
      currentMarkers.forEach(m => {
        try { mapInstance.removeLayer(m); } catch (_) {}
      });
    };
  }, [mapInstance, itineraryData, activeDayIdx, activeActivityName]);

  // Unified day selection handler to update index and reset activity focus
  const handleDaySelect = (idx: number) => {
    setActiveActivityName(null);
    setActiveDayIdx(idx);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09070F] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E87C5A]"></div>
          <p className="text-sm text-[var(--text-secondary)]">Retrieving itinerary details...</p>
        </div>
      </div>
    );
  }

  if (!itinerary || !itineraryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09070F] text-white p-4">
        <div className="max-w-md text-center p-8 bg-[#151221] border border-red-500/20 rounded-3xl shadow-xl">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Itinerary Not Found</h1>
          <p className="text-[#949BA4] text-sm mb-6">The sharing token is invalid or has expired.</p>
          <a href="/" className="inline-block px-6 py-2.5 rounded-xl font-medium bg-[#E87C5A] hover:bg-[#d66c4c] transition-colors text-sm">
            Go to TripEvo Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09070F] text-[#E4E6EB] relative overflow-x-hidden font-['DM_Sans']">
      
      {/* ─── NAVIGATION NAVBAR ─── */}
      <nav className="h-20 px-8 border-b border-[#242132] flex items-center justify-between bg-[#0E0C1A]/80 backdrop-blur-md sticky top-0 z-[500] no-print">
        <a href="/" className="text-xl font-bold tracking-widest text-white flex items-center gap-1 hover:opacity-95 transition-opacity">
          TripEvo<span className="w-1.5 h-1.5 rounded-full bg-[#E87C5A]" />
        </a>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all hover:scale-[1.02] border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #242132 0%, #151221 100%)', border: '1px solid rgba(255,255,255,0.11)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 17 12 21 16 17"></polyline>
              <line x1="12" y1="12" x2="12" y2="21"></line>
              <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path>
            </svg>
            Download PDF
          </button>
          <AuthButton />
        </div>
      </nav>

      {/* ─── HERO CO-PLANNING HEADER ─── */}
      <section className="relative pt-12 pb-6 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 p-8 bg-[#151221]/40 border border-[#242132] rounded-[32px] backdrop-blur-sm shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <div className="text-center md:text-left">
            <span className="inline-block bg-[#E87C5A]/10 text-[#E87C5A] text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
              Collaborative Sandbox
            </span>
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">
              Shared Journey to <em>{itinerary.destination}</em>
            </h1>
            <p className="text-sm text-[#949BA4] max-w-xl">
              Anyone with this link can cast votes on activities to build the perfect travel plan. Changes synchronize in real-time.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 bg-[#1D1B2B]/60 p-4 border border-[#2B293F] rounded-2xl text-center md:text-left">
            <span className="text-[11px] font-bold text-[#E87C5A] uppercase tracking-wider">Session Active</span>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-[#E4E6EB] font-medium">Synced via Supabase Realtime</span>
            </div>
            <span className="text-[10px] text-[#80848E] mt-1">Voting as Guest: {voterSessionId.substring(0, 10)}...</span>
          </div>
        </div>
      </section>

      {/* ─── MAIN TIMELINE GRID ─── */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Day timeline */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {itineraryData.days.map((day, dayIdx) => {
              const isActive = dayIdx === activeDayIdx;
              return (
                <div 
                  key={dayIdx} 
                  className={`bg-[#151221]/30 border rounded-[24px] p-6 transition-all duration-300 ${
                    isActive ? 'border-[#E87C5A] bg-[#151221]/50' : 'border-[#242132] hover:border-[#343147]'
                  }`}
                  onClick={() => handleDaySelect(dayIdx)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E87C5A] text-white font-bold text-sm shrink-0">
                      {day.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-white leading-tight">{day.title}</h3>
                        <span className="text-xs text-[#80848E] font-medium bg-[#1C1A27] px-2 py-1 rounded">
                          {day.day_budget_est ? `₹${day.day_budget_est}` : 'Dynamic'}
                        </span>
                      </div>
                      <p className="text-sm text-[#949BA4] mb-5 leading-relaxed">{day.desc}</p>
                      
                      {/* Activities List */}
                      <div className="flex flex-col gap-4 relative pl-4 border-l border-[#E87C5A]/20">
                        {day.activities.map((act, actIdx) => {
                          const key = `day_${dayIdx}_act_${actIdx}`;
                          const timeLabel = actIdx === 0 ? "Morning (9:00 AM)" : actIdx === 1 ? "Afternoon (1:30 PM)" : "Evening (7:00 PM)";
                          const currentVote = votes[key] || { up: 0, down: 0, userVote: null };
                          const netScore = currentVote.up - currentVote.down;
                          const isActActive = activeActivityName && (
                            act.toLowerCase().includes(activeActivityName.toLowerCase()) ||
                            activeActivityName.toLowerCase().includes(act.toLowerCase())
                          );

                          return (
                            <div
                              key={actIdx}
                              onClick={() => setActiveActivityName(act)}
                              className={`relative flex items-center justify-between gap-4 bg-[#1E1C2E]/40 border rounded-2xl p-4 shadow-sm group transition-all duration-300 cursor-pointer ${
                                isActActive
                                  ? 'border-[#E87C5A] shadow-[0_0_12px_rgba(232,124,90,0.15)] bg-[#1E1C2E]/70'
                                  : 'border-[#2B293F] hover:border-[#E87C5A]/40'
                              }`}
                            >
                              <div className="absolute -left-[21px] top-5 w-2.5 h-2.5 rounded-full bg-[#E87C5A] border-2 border-[#09070F]" />
                              
                              <div className="flex-1 min-w-0">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#E87C5A] mb-1">{timeLabel}</span>
                                <span className="text-sm text-[#E4E6EB] leading-tight block pr-2">{act}</span>
                              </div>

                              {/* Voting Interface */}
                              <div className="flex items-center gap-1.5 bg-[#141221] border border-[#242132] p-1.5 rounded-xl self-center shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    castVote(dayIdx, actIdx, 'up');
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    currentVote.userVote === 'up'
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : 'text-[#80848E] hover:text-white hover:bg-[#1E1C2E]'
                                  }`}
                                  title="Upvote Activity"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 15 12 9 6 15"></polyline>
                                  </svg>
                                </button>
                                
                                <span className={`text-xs font-bold px-1 min-w-[20px] text-center ${
                                  netScore > 0 ? 'text-emerald-500' : netScore < 0 ? 'text-rose-500' : 'text-[#80848E]'
                                }`}>
                                  {netScore > 0 ? `+${netScore}` : netScore}
                                </span>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    castVote(dayIdx, actIdx, 'down');
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    currentVote.userVote === 'down'
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      : 'text-[#80848E] hover:text-white hover:bg-[#1E1C2E]'
                                  }`}
                                  title="Downvote Activity"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#242132] text-xs text-[#80848E]">
                        <span className="flex items-center gap-1">
                          <span>{day.weather_emoji || '☀️'}</span>
                          <span>{weather?.forecast[dayIdx]?.condition || 'Clear Sky'}</span>
                        </span>
                        <span>Day total est: ₹{day.day_budget_est || '8,500'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Map & Weather Forecasts */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Real Map Box */}
            <div className="bg-[#151221]/30 border border-[#242132] rounded-[32px] p-6 relative overflow-hidden">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" y1="3" x2="9" y2="18"></line>
                  <line x1="15" y1="6" x2="15" y2="21"></line>
                </svg>
                Geocoded Trip Route
              </h3>
              
              <div style={{ height: '360px', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '20px' }}>
                <div id="shared-map" style={{ width: '100%', height: '100%' }} />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#09070F]/90 z-10 text-xs text-[#80848E]">
                    Initializing Leaflet Map Engine...
                  </div>
                )}
              </div>
            </div>

            {/* Weather Box */}
            {weather && (
              <div className="bg-[#151221]/30 border border-[#242132] rounded-[32px] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-white">7-Day Real weather forecast</h3>
                  <span className="text-xs text-[#80848E]">{weather.locationName}, {weather.country}</span>
                </div>

                {weather.alertMessage && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-3 rounded-xl mb-4 leading-relaxed">
                    <strong>Reschedule Alert:</strong> {weather.alertMessage}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {weather.forecast.map((wDay, idx) => {
                    const isSelected = idx === activeDayIdx;
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                          isSelected 
                            ? 'border-[#E87C5A] bg-[#E87C5A]/5' 
                            : 'border-[#242132] bg-[#1C1A27]/20'
                        }`}
                      >
                        <span className="text-xs font-semibold text-white w-20">{wDay.dayName}</span>
                        <span className="text-lg">{wDay.emoji}</span>
                        <span className="text-xs text-[#949BA4] w-24 text-right">{wDay.condition}</span>
                        <span className="text-xs font-bold text-white w-12 text-right">{wDay.temp}°C</span>
                        <span className="text-[10px] text-[#80848E] w-12 text-right">{wDay.precipChance}% rain</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget Tracker Widget */}
            <div className="bg-[#151221]/30 border border-[#242132] rounded-[32px] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-white">Trip Budget Tracker</h3>
                <span className="text-xs font-bold text-[#E87C5A]">₹{itineraryData.total_budget || '58,400'}</span>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs text-[#80848E] mb-1">
                  <span>Budget Used</span>
                  <span>{itineraryData.budget_usage_pct || 75}% Used</span>
                </div>
                <div className="w-full h-1.5 bg-[#242132] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#E87C5A] to-[#D4A853] rounded-full" 
                    style={{ width: `${itineraryData.budget_usage_pct || 75}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {itineraryData.budget_categories?.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-[#1C1A27]/20 border border-[#242132] rounded-lg">
                    <span className="text-[#949BA4]">{cat.name}</span>
                    <span className="text-white font-semibold">₹{cat.amount}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── LIVE GROUP CHAT SECTION ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-16 no-print">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Group Chat
            </h2>
            <span className="text-xs text-[#80848E]">{activePlanners} viewer{activePlanners !== 1 ? 's' : ''} online</span>
          </div>

          {/* Name Setup */}
          {!chatNameSet && (
            <div className="mb-4 p-4 rounded-2xl border flex gap-3 items-center" style={{ background: 'rgba(232,124,90,0.05)', borderColor: 'rgba(232,124,90,0.2)' }}>
              <input
                type="text"
                placeholder="Enter your name to join the chat"
                value={chatGuestName}
                onChange={(e) => setChatGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && chatGuestName.trim() && setChatNameSet(true)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #242132', color: '#E4E6EB' }}
              />
              <button
                onClick={() => chatGuestName.trim() && setChatNameSet(true)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #E87C5A, #D4A853)' }}
              >
                Join
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="rounded-[24px] border overflow-hidden" style={{ background: '#151221', borderColor: '#242132' }}>
            <div className="h-[280px] overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {chatMessages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-[#80848E] text-center">No messages yet. Be the first to say something! 👋<br/><span className="text-xs">Messages sync in real-time across all viewers of this link.</span></p>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-[#E87C5A] to-[#D4A853]">
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{msg.sender}</span>
                      <span className="text-[10px] text-[#80848E]">{msg.timestamp}</span>
                    </div>
                    {msg.isSuggestion ? (
                      <div className="rounded-xl p-3 mt-1" style={{ background: 'rgba(232,124,90,0.08)', border: '1px solid rgba(232,124,90,0.2)' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[#E87C5A]">Proposed for Day {msg.dayAssociation}</div>
                        <div className="text-sm text-white font-medium">{msg.text}</div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#949BA4] leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t" style={{ borderColor: '#242132' }}>
              <form onSubmit={sendChatMessage} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={chatNameSet ? `Message as ${chatGuestName}...` : 'Set your name above to chat'}
                    disabled={!chatNameSet}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #242132', color: '#E4E6EB' }}
                  />
                  <button
                    type="submit"
                    disabled={!chatNameSet || !chatInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #E87C5A, #D4A853)' }}
                  >
                    Send
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#80848E]">
                  <input
                    type="checkbox"
                    checked={isSuggestion}
                    onChange={(e) => setIsSuggestion(e.target.checked)}
                    className="rounded"
                  />
                  Propose as activity for Day
                  {isSuggestion && (
                    <select
                      value={suggestionDay}
                      onChange={(e) => setSuggestionDay(Number(e.target.value))}
                      className="ml-1 text-xs rounded px-2 py-0.5 outline-none"
                      style={{ background: '#1C1A2E', border: '1px solid #242132', color: '#E4E6EB' }}
                    >
                      {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </label>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-8 border-t border-[#242132] py-8 px-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0E0C1A] no-print">
        <div className="text-md font-bold tracking-widest text-white">TripEvo</div>
        <div className="text-xs text-[#80848E]">© 2026 TripEvo. Real-time travel co-planning dashboard.</div>
      </footer>
    </div>
  );
}
