export const metadata = {
  title: 'Konduyt Demo — see the payment intelligence layer live',
  description:
    'A live demo of Konduyt\'s payment intelligence: real per-method fees, ranked cheapest-first, with live currency conversion based on where you are. See exactly what your customers would see before you connect an account.',
  alternates: { canonical: 'https://konduyt.dev/demo' },
  openGraph: {
    title: 'Konduyt Demo',
    description:
      'See Konduyt\'s payment intelligence layer live -- real fees, ranked cheapest-first, real currency conversion.',
    url: 'https://konduyt.dev/demo',
  },
};

export default function DemoLayout({ children }) {
  return children;
}
