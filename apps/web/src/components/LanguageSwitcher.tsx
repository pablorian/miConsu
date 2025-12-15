'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    startTransition(() => {
      // In a real app we might set the cookie via a Server Action or API route,
      // but here we rely on the middleware detecting ?lang=
      router.replace(`${pathname}?lang=${nextLocale}`);
      router.refresh(); // Force server re-render to pick up new cookie
    });
  };

  return (
    <select
      defaultValue={locale}
      onChange={handleChange}
      disabled={isPending}
      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
    >
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  );
}
