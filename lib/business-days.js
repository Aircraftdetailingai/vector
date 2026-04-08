/**
 * Business-day schedule calculator.
 * Skips Saturday (6) and Sunday (0).
 *
 * @param {number} totalHours - Total job hours
 * @param {string|Date|null} startDate - Start date (defaults to today)
 * @param {number} hoursPerDay - Daily capacity per staff (default 8)
 * @param {number} staffCount - Number of staff (default 1)
 * @returns {{ businessDays: number, startDate: Date, finishDate: Date, dailyCapacity: number }}
 */
export function calculateBusinessDays(totalHours, startDate, hoursPerDay = 8, staffCount = 1) {
  const dailyCapacity = staffCount * hoursPerDay;
  const businessDays = Math.max(1, Math.ceil(totalHours / dailyCapacity));

  // Resolve start date — roll weekends to Monday
  let start = startDate ? new Date(startDate) : new Date();
  if (isNaN(start.getTime())) start = new Date();
  // If start is a date string like "2026-04-07", parse at noon to avoid timezone issues
  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    start = new Date(startDate + 'T12:00:00');
  }
  if (start.getDay() === 0) start.setDate(start.getDate() + 1); // Sun → Mon
  if (start.getDay() === 6) start.setDate(start.getDate() + 2); // Sat → Mon

  // Count forward N business days
  const finish = new Date(start);
  let remaining = businessDays - 1; // start date counts as day 1
  while (remaining > 0) {
    finish.setDate(finish.getDate() + 1);
    if (finish.getDay() !== 0 && finish.getDay() !== 6) {
      remaining--;
    }
  }

  return { businessDays, startDate: start, finishDate: finish, dailyCapacity };
}

/**
 * Format a date as "Mon, Apr 7"
 */
export function fmtShortDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
