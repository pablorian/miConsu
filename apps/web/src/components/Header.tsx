import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const t = useTranslations('Dashboard');
  const pathname = usePathname();
  const router = useRouter();

  const showBackButton = pathname.includes('/dashboard/qr/');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-header-border bg-header px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Toggle Button */}
        <button
          onClick={onMenuClick}
          className="text-gray-500 hover:text-foreground md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        {showBackButton && (
          <Link
            href="/dashboard"
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            {t('QRDetails.backToDashboard')}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Language Switcher moved here */}
        <div className="relative">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
