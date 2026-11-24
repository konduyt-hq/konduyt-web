// Where the Phone Number Simulator is deployed.
//
// The simulator is its own application (konduyt-hq/phone-number-simulator), not
// a route in this static export, so this is the one place its address is
// declared. Override at build time with NEXT_PUBLIC_SIMULATOR_URL once it has a
// konduyt.dev subdomain; the default is the deployment that exists today.
export const SIMULATOR_URL =
  process.env.NEXT_PUBLIC_SIMULATOR_URL ||
  'https://work-1-xckuwvnmccekouag.prod-runtime.all-hands.dev/';

export const SIMULATOR_LABEL = 'Simulator';
