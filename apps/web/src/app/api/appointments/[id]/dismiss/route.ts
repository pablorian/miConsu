import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Appointment } from '@repo/database';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/appointments/[id]/dismiss
 * Marks a solicitud as dismissed (rejected). The appointment slot stays free.
 *
 * POST /api/appointments/[id]/dismiss  body: { restore: true }
 * Restores a dismissed solicitud back to the pending queue.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const restore = body?.restore === true;

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const appointment = await (Appointment as any).findOne({ _id: id, userId: user._id });
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    appointment.solicitudDismissed = !restore;
    await appointment.save();

    return NextResponse.json({ success: true, dismissed: !restore });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
