import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Appointment, User } from '@repo/database';
import { verifySession } from '@/lib/session';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session: any = await verifySession(token);
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const user = await User.findOne({ workosId: session.id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const appointment = await Appointment.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
