// Per-language ".env" setup guidance for the Languages tab. Kept dead simple:
// where the file goes (root, next to the language's manifest file), how to make
// it, the no-spaces rule (written for them), the .gitignore line, and how that
// language loads it. rootFile is the manifest that sits beside .env so the
// developer can recognise their project root.

export const ENV_SETUP = {
  curl:   { rootFile: null,             loader: null,
            loaderNote: 'No loader needed — the shell reads exported variables directly.' },
  js:     { rootFile: 'package.json',   loader: 'npm install dotenv',
            loaderNote: 'At the very top of your entry file, add: require(\'dotenv\').config();  (Next.js loads .env automatically — skip the install.)' },
  python: { rootFile: 'requirements.txt', loader: 'pip install python-dotenv',
            loaderNote: 'Before reading the key: from dotenv import load_dotenv; load_dotenv()' },
  php:    { rootFile: 'composer.json',  loader: 'composer require vlucas/phpdotenv',
            loaderNote: 'Laravel loads .env automatically — skip the install. Plain PHP: load phpdotenv near the top of your entry script.' },
  go:     { rootFile: 'go.mod',         loader: 'go get github.com/joho/godotenv',
            loaderNote: 'Early in main(): godotenv.Load()  — or just export the variable in your shell and skip the library.' },
  ruby:   { rootFile: 'Gemfile',        loader: 'gem install dotenv',
            loaderNote: 'require "dotenv/load" at the top. Rails loads .env automatically with the dotenv-rails gem.' },
  rust:   { rootFile: 'Cargo.toml',     loader: 'cargo add dotenvy',
            loaderNote: 'Early in main(): dotenvy::dotenv().ok();  — or export the variable in your shell.' },
  csharp: { rootFile: '.csproj',        loader: null,
            loaderNote: '.NET reads real environment variables directly. Set it in your shell (below), or use launchSettings.json / your host\u2019s settings. (For a .env file, add the DotNetEnv package.)' },
  java:   { rootFile: 'build.gradle',   loader: null,
            loaderNote: 'Android apps ship to users — do NOT put the secret in the app. Keep it on your server; the app calls your server. (For a prototype, inject via BuildConfig at build time — see the code.)' },
  kotlin: { rootFile: 'build.gradle.kts', loader: null,
            loaderNote: 'Android apps ship to users — do NOT put the secret in the app. Keep it on your server; the app calls your server. (For a prototype, inject via BuildConfig at build time — see the code.)' },
  swift:  { rootFile: '.xcodeproj',     loader: null,
            loaderNote: 'iOS apps ship to users — do NOT put the secret in the app. Keep it on your server; the app calls your server. (For a prototype, inject via an xcconfig/Info.plist value at build time.)' },
  cpp:    { rootFile: null,             loader: null,
            loaderNote: 'C++ reads real environment variables directly via std::getenv. Export it in your shell (below).' },
};

// The plain-language steps shared by all languages (the folder tree is rendered
// separately so we can slot in the language's rootFile).
export const ENV_STEPS = {
  create_terminal_mac: 'touch .env',
  create_terminal_win: 'type nul > .env',
  create_vscode: 'Right-click your project root folder \u2192 New File \u2192 name it exactly  .env',
};
