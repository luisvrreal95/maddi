/**
 * Parse a date-only string (YYYY-MM-DD) as local date at start of day.
 * This avoids timezone issues when comparing dates.
 */
export function parseDateOnlyStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Parse a date-only string (YYYY-MM-DD) as local date at end of day.
 * This avoids timezone issues when comparing dates.
 */
export function parseDateOnlyEnd(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * Get today's date at start of day (local time).
 */
export function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Get today's date at end of day (local time).
 */
export function getTodayEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}
