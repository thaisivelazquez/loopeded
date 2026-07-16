// The v1 frontend's board groups activities by a fractional "hour of day"
// (e.g. 14.5 = 2:30pm) and a "dayOffset" (0 = today, 1 = tomorrow, ...).
// The DB just stores a real timestamp ("startAt"), so these helpers convert
// between the two on read/write. Calculated against server local time —
// swap in a per-user timezone here if you add one to the User table.

export function toBoardFields(startAt, now = new Date()) {
  const start = new Date(startAt);
  const dayOffset = calendarDayDiff(now, start);
  const hour = start.getHours() + start.getMinutes() / 60;
  return { hour, dayOffset };
}

// Rebuilds a real Date from the composer's {dayOffset, hour} inputs.
export function fromBoardFields(dayOffset, hour, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + (Number(dayOffset) || 0));
  const h = Number(hour) || 0;
  d.setHours(Math.floor(h), Math.round((h - Math.floor(h)) * 60), 0, 0);
  return d;
}

function calendarDayDiff(now, then) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((b - a) / 86400000);
}

export function postedAgo(createdAt, now = new Date()) {
  const mins = Math.max(0, Math.round((now - new Date(createdAt)) / 60000));
  if (mins < 1) return "posted just now";
  if (mins < 60) return `posted ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `posted ${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "posted yesterday";
  return `posted ${days} days ago`;
}
