import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { requireUser } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/appointments/[id]/dismiss          → mark solicitud as dismissed
 * POST /api/appointments/[id]/dismiss { restore: true } → restore to pending queue
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const restore = body?.restore === true;

    const appointment = await (Appointment as any).findOne({ _id: id, userId: user._id });
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    appointment.solicitudDismissed = !restore;
    await appointment.save();

    return NextResponse.json({ success: true, dismissed: !restore });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
