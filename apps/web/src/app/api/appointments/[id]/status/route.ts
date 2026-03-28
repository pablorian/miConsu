import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Appointment, User } from '@repo/database';
import { verifySession } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // In Next.js App Router, params is a Promise
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'confirmed', 'user confirmed', 'user waiting', 'done', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session: any = await verifySession(token);
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Ensure the user owns this appointment
    const user = await User.findOne({ workosId: session.id });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: { status } },
      { new: true }
    );

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: appointment.status });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
