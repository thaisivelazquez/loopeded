export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function nowHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60;
}

export function modeForHour(h) {
  if (h >= 5 && h < 15) return 'morning';
  if (h >= 15 && h < 20.5) return 'sunset';
  return 'night';
}

export function gradientForMode(mode) {
  return {
    morning: 'linear-gradient(100deg,#ffe9c2 0%,#ffd7c9 55%,#ffd0dc 100%)',
    sunset: 'linear-gradient(100deg,#ffd2a8 0%,#f7bcbe 55%,#f0b0c8 100%)',
    night: 'linear-gradient(100deg,#b3bce8 0%,#ccbce8 55%,#e4cbee 100%)'
  }[mode];
}

export function fmtTime(h) {
  h = ((h % 24) + 24) % 24;
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  const ampm = hr >= 12 ? 'pm' : 'am';
  let hh = hr % 12;
  if (hh === 0) hh = 12;
  return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ampm;
}

export function dayLabel(offset) {
  if (!offset) return 'today';
  if (offset === 1) return 'tomorrow';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return WEEKDAYS[d.getDay()];
}

export function clockLine(now) {
  const d = new Date();
  return WEEKDAYS[d.getDay()] + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ' · ' + fmtTime(now);
}
