import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Pricing() {
  const t = useTranslations('Pricing');
  const tHome = useTranslations('HomePage'); // Reuse some nav translations if needed

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navigation (Consistent with Home) */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          QRCode PrianCo
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/login" className="text-sm font-medium hover:text-primary">Login</Link>
          <Link href="/dashboard" className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition">
            {tHome('getStarted')}
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-900/50">
        <h1 className="text-4xl font-bold mb-12 text-center">{t('title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full items-center">
          {/* Pro Plan (Grayed out) - Now First */}
          <div className="bg-muted/50 p-8 rounded-2xl border border-border opacity-70 grayscale filter">
            <h2 className="text-2xl font-bold mb-4 text-muted-foreground">{t('pro.title')}</h2>
            <p className="text-4xl font-bold mb-6 text-muted-foreground line-through decoration-red-500/50 decoration-2">{t('pro.price')}<span className="text-base font-normal">{t('pro.period')}</span></p>

            {/* Skeleton Features */}
            <div className="space-y-4 mb-8">
              <div className="h-4 w-3/4 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-4 w-5/6 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-4 w-2/3 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
            </div>

            <button disabled className="w-full py-3 bg-muted text-muted-foreground rounded-lg cursor-not-allowed border border-border">
              {t('pro.cta')}
            </button>
          </div>

          {/* Free Plan (Active) - Now Middle and Larger */}
          <div className="bg-background p-8 rounded-2xl shadow-2xl border-2 border-primary relative overflow-hidden transform md:scale-110 z-10">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              {t('free.mostPopular')}
            </div>
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('free.title')}</h2>
            <p className="text-5xl font-bold mb-6">{t('free.price')}<span className="text-base font-normal text-muted-foreground">{t('free.period')}</span></p>
            <ul className="space-y-4 mb-8 text-base">
              <li className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {t('free.features.0')}
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {t('free.features.1')}
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {t('free.features.2')}
              </li>
            </ul>
            <Link href="/login" className="block w-full py-4 bg-primary text-primary-foreground text-center rounded-lg hover:bg-primary/90 transition font-bold text-lg shadow-lg hover:shadow-primary/25">
              {t('free.cta')}
            </Link>
          </div>

          {/* Enterprise Plan (Grayed out) - Now Last */}
          <div className="bg-muted/50 p-8 rounded-2xl border border-border opacity-70 grayscale filter">
            <h2 className="text-2xl font-bold mb-4 text-muted-foreground">{t('enterprise.title')}</h2>
            <p className="text-4xl font-bold mb-6 text-muted-foreground line-through decoration-red-500/50 decoration-2">{t('enterprise.price')}</p>

            {/* Skeleton Features */}
            <div className="space-y-4 mb-8">
              <div className="h-4 w-2/3 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-300/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
            </div>

            <button disabled className="w-full py-3 bg-muted text-muted-foreground rounded-lg cursor-not-allowed border border-border">
              {t('enterprise.cta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
