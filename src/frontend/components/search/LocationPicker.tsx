import React, { useState } from 'react';
import { Navigation, MapPin, Map } from 'lucide-react';

interface LocationPickerProps {
  destination: string;
  onSelect: (location: string) => void;
}

export default function LocationPicker({ destination, onSelect }: LocationPickerProps) {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const handleNearbyClick = () => {
    setLoadingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Using free Nominatim API for reverse geocoding
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.state || 'Unknown Location';
            onSelect(`${city}, ${data.address.country || ''}`);
          } catch (error) {
            console.error('Geocoding error', error);
            onSelect('Nearby (Location Found)');
          } finally {
            setLoadingLocation(false);
          }
        },
        (error) => {
          console.error(error);
          setLoadingLocation(false);
          alert('Location access denied. Please enable it in your browser.');
        }
      );
    } else {
      setLoadingLocation(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const suggestions = [
    { city: 'Guwahati, Assam', sub: 'For sights like Kamakhya Temple', icon: <Map className="text-orange-400" /> },
    { city: 'New Delhi, Delhi', sub: 'For its stunning architecture', icon: <MapPin className="text-emerald-500" /> },
    { city: 'North Goa, Goa', sub: 'Popular beach destination', icon: <Map className="text-amber-500" /> },
    { city: 'Bengaluru, Karnataka', sub: 'For its top-notch dining', icon: <MapPin className="text-rose-400" /> },
    { city: 'Mumbai, Maharashtra', sub: 'For sights like Gateway of India', icon: <Map className="text-teal-500" /> }
  ];

  return (
    <div className="absolute top-[120%] left-0 w-[420px] bg-[var(--bg-glass)] backdrop-blur-2xl border border-[var(--border)] rounded-[32px] p-6 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
      <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-4 ml-2">Suggested destinations</h3>
      
      <div className="flex flex-col gap-2">
        <button 
          onClick={handleNearbyClick}
          disabled={loadingLocation}
          className="flex items-center gap-4 w-full text-left p-3 hover:bg-[var(--card-hover)] rounded-2xl transition-all disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            {loadingLocation ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Navigation size={22} />}
          </div>
          <div>
            <div className="font-medium text-[15px] text-[var(--text-primary)]">Nearby</div>
            <div className="text-[13px] text-[var(--text-muted)] mt-0.5">Find what's around you</div>
          </div>
        </button>

        {suggestions.map((item, i) => (
          <button 
            key={i}
            onClick={() => onSelect(item.city)}
            className="flex items-center gap-4 w-full text-left p-3 hover:bg-[var(--card-hover)] rounded-2xl transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-alt)] border border-[var(--border)] flex items-center justify-center">
              {item.icon}
            </div>
            <div>
              <div className="font-medium text-[15px] text-[var(--text-primary)]">{item.city}</div>
              <div className="text-[13px] text-[var(--text-muted)] mt-0.5">{item.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
