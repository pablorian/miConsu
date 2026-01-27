import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import connectToDatabase, { User, Appointment } from '@repo/database';
import ConnectGoogleCalendar from '@/components/Calendar/ConnectGoogleCalendar';
import CalendarView from '@/components/Calendar/CalendarView';
import AppointmentList from '@/components/Calendar/AppointmentList';
import { getTranslations } from 'next-intl/server';

export default async function CalendarPage() {
  const t = await getTranslations('Dashboard');
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  let isConnected = false;
  let appointments = [];

  if (token) {
    const session: any = await verifySession(token);
    if (session && session.id) {
      await connectToDatabase();
      const user = await User.findOne({ workosId: session.id });
      if (user) {
        if (user.googleCalendarAccessToken) {
          isConnected = true;
        }
        // Fetch appointments for this user
        // We fetch all and let the client filter/sort for now, 
        // to avoid complex serializing/state syncing for a simple list.
        // Convert to plain object with lean()
        const rawAppointments = await Appointment.find({ userId: user._id }).lean();

        // Serialize dates for Next.js props
        appointments = rawAppointments.map((app: any) => ({
          ...app,
          _id: app._id.toString(),
          userId: app.userId.toString(),
          patientId: app.patientId?.toString(),
          start: app.start.toISOString(),
          end: app.end.toISOString(),
          createdAt: app.createdAt?.toISOString(),
          updatedAt: app.updatedAt?.toISOString(),
        }));
      }
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('calendar')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your schedule and availability
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Left Side: Appointment List */}
        <div className="lg:col-span-1 h-full min-h-0">
          <AppointmentList appointments={appointments} />
        </div>

        {/* Right Side: Calendar View */}
        <div className="lg:col-span-3 h-full min-h-0 overflow-y-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800">
          {isConnected ? (
            <CalendarView />
          ) : (
            <div className="flex justify-center py-12">
              <ConnectGoogleCalendar />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
