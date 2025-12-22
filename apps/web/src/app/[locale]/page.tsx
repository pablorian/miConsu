import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="text-xl font-bold text-primary flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          QRCode PrianCo
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/login" className="text-sm font-medium hover:text-primary">Login</Link>
          <Link href="/pricing" className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32 bg-gradient-to-b from-background to-blue-50/50 dark:to-blue-950/20">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl">
          {t('title')} <br className="hidden md:block" />
          <span className="text-primary">{t('subtitle')}</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          {t('description')}
        </p>
        <div className="flex gap-4 flex-col sm:flex-row">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-primary text-white rounded-lg font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-lg"
          >
            {t('getStarted')}
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-3 bg-white dark:bg-zinc-800 border border-input rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-lg"
          >
            {t('viewPricing')}
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20 bg-background">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{t('features.analyticsTitle')}</h3>
            <p className="text-muted-foreground">{t('features.analyticsDesc')}</p>
          </div>
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{t('features.securityTitle')}</h3>
            <p className="text-muted-foreground">{t('features.securityDesc')}</p>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        &copy; {new Date().getFullYear()} QRCode PrianCo. All rights reserved.
      </footer>
    </div>
  );
}
