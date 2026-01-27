import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@repo/database';
import { User, Appointment, Patient } from '@repo/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { triggerEvent, payload } = body;

    // TODO: Verify secret if provided in Cal.com settings

    if (triggerEvent !== 'BOOKING_CREATED') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const {
      organizer,
      attendees,
      startTime,
      endTime,
      title,
      uid,
      responses,
      description
    } = payload;

    // 1. Find the User (Professional)
    await connectToDatabase();
    // Check both email and possibly calComSettings.username if email doesn't match
    const organizerEmail = organizer?.email;
    if (!organizerEmail) {
      return NextResponse.json({ error: 'No organizer email' }, { status: 400 });
    }

    let user = await User.findOne({ email: organizerEmail });
    if (!user) {
      // Fallback: try to find by Cal.com username if available?
      // For now, rely on email matching WorkOS/Database email.
      console.warn(`User not found for email: ${organizerEmail}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Identify Patient from Attendees
    // Cal.com sends an array of attendees. Usually 1 for 1-on-1 bookings.
    const attendee = attendees[0];
    if (!attendee) {
      return NextResponse.json({ error: 'No attendee info' }, { status: 400 });
    }

    // Mapping inputs:
    // User request: "recive the phone number of the patient under a prop called attendeePhoneNumber"
    // User request: "The name of the patient it come under a prop called your_name"
    // However, Cal.com usually puts standard fields in `attendee` object (name, email).
    // Custom inputs often come in `responses` object.

    // We will check standard fields + specific request fields.
    const patientName = payload.your_name || attendee.name; // 'your_name' might be a custom field key if mapped, otherwise default to name
    // Check responses for phone number or other custom fields if needed
    // But payload usually has `attendee.phoneNumber` if collected standardly.
    // The user mentioned `attendeePhoneNumber` prop. It implies it might be at payload level or in responses.
    // checking payload level for `attendeePhoneNumber` just in case, otherwise attendee.phoneNumber
    const patientPhone = payload.attendeePhoneNumber || attendee.phoneNumber || '';
    const patientEmail = attendee.email;

    if (!patientName) {
      console.warn('Missing patient name');
      return NextResponse.json({ error: 'Missing patient name' }, { status: 400 });
    }

    // 3. Upsert Patient
    // We try to match by Email first, then Phone, then Name?
    // User said: "if is not already in the collection we should add it."
    // Strategy: Match by { userId, email } OR { userId, phone }

    let patient = null;

    if (patientEmail) {
      patient = await Patient.findOne({ userId: user._id, email: patientEmail });
    }

    if (!patient && patientPhone) {
      patient = await Patient.findOne({ userId: user._id, phone: patientPhone });
    }

    if (!patient) {
      // Create new patient
      patient = await Patient.create({
        userId: user._id,
        name: patientName,
        email: patientEmail,
        phone: patientPhone
      });
      console.log(`Created new patient: ${patient._id}`);
    } else {
      // Update existing patient info if new info is available?
      // For now, let's keep existing info, maybe update phone if missing
      if (!patient.phone && patientPhone) {
        patient.phone = patientPhone;
        await patient.save();
      }
    }

    // 4. Create Appointment
    // Check if appointment with this googleEventId or uid already exists
    const existingAppointment = await Appointment.findOne({
      $or: [{ googleEventId: uid }] // Cal.com UID often serves as event ID
    });

    if (existingAppointment) {
      return NextResponse.json({ message: 'Appointment already exists' }, { status: 200 });
    }

    await Appointment.create({
      userId: user._id,
      patientId: patient._id,
      calendarId: 'cal.com', // or 'primary' if synced
      googleEventId: uid, // storing cal.com uid here for reference
      start: new Date(startTime),
      end: new Date(endTime),
      patientName: patientName,
      patientEmail: patientEmail,
      patientPhone: patientPhone,
      reason: title || 'Consulta', // Using title as reason
      status: 'confirmed'
    });

    return NextResponse.json({ message: 'Booking synced successfully' }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
