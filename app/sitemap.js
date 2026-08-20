export default function sitemap() {
  const base = 'https://konduyt.dev';
  const now = new Date();

  const pages = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/pricing/', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/docs/', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/demo/', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/labs/', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/signin/', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/signup/', priority: 0.6, changeFrequency: 'yearly' },
    { path: '/terms/', priority: 0.2, changeFrequency: 'yearly' },
  ];

  return pages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
