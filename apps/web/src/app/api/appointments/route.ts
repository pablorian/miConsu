import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { patientId, patientName, patientPhone, patientEmail, start, end, reason, status } = await req.json();

    if (!patientName || !start || !end) {
      return NextResponse.json({ error: 'patientName, start and end are required' }, { status: 400 });
    }

    const appointment = await Appointment.create({
      userId: user._id,
      calendarId: 'manual',
      patientId: patientId || undefined,
      patientName,
      patientPhone: patientPhone || '',
      patientEmail: patientEmail || '',
      start: new Date(start),
      end: new Date(end),
      reason: reason || 'Primera Consulta',
      status: status || 'confirmed',
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
