// Real time-based greetings for the dashboard. Two independent signals:
//   - time of day, computed from the BROWSER's local clock (never the
//     server's -- a developer in Nairobi and one in Lagos shouldn't get
//     the same "early bird" at the same UTC moment)
//   - how long since their real previous_last_seen_at (from the first
//     heartbeat of this session) -- a long gap says more than time of day
//     does, so it takes priority when both would otherwise apply
//
// A very short gap (under 20 minutes -- most likely a page refresh, not a
// genuinely new visit) intentionally shows no greeting at all, to avoid
// repeating one every time a tab reloads.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TIME_OF_DAY = {
  earlyBird: [ // 5am - 8am
    (n) => `Hey early bird, ${n}`,
    (n) => `Up with the sun, ${n}?`,
    (n) => `Early start today, ${n}`,
  ],
  morning: [ // 8am - 12pm
    (n) => `Morning, ${n}`,
    (n) => `Good morning, ${n}`,
  ],
  afternoon: [ // 12pm - 5pm
    (n) => `Afternoon, ${n}`,
    (n) => `Hey ${n}`,
  ],
  evening: [ // 5pm - 9pm
    (n) => `Evening, ${n}`,
    (n) => `Hey ${n}, how's the day been?`,
  ],
  nightOwl: [ // 9pm - 1am
    (n) => `Up late, ${n}?`,
    (n) => `Burning the midnight oil, ${n}?`,
    (n) => `Night owl mode, ${n}`,
  ],
  veryLate: [ // 1am - 5am
    (n) => `Still going, ${n}? Don't forget to sleep`,
    (n) => `It's really late, ${n} — everything okay?`,
  ],
};

const GAP_TIER = {
  aFewDays: [ // 3-14 days
    (n) => `Good to see you again, ${n}`,
    (n) => `Welcome back, ${n} — it's been a few days`,
  ],
  longTimeNoSee: [ // 14-30 days
    (n) => `Long time no see, ${n}!`,
    (n) => `Look who's back — hey ${n}`,
  ],
  reallyLongTime: [ // 30+ days
    (n) => `Well, well, well — welcome back, ${n}!`,
    (n) => `It's been a while, ${n}. Great to have you back`,
  ],
  firstEver: [
    (n) => `Welcome to Konduyt, ${n}!`,
    (n) => `Hey ${n}, great to have you here`,
  ],
};

function timeOfDayGreeting(name) {
  const hour = new Date().getHours();
  let tier;
  if (hour >= 5 && hour < 8) tier = TIME_OF_DAY.earlyBird;
  else if (hour >= 8 && hour < 12) tier = TIME_OF_DAY.morning;
  else if (hour >= 12 && hour < 17) tier = TIME_OF_DAY.afternoon;
  else if (hour >= 17 && hour < 21) tier = TIME_OF_DAY.evening;
  else if (hour >= 21 || hour < 1) tier = TIME_OF_DAY.nightOwl;
  else tier = TIME_OF_DAY.veryLate; // 1am - 5am
  return pick(tier)(name);
}

// Returns a greeting string, or null when nothing should be shown (a very
// short gap -- almost certainly just a page refresh, not a real new visit).
export function buildGreeting(name, previousLastSeenAt, isFirstEver) {
  const displayName = name || 'there';

  if (isFirstEver) {
    return pick(GAP_TIER.firstEver)(displayName);
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
  if (gapDays >= 30) {
    return pick(GAP_TIER.reallyLongTime)(displayName);
  }
  if (gapDays >= 14) {
    return pick(GAP_TIER.longTimeNoSee)(displayName);
  }
  if (gapDays >= 3) {
    return pick(GAP_TIER.aFewDays)(displayName);
  }
  return timeOfDayGreeting(displayName);
}
