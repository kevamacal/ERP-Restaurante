/**
 * Rounds a Date or ISO date string to the nearest 30 minutes (:00 or :30).
 * Examples:
 *  12:05 -> 12:00
 *  12:14 -> 12:00
 *  12:15 -> 12:30
 *  12:44 -> 12:30
 *  12:45 -> 13:00
 */
export function getRounded30MinDate(dateInput?: Date | string | number): Date {
  const date = dateInput ? new Date(dateInput) : new Date();
  const ms30Min = 30 * 60 * 1000;
  const roundedMs = Math.round(date.getTime() / ms30Min) * ms30Min;
  return new Date(roundedMs);
}

export function getRounded30MinISOString(dateInput?: Date | string | number): string {
  return getRounded30MinDate(dateInput).toISOString();
}

export function getRounded30MinLocalInputString(dateInput?: Date | string | number): string {
  const rounded = getRounded30MinDate(dateInput);
  const tzOffset = rounded.getTimezoneOffset() * 60000;
  return new Date(rounded.getTime() - tzOffset).toISOString().slice(0, 16);
}
