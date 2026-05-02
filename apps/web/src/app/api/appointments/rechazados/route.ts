import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { requireUser } from '@/lib/auth';

/** GET /api/appointments/rechazados — appointments dismissed from the solicitudes queue */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

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
