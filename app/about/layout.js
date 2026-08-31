export const metadata = {
  title: 'About Konduyt — payment infrastructure built in Kenya',
  description:
    'Konduyt is a payment infrastructure company built by Collective Brains in Thika, Kenya. One integration connects your business to every payment provider and method, instead of rebuilding your payment stack for every new country.',
  alternates: { canonical: 'https://konduyt.dev/about' },
  openGraph: {
    title: 'About Konduyt',
    description:
      'Konduyt is a payment infrastructure company built by Collective Brains in Thika, Kenya. One integration, every provider, no country-by-country rebuild.',
    url: 'https://konduyt.dev/about',
  },
};

export default function AboutLayout({ children }) {
  return children;
}
