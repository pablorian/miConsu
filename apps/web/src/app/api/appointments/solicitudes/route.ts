import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Appointment } from '@repo/database';

/**
 * GET /api/appointments/solicitudes
 * Returns appointments that have no linked patient (patientId is null/undefined).
 * These are bookings from the public booking form or Google Calendar events
 * that couldn't be auto-matched to an existing patient.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const solicitudes = await (Appointment as any).find({
      userId: user._id,
      patientId: { $in: [null, undefined] },
      status: { $nin: ['cancelled'] },
      solicitudDismissed: { $ne: true },
    }).sort({ start: -1 }).limit(100);

    return NextResponse.json({ solicitudes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
