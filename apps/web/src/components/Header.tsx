'use client';

import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const t = useTranslations('Dashboard');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-header-border bg-header px-4 md:px-6">
      {/* Mobile Toggle Button (Hidden on Desktop) */}
      <button
        onClick={onMenuClick}
        className="mr-4 text-gray-500 hover:text-foreground md:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>

      <div className="flex items-center gap-4 ml-auto">
        {/* Language Switcher moved here */}
        <div className="relative">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
