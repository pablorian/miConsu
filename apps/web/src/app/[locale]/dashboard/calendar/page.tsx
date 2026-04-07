import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import connectToDatabase, { User, Appointment, ServiceRecord } from '@repo/database';
import CalendarPageClient from '@/components/Calendar/CalendarPageClient';

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  let isConnected = false;
  let appointments: any[] = [];
  let serviceRecordsByAppointment: Record<string, any> = {};

  if (token) {
    const session: any = await verifySession(token);
    if (session && session.id) {
      await connectToDatabase();
      const user = await User.findOne({ workosId: session.id });
      if (user) {
        if (user.googleCalendarAccessToken) {
          isConnected = true;
        }
        const rawAppointments = await Appointment.find({ userId: user._id }).lean();

        appointments = rawAppointments.map((app: any) => ({
          _id: app._id.toString(),
          patientId: app.patientId?.toString(),
          patientName: app.patientName || '',
          reason: app.reason || '',
          status: app.status || 'pending',
          patientPhone: app.patientPhone || '',
          patientEmail: app.patientEmail || '',
          start: app.start.toISOString(),
          end: app.end.toISOString(),
        }));

        // Fetch service records linked to these appointments
        const appIds = rawAppointments.map((a: any) => a._id);
        if (appIds.length > 0) {
          const linkedSRs = await (ServiceRecord as any).find({
            appointmentId: { $in: appIds },
          }).lean();

          linkedSRs.forEach((sr: any) => {
            if (sr.appointmentId) {
              serviceRecordsByAppointment[sr.appointmentId.toString()] = {
                _id: sr._id.toString(),
                service: sr.service,
                price: sr.price,
                paid: sr.paid,
                professional: sr.professional || '',
              };
            }
          });
        }
      }
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <CalendarPageClient
        appointments={appointments}
        serviceRecordsByAppointment={serviceRecordsByAppointment}
      />
    </div>
  );
}
