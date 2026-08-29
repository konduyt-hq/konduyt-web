// Real time-based greetings for the dashboard -- kept simple and clean
// (the standard "Good morning / afternoon / evening, name" style, not
// elaborate wordplay), computed from the BROWSER's local clock, never the
// server's, so a developer in Nairobi and one in Lagos get their own real
// time of day rather than the same greeting at the same UTC moment.
//
// A very short gap since previous_last_seen_at (under 20 minutes -- almost
// certainly just a page refresh, not a genuinely new visit) intentionally
// shows nothing, to avoid repeating a greeting every time a tab reloads.

function timeOfDayGreeting(name) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
  if (hour >= 17 && hour < 22) return `Good evening, ${name}`;
  return `Still up, ${name}?`; // 10pm - 5am
}

// Returns a greeting string, or null when nothing should be shown (a very
// short gap -- almost certainly just a page refresh, not a real new visit).
export function buildGreeting(name, previousLastSeenAt, isFirstEver) {
  const displayName = name || 'there';

  if (isFirstEver) {
    return `Welcome to Konduyt, ${displayName}`;
  }
  if (!previousLastSeenAt) {
    return timeOfDayGreeting(displayName);
  }

  const gapMs = Date.now() - new Date(previousLastSeenAt).getTime();
  const gapMinutes = gapMs / 60000;
  const gapDays = gapMs / (1000 * 60 * 60 * 24);

  if (gapMinutes < 20) {
    return null; // likely just a refresh -- don't repeat a greeting
  }
  if (gapDays >= 14) {
    return `Long time no see, ${displayName}`;
  }
  if (gapDays >= 3) {
    return `Welcome back, ${displayName}`;
  }
  return timeOfDayGreeting(displayName);
}
