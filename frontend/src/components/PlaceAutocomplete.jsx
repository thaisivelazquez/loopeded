// ====================================================
// SAVE TO: frontend/src/components/PlaceAutocomplete.jsx
// ====================================================
import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_KEY, loadGoogleMaps } from '../lib/googleMaps.js';

// A plain text input that shows a live dropdown of Google Places
// suggestions as the person types, using the same Places (New) API /
// key already set up for EventMap. Falls back to a normal, unassisted
// text input if no key is configured — nothing else in the composer
// depends on this working.
//
// Props match a normal controlled input: value + onChange(event with
// target.value), so it's a drop-in replacement for <input> in Composer.
export default function PlaceAutocomplete({ value, onChange, placeholder, style }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const sessionTokenRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  async function fetchSuggestions(text) {
    if (!GOOGLE_MAPS_KEY || !text.trim()) {
      setSuggestions([]);
      return;
    }
    // Guards against an earlier, slower request overwriting a later one's
    // results if responses arrive out of order.
    const requestId = ++requestIdRef.current;
    try {
      const maps = await loadGoogleMaps();
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await maps.importLibrary('places');
      if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();

      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: text,
        sessionToken: sessionTokenRef.current
      });

      if (requestId !== requestIdRef.current) return; // superseded by a newer keystroke
      setSuggestions((results || []).filter((s) => s.placePrediction));
      setOpen(true);
      setHighlighted(-1);
    } catch (e) {
      console.error('autocomplete failed', e);
    }
  }

  function handleChange(e) {
    onChange(e); // keep the parent's controlled value in sync immediately
    const text = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 200);
  }

  function pick(suggestion) {
    const text = suggestion.placePrediction.text.text;
    onChange({ target: { value: text } });
    setSuggestions([]);
    setOpen(false);
    sessionTokenRef.current = null; // a session ends once a place is chosen
  }

  function handleKeyDown(e) {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      pick(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'rgba(255,251,246,.98)', border: '1px solid rgba(58,44,40,.15)',
            borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,.14)', zIndex: 60,
            overflow: 'hidden', maxHeight: 220, overflowY: 'auto'
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                font: '600 13.5px Karla,sans-serif', color: '#3a2c28',
                background: highlighted === i ? 'rgba(255,138,92,.14)' : 'transparent',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(58,44,40,.08)' : 'none'
              }}
            >
              {s.placePrediction.text.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}