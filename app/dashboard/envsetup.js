// Per-language guidance for reading KONDUYT_SECRET_KEY at runtime, for the
// Code Samples tab. Deliberately does NOT cover .env files or a loader
// library -- the key is set directly as a real environment variable on
// whatever platform actually runs the code (Render, Vercel, Railway,
// Heroku, Fly.io, and so on), the same way any real secret is handled in
// production. Each language reads a real environment variable the same
// way regardless of how it was set, so this is just "how this language's
// syntax for that looks" -- nothing about local files.

export const ENV_SETUP = {
  curl:   { runtimeNote: 'The shell reads a real exported/host-set environment variable directly -- no extra step.' },
  js:     { runtimeNote: 'Node reads it directly: process.env.KONDUYT_SECRET_KEY. No package needed.' },
  python: { runtimeNote: 'Python reads it directly: os.environ["KONDUYT_SECRET_KEY"]. No package needed.' },
  php:    { runtimeNote: 'PHP reads it directly: getenv("KONDUYT_SECRET_KEY"). No package needed.' },
  go:     { runtimeNote: 'Go reads it directly: os.Getenv("KONDUYT_SECRET_KEY"). No package needed.' },
  ruby:   { runtimeNote: 'Ruby reads it directly: ENV.fetch("KONDUYT_SECRET_KEY"). No gem needed.' },
  rust:   { runtimeNote: 'Rust reads it directly: env::var("KONDUYT_SECRET_KEY"). No crate needed.' },
  csharp: { runtimeNote: '.NET reads it directly: Environment.GetEnvironmentVariable("KONDUYT_SECRET_KEY"). No package needed.' },
  java:   { runtimeNote: 'Android apps ship to users -- there is no safe way to hold this key on-device, ever. Your app calls your own backend; that backend (wherever it runs) holds the key.' },
  kotlin: { runtimeNote: 'Android apps ship to users -- there is no safe way to hold this key on-device, ever. Your app calls your own backend; that backend (wherever it runs) holds the key.' },
  swift:  { runtimeNote: 'iOS apps ship to users -- there is no safe way to hold this key on-device, ever. Your app calls your own backend; that backend (wherever it runs) holds the key.' },
  cpp:    { runtimeNote: 'C++ reads it directly via std::getenv("KONDUYT_SECRET_KEY"). No library needed.' },
};
