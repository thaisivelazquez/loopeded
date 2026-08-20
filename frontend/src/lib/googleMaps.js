// ====================================================
// SAVE TO: frontend/src/lib/googleMaps.js
// ====================================================
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Loads the Google Maps JS API script exactly once per page load, no
// matter how many components/times this is called (EventMap and the
// composer's place autocomplete both call this and share the same
// script tag / loader promise instead of each injecting their own).
let loaderPromise = null;
export function loadGoogleMaps() {
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