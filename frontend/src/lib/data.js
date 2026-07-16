// The mock friends/activities that used to live here (rawFriends(),
// baseActivities(), weekActivities()) are gone — that data now comes from
// the real backend via lib/api.js + useLoopedApp's loadBoard(). fmtName()
// is still used client-side to turn a {first,last} pair from the API into
// the "kat t." display style, so it stays.

export function fmtName(first, last) {
  if (!first) return 'you';
  return (first + (last ? ' ' + last[0] + '.' : '')).toLowerCase();
}
