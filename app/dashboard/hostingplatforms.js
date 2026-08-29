// Real, concrete "show don't tell" steps for setting KONDUYT_SECRET_KEY as
// an actual environment variable on a real hosting platform -- the same
// treatment the old .env walkthrough got, applied to where the key
// actually belongs now. Shared between the dashboard's Code Samples tab
// and the landing page's Quickstart panel so both stay in sync.
//
// {{KEY_VALUE}} / {{KEY_VALUE_INLINE}} are substituted by the caller --
// the dashboard (a real, signed-up developer) shows "your real key", the
// landing page (still using the shared universal keys) shows "the
// universal secret key" instead, since there is no real key to reference
// yet at that point.
//
// Not exhaustive -- these are the common ones. Any host with a real
// environment-variables setting works the same way in spirit.

export const HOSTING_PLATFORMS = [
  {
    id: 'render',
    name: 'Render',
    steps: [
      'Open your service in the Render dashboard',
      'Click Environment in the left sidebar',
      'Click Add Environment Variable',
      'Key: KONDUYT_SECRET_KEY — Value: {{KEY_VALUE}}',
      'Save Changes — Render redeploys with it automatically',
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    steps: [
      'Open your project in the Vercel dashboard',
      'Settings → Environment Variables',
      'Key: KONDUYT_SECRET_KEY — Value: {{KEY_VALUE}}',
      'Select which environments it applies to (Production is the one that matters)',
      'Save, then redeploy for it to take effect',
    ],
  },
  {
    id: 'railway',
    name: 'Railway',
    steps: [
      'Open your service in the Railway dashboard',
      'Click the Variables tab',
      'Click New Variable',
      'Name: KONDUYT_SECRET_KEY — Value: {{KEY_VALUE}}',
      'Railway redeploys automatically once it\u2019s added',
    ],
  },
  {
    id: 'heroku',
    name: 'Heroku',
    steps: [
      'Open your app in the Heroku dashboard',
      'Settings tab → Reveal Config Vars',
      'Key: KONDUYT_SECRET_KEY — Value: {{KEY_VALUE}}',
      'Click Add — it\u2019s live immediately, no redeploy needed',
    ],
  },
  {
    id: 'flyio',
    name: 'Fly.io',
    steps: [
      'Open a terminal in your project directory',
      'Run: fly secrets set KONDUYT_SECRET_KEY={{KEY_VALUE_INLINE}}',
      'Fly deploys a new release with it automatically',
    ],
  },
];
