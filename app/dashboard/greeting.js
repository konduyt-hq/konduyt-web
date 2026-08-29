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
    (n) => `Rise and grind, ${n}`,
    (n) => `Up before the coffee, ${n}?`,
    (n) => `The early dev catches the checkout bug, ${n}`,
    (n) => `Sun's barely up and you're already here, ${n}`,
    (n) => `Early start, ${n} — respect`,
  ],
  morning: [ // 8am - 12pm
    (n) => `Morning, ${n} — let's ship something`,
    (n) => `Good morning, ${n}`,
    (n) => `Top of the morning, ${n}`,
    (n) => `Fresh coffee, fresh dashboard, ${n}`,
  ],
  afternoon: [ // 12pm - 5pm
    (n) => `Afternoon, ${n}`,
    (n) => `Hey ${n} — how's the day treating you?`,
    (n) => `Midday check-in, ${n}`,
    (n) => `Hope lunch was good, ${n}`,
  ],
  evening: [ // 5pm - 9pm
    (n) => `Evening, ${n}`,
    (n) => `Winding down or just getting started, ${n}?`,
    (n) => `Hey ${n}, good time to catch up on things`,
    (n) => `Evening check-in, ${n}`,
  ],
  nightOwl: [ // 9pm - 1am
    (n) => `Still at it, ${n}? Respect`,
    (n) => `The dashboard never sleeps, and apparently neither do you, ${n}`,
    (n) => `Burning the midnight oil, ${n}?`,
    (n) => `Night owl mode: activated, ${n}`,
    (n) => `Late-night shipping session, ${n}?`,
  ],
  veryLate: [ // 1am - 5am
    (n) => `It's really late, ${n} — everything okay?`,
    (n) => `Whatever bug you're chasing, ${n}, go easy on yourself`,
    (n) => `The dedication is real, ${n} — but so is sleep`,
    (n) => `${n}, at this hour even the servers are impressed`,
  ],
};

const GAP_TIER = {
  aFewDays: [ // 3-14 days
    (n) => `Look who wandered back — hey ${n}`,
    (n) => `Missed you around here, ${n}`,
    (n) => `Welcome back, ${n} — the dashboard kept your seat warm`,
    (n) => `Good to see you again, ${n}`,
  ],
  longTimeNoSee: [ // 14-30 days
    (n) => `Long time no see, ${n}!`,
    (n) => `Well well well, if it isn't ${n}`,
    (n) => `Look who's back — hey ${n}`,
    (n) => `${n}! It's been a minute`,
  ],
  reallyLongTime: [ // 30+ days
    (n) => `${n}?! Is that really you?`,
    (n) => `Someone dust off the welcome mat — ${n}'s back`,
    (n) => `It's been ages, ${n}. Welcome home`,
    (n) => `Well, well, well — welcome back, ${n}`,
  ],
  firstEver: [
    (n) => `Welcome aboard, ${n}`,
    (n) => `Hey ${n}, glad you're here — let's build something`,
    (n) => `${n}, welcome to Konduyt. Let's get you shipping`,
    (n) => `Welcome in, ${n} — good to have you`,
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
