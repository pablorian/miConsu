import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Appointment } from '@repo/database';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { patientId, patientName, patientPhone, patientEmail, start, end, reason, status } = body;

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
