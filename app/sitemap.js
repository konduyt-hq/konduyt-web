export default function sitemap() {
  return [
    { url: 'https://konduyt.dev', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://konduyt.dev/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://konduyt.dev/docs', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://konduyt.dev/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://konduyt.dev/signup', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
