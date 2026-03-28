import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Appointment } from '@repo/database';

/**
 * GET /api/appointments/rechazados
 * Returns appointments that were dismissed from the solicitudes queue.
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

    const rechazados = await (Appointment as any).find({
      userId: user._id,
      patientId: { $in: [null, undefined] },
      solicitudDismissed: true,
    }).sort({ updatedAt: -1 }).limit(100);

    return NextResponse.json({ rechazados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
