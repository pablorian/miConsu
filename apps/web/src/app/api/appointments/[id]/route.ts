import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;

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
