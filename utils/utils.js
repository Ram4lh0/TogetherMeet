import { MONTHS } from "../styles/theme";

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function dateToKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeekSunday(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

export function getRollingCalendarDays(startDate, weeks = 4) {
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(startDate, i));
}

export function formatDateShort(key) {
  const d = keyToDate(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatDateLong(key) {
  const d = keyToDate(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function parseTime(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function timeLabel(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function formatSlotInterval(dateKey, slotId, duration = 30) {
  const startTotal = Number(slotId);
  const endTotal = startTotal + duration;
  const startDayOffset = Math.floor(startTotal / 1440);
  const endDayOffset = Math.floor(endTotal / 1440);
  const startDateKey = dateToKey(addDays(keyToDate(dateKey), startDayOffset));
  const endDateKey = dateToKey(addDays(keyToDate(dateKey), endDayOffset));
  const start = timeLabel(startTotal);
  const end = timeLabel(endTotal);
  return {
    date: formatDateLong(startDateKey),
    range: `${start}–${end}`,
    endDate: endDateKey !== startDateKey ? formatDateLong(endDateKey) : null,
  };
}

export function generateSlots(startTime, endTime) {
  const start = parseTime(startTime);
  let end = parseTime(endTime);
  if (end <= start) end += 1440;
  const slots = [];
  for (let m = start; m < end; m += 30) {
    slots.push({ id: String(m), label: timeLabel(m), dayOffset: Math.floor(m / 1440), isHour: m % 60 === 0 });
  }
  return slots;
}

export function slotKey(dateKey, slotId) {
  return `${dateKey}|${slotId}`;
}

export function possibleDaysLabel(count) {
  return `${count} dia${count !== 1 ? "s" : ""} possíve${count !== 1 ? "is" : "l"}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function blurActiveElement() {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active && typeof active.blur === "function") active.blur();
}
