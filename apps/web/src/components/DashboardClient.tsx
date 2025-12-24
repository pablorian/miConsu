'use client';

import { useTranslations } from 'next-intl';

export default function DashboardClient() {
  const t = useTranslations('Dashboard');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('welcomeSubtitle')}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('welcomeTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {t('welcomeBody')}
        </p>
      </div>
    </div>
  );
}
