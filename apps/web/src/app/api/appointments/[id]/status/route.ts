import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { requireUser } from '@/lib/auth';

const VALID_STATUSES = ['pending', 'confirmed', 'user confirmed', 'user waiting', 'done', 'cancelled'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { user, error } = await requireUser();
    if (error) return error;

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
