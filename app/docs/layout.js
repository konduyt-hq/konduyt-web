export const metadata = {
  title: 'Konduyt Docs — API reference and integration guides',
  description:
    'Konduyt documentation: authentication, creating payments, payment methods, webhooks, recurring payments, marketplace payments, routing intelligence, and the full API reference for connecting Paystack, Stripe, PayPal, Flutterwave, M-Pesa and more through one integration.',
  alternates: { canonical: 'https://konduyt.dev/docs' },
  openGraph: {
    title: 'Konduyt Docs',
    description:
      'API reference and integration guides for Konduyt -- authentication, payments, webhooks, and routing intelligence.',
    url: 'https://konduyt.dev/docs',
  },
};

export default function DocsLayout({ children }) {
  return children;
}
