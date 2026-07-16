// The v1 frontend renders avatar colors as literal hex strings (see the
// mock palette in app/src/lib/data.js), not palette names — so this now
// returns hex directly instead of a name like "mauve". Same stable-hash
// approach as before: a given user id always maps to the same color.

const PALETTE = ["#e0a878", "#a8c4e0", "#9db8a4", "#c9a8d8", "#d8a8a8", "#a8c8c8"];

export function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
