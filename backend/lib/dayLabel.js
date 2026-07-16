const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dayLabelFor(offset, now = new Date()) {
  if (!offset) return "today";
  if (offset === 1) return "tomorrow";
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return WEEKDAYS[d.getDay()];
}
