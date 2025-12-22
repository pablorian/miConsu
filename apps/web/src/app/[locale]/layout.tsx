import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export const metadata = {
  title: "QRCode PrianCo - QR Code Manager",
  description: "Generate, track, and manage your QR codes with detailed analytics. Free and easy to use.",
  openGraph: {
    title: "QRCode PrianCo",
    description: "The best free tool to generate and track QR codes. Get insights on your scans.",
    siteName: "QRCode PrianCo",
    type: "website",
  }
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
