import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, ConsultorioBooking } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
          professionalId:   professionalId || null,
          professionalName,
          date:             new Date(date),
          startTime,
          endTime,
          monthlyPrice:     monthlyPrice ?? 0,
          recurrenceType,
          daysOfWeek:       recurrenceType === 'once' ? [] : daysOfWeek,
          endDate:          endDate ? new Date(endDate) : null,
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
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { bookingId } = await params;
    await (ConsultorioBooking as any).findOneAndDelete({ _id: bookingId, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
