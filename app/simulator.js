// Where the Phone Number Simulator is deployed.
//
// The simulator is its own application (konduyt-hq/phone-number-simulator), not
// a route in this static export, so this is the one place its address is
// declared. The default is the permanent host; NEXT_PUBLIC_SIMULATOR_URL
// overrides it for a preview build without editing this file.
export const SIMULATOR_URL =
  process.env.NEXT_PUBLIC_SIMULATOR_URL || 'https://simulator.konduyt.dev/';

export const SIMULATOR_LABEL = 'Simulator';
