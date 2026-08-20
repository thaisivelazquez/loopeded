// ====================================================
// SAVE TO: frontend/src/components/EventMap.jsx
// ====================================================
import { useEffect, useRef } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Loads the Google Maps JS API script exactly once per page load, no
// matter how many times this component mounts (e.g. opening several
// different event detail cards in a row all reuse the same script tag /
// loader promise instead of re-injecting <script> repeatedly).
let loaderPromise = null;
function loadGoogleMaps() {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve(window.google.maps);
      return;
    }
    const script = document.createElement('script');
    const params = new URLSearchParams({ key: GOOGLE_MAPS_KEY, v: 'weekly', libraries: 'places,marker' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => { loaderPromise = null; reject(new Error('failed to load Google Maps')); };
    script.onload = () => resolve(window.google.maps);
    document.head.appendChild(script);
  });
  return loaderPromise;
}

// Renders a small map centered on `place` (free-text address, e.g.
// "Blue Bottle Coffee, San Francisco"), using the Places "text search" +
// Maps JS API combo — the same APIs/key setup already confirmed working,
// rather than the separate Maps Embed API (which needs its own toggle in
// Cloud Console and kept 403ing).
export default function EventMap({ place }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_MAPS_KEY || !place || !containerRef.current) return;

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const [{ Map }, { Place }, { AdvancedMarkerElement }] = await Promise.all([
          maps.importLibrary('maps'),
          maps.importLibrary('places'),
          maps.importLibrary('marker')
        ]);

        const { places } = await Place.searchByText({
          textQuery: place,
          fields: ['displayName', 'location'],
          maxResultCount: 1
        });

        if (cancelled || !containerRef.current) return;

        const first = places && places[0];
        // Fallback center (roughly the middle of the US) if the text
        // search comes up empty — e.g. a placeholder location like
        // "somewhere good" that was never meant to be geocodable.
        const center = first ? first.location : { lat: 39.8283, lng: -98.5795 };

        const map = new Map(containerRef.current, {
          center,
          zoom: first ? 15 : 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: 'DEMO_MAP_ID'
        });

        if (first) {
          new AdvancedMarkerElement({ map, position: first.location, title: first.displayName });
        }
      } catch (e) {
        console.error('event map failed to load', e);
      }
    })();

    return () => { cancelled = true; };
  }, [place]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div style={{ marginTop: 9, height: 110, borderRadius: 14, background: 'rgba(58,44,40,.08)', display: 'grid', placeItems: 'center', font: '600 12.5px Karla,sans-serif', color: 'rgba(58,44,40,.45)' }}>
        map preview 🗺️
      </div>
    );
  }

  return <div ref={containerRef} style={{ marginTop: 9, width: '100%', height: 150, borderRadius: 14, background: 'rgba(58,44,40,.08)' }} />;
}