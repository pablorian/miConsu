import { workos, clientId } from '@/lib/workos';
import { env } from '@/env';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const t = useTranslations('Login');
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: 'GoogleOAuth',
    clientId: clientId,
    redirectUri: env.WORKOS_REDIRECT_URI,
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Visual Side (Left) */}
      <div className="relative hidden w-full flex-col bg-muted p-10 text-white dark:border-r lg:flex lg:w-1/2 bg-blue-900">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          miConsu
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;{t('testimonial.quote')}&rdquo;
            </p>
            <footer className="text-sm">{t('testimonial.author')}</footer>
          </blockquote>
        </div>
      </div>

      {/* Login Form Side (Right) */}
      <div className="flex min-h-screen w-full items-center justify-center lg:w-1/2 lg:min-h-0 bg-background relative p-8">
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <LanguageSwitcher />
        </div>
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t('title')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('subtitle')}
            </p>
          </div>

          <div className="grid gap-6">
            <a
              href={authorizationUrl}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              {t('signInWithGoogle')}
            </a>
          </div>

          <p className="px-8 text-center text-sm text-gray-500">
            {t('agreement')}{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
              {t('terms')}
            </Link>{" "}
            {t('and')}{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
              {t('privacy')}
            </Link>
            .
          </p>
        </div>

        {/* Mobile Footer Logo */}
        <div className="absolute bottom-6 flex items-center text-sm font-medium text-gray-500 lg:hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          miConsu
        </div>
      </div>
    </div>
  );
}
