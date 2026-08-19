// ====================================================
// SAVE TO: backend/lib/geocode.js
// ====================================================
// Turns a free-text place ("Blue Bottle Coffee, San Francisco") into
// {lat, lng} using Google's Geocoding API, so the frontend can compute a
// real "X mi away" distance against the viewer's own location.
//
// This is a DIFFERENT API key than VITE_GOOGLE_MAPS_API_KEY (the frontend
// embed key). This one runs server-side only, so:
//   - it needs its own env var, GOOGLE_GEOCODING_API_KEY, in
//     backend/.env(.local) — never prefix it VITE_ or it'll get bundled
//     into client-side JS and exposed to anyone.
//   - restrict it in Google Cloud Console by IP address (your server's
//     egress IP / Railway's), not by HTTP referrer — referrer restrictions
//     don't apply to server-to-server calls.
//   - it needs the "Geocoding API" enabled for its project — a separate
//     toggle from Maps Embed API, and NOT free/unlimited like Embed is.
//     It's ~10,000 free requests/month, then paid — but since this only
//     runs once per event create/edit (not once per view), a normal
//     amount of usage stays well within the free tier.
const GEOCODE_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

// Returns {lat, lng} or null. Never throws — a geocoding miss shouldn't
// block someone from posting or editing an event; it just means that
// event won't have a real distance shown (falls back to "distance
// unknown" on the frontend).
export async function geocodeAddress(address) {
  if (!GEOCODE_KEY || !address || !address.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GEOCODE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      // ZERO_RESULTS for a vague place like "somewhere good" is expected
      // and fine; anything else (REQUEST_DENIED, OVER_QUERY_LIMIT, etc.)
      // is worth a log line so it's easy to spot a misconfigured key.
      if (data.status !== "ZERO_RESULTS") {
        console.error("geocode failed for", address, data.status, data.error_message);
      }
      return null;
    }

    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("geocode request failed for", address, err);
    return null;
  }
}