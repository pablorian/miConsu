import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User, Appointment } from '@repo/database';
import { addMinutes, parseISO } from 'date-fns';
import { matchPatient } from '@/lib/patient-matching';

export const dynamic = 'force-dynamic';

// TODO [SECURITY - CRITICAL]: This entire endpoint has NO authentication check.
// Any anonymous caller can POST with any userId to create calendar events on
// behalf of that user, read their Google tokens, and write to their appointment DB.
// MongoDB ObjectIds encode a timestamp and are not secret — they are guessable.
// Fix: require a valid session cookie, derive userId from the session, never from the body.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      calendarId,
      date, // YYYY-MM-DD
      time, // HH:mm
      patientName,
      patientEmail,
      patientPhone,
      reason
    } = body;

    // Validate inputs
    if (!userId || !calendarId || !date || !time || !patientName || !patientPhone || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Get Provider
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    // 2. Setup Google Auth & Refresh if needed
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    });

    if (user.googleCalendarTokenExpiry && user.googleCalendarTokenExpiry < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      user.googleCalendarAccessToken = credentials.access_token;
      user.googleCalendarTokenExpiry = new Date(credentials.expiry_date || Date.now() + 3500 * 1000);
      await user.save();
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Create Local Appointment (Pending execution)
    // Construct Date objects
    // Careful with Timezones! For MVP we treat date+time as literal string for Google, which defaults to Calendar's Timezone.
    // Ideally we pass explicit timezone.
    const startDateTimeStr = `${date}T${time}:00`;
    const startDateTime = new Date(startDateTimeStr); // This creates it in Server Local Time (UTC usually)
    const endDateTime = addMinutes(startDateTime, 30);

    // Try to auto-match this booking to an existing patient
    const matchedPatient = await matchPatient(user._id, {
      email: patientEmail,
      phone: patientPhone,
      name: patientName,
    });

    const newAppointment = await Appointment.create({
      userId,
      calendarId,
      start: startDateTime,
      end: endDateTime,
      patientName,
      patientEmail,
      patientPhone,
      reason,
      status: 'pending',
      ...(matchedPatient ? { patientId: matchedPatient._id } : {}),
    });

    // 4. Create Google Event
    // We add the local appointment ID to extendedProperties for bi-direct sync
    const event = {
      summary: `Consulta: ${patientName} (${reason})`,
      description: `Paciente: ${patientName}\nTel: ${patientPhone}\nEmail: ${patientEmail}\nMotivo: ${reason}`,
      start: {
        dateTime: new Date(startDateTimeStr).toISOString(), // UTC ISO
        // For proper timezone support we should use:
        // dateTime: `${date}T${time}:00`,
        // timeZone: user.timezone
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        // dateTime: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
        // timeZone: user.timezone
      },
      extendedProperties: {
        private: {
          miConsuAppointmentId: newAppointment._id.toString()
        }
      }
    };

    // Try to ensure we use the User's timezone for the event creation
    if (user.timezone) {
      event.start = {
        dateTime: `${date}T${time}:00`,
        timeZone: user.timezone
      } as any;
      event.end = {
        dateTime: `${date}T${time.split(':')[0]}:${(parseInt(time.split(':')[1]) + 30).toString().padStart(2, '0')}:00`, // Crude add 30m
        timeZone: user.timezone
      } as any;

      // Better 30m calc
      const [h, m] = time.split(':').map(Number);
      const endD = new Date(2000, 0, 1, h, m + 30);
      const endH = endD.getHours().toString().padStart(2, '0');
      const endM = endD.getMinutes().toString().padStart(2, '0');

      event.end = {
        dateTime: `${date}T${endH}:${endM}:00`,
        timeZone: user.timezone
      } as any;
    }

    const googleRes = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });

    // 5. Update Local Appointment
    newAppointment.googleEventId = googleRes.data.id;
    newAppointment.status = 'confirmed';
    await newAppointment.save();

    return NextResponse.json({ success: true, bookingId: newAppointment._id });

  } catch (error) {
    console.error('Failed to create booking', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
