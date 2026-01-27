import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import connectToDatabase, { User } from '@repo/database';
import ConnectGoogleCalendar from '@/components/Calendar/ConnectGoogleCalendar';
import CalendarView from '@/components/Calendar/CalendarView';
import { getTranslations } from 'next-intl/server';

export default async function CalendarPage() {
  const t = await getTranslations('Dashboard');
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  let isConnected = false;

  if (token) {
    const session: any = await verifySession(token);
    if (session && session.id) {
      await connectToDatabase();
      const user = await User.findOne({ workosId: session.id });
      if (user && user.googleCalendarAccessToken) {
        isConnected = true;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('calendar')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your schedule and availability
          </p>
        </div>
      </div>

      {isConnected ? (
        <CalendarView />
      ) : (
        <div className="flex justify-center py-12">
          <ConnectGoogleCalendar />
        </div>
      )}
    </div>
  );
}
