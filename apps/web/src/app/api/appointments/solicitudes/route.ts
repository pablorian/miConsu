import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { requireUser } from '@/lib/auth';

/**
 * GET /api/appointments/solicitudes
 * Appointments without a linked patient (public booking / Google Calendar imports
 * that couldn't be auto-matched).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

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
