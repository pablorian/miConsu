import { NextRequest, NextResponse } from 'next/server';
import { ConsultorioBooking } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { bookingId } = await params;
    const booking = await (ConsultorioBooking as any).findOne({ _id: bookingId, userId: user._id });
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { bookingId } = await params;

    const {
      professionalId, professionalName,
      date, startTime, endTime,
      monthlyPrice,
      recurrenceType = 'once',
      daysOfWeek = [],
      endDate,
      notes,
    } = await req.json();

    if (!professionalName || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'professionalName, date, startTime, endTime required' }, { status: 400 });
    }

    const booking = await (ConsultorioBooking as any).findOneAndUpdate(
      { _id: bookingId, userId: user._id },
      {
        $set: {
          professionalId: professionalId || null,
          professionalName,
          date: new Date(date),
          startTime,
          endTime,
          monthlyPrice: monthlyPrice ?? 0,
          recurrenceType,
          daysOfWeek: recurrenceType === 'once' ? [] : daysOfWeek,
          endDate: endDate ? new Date(endDate) : null,
          notes,
        },
      },
      { new: true },
    );

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { bookingId } = await params;
    await (ConsultorioBooking as any).findOneAndDelete({ _id: bookingId, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
