import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User } from '@repo/database';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';
import PublicHandleEditor from '@/components/Settings/PublicHandleEditor';
import PrestacionesEditor from '@/components/Settings/PrestacionesEditor';
import AutoFlowsSettings from '@/components/Settings/AutoFlowsSettings';
import WhatsAppSettings from '@/components/Settings/WhatsAppSettings';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (!token) {
    redirect('/login');
  }

  const session = await verifySession(token.value);
  if (!session) {
    redirect('/login');
  }

  const sessionStr = session as any;

  await connectToDatabase();
  const user = await User.findOne({ workosId: sessionStr.id }).lean() as any;

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">User Not Found</h1>
        <p>We could not find your user profile in our database.</p>
        <p className="text-sm text-gray-500 mt-2">WorkOS ID: {sessionStr.id}</p>
        <a href="/api/auth/logout" className="text-blue-600 hover:underline mt-4 block">Logout and try again</a>
      </div>
    );
  }

  const t = await getTranslations('Dashboard.Settings');

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Quick nav cards */}
      <Link
        href="/dashboard/settings/professionals"
        className="group flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Profesionales</p>
            <p className="text-xs text-muted-foreground">Administrá los profesionales y su porcentaje de liquidación.</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </Link>

      {/* Prestaciones */}
      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Catálogo de prestaciones</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configurá tus prestaciones habituales con su precio para agilizar el registro de turnos.
            </p>
          </div>
        </div>
        <PrestacionesEditor />
      </div>

      {/* Flujos automáticos */}
      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Flujos automáticos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatizá acciones que se ejecutan cuando completás un turno.
            </p>
          </div>
        </div>
        <AutoFlowsSettings />
      </div>

      {/* Public handle / profile URL */}
      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Perfil público de reservas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu handle define la URL donde los pacientes pueden ver y reservar todas tus páginas de citas.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <PublicHandleEditor initialHandle={(user as any).publicId ?? null} locale={locale} />
        </div>
      </div>

      {/* WhatsApp */}
      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">WhatsApp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalizá el mensaje que se enviará al hacer click en el botón de recordatorio.
            </p>
          </div>
        </div>
        <WhatsAppSettings />
      </div>

      {/* Google Calendar */}
      <div className="border rounded-xl p-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
              <path d="M12 2C6.48 2 2 6.48 2 12h3c0-3.86 3.14-7 7-7V2z" fill="#EA4335"/>
              <path d="M2 12c0 5.52 4.48 10 10 10v-3c-3.86 0-7-3.14-7-7H2z" fill="#34A853"/>
              <path d="M22 12c0-5.52-4.48-10-10-10v3c3.86 0 7 3.14 7 7h3z" fill="#FBBC05"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Google Calendar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sincronizá tus turnos con Google Calendar automáticamente.
            </p>
          </div>
        </div>
        <GoogleCalendarIntegration isConnected={!!user.googleCalendarRefreshToken} />
      </div>
    </div>
  );
}
