import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, BookingPage } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

/** GET /api/booking-pages/[id] */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const page = await (BookingPage as any).findOne({ _id: id, userId: user._id }).lean();
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** PUT /api/booking-pages/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const {
      name,
      publicSlug,
      isEnabled,
      bookingTitle,
      slotDurationMinutes,
      workingHours,
      maxAdvanceDays,
      minAdvanceHours,
      bufferMinutes,
      maxBookingsPerDay,
      serviceTypes,
      syncToGoogleCalendar,
      googleCalendarId,
    } = await req.json();

    const update: Record<string, unknown> = {};
    if (name                !== undefined) update.name                = name.trim();
    if (isEnabled           !== undefined) update.isEnabled           = isEnabled;
    if (bookingTitle        !== undefined) update.bookingTitle        = bookingTitle ?? null;
    if (slotDurationMinutes !== undefined) update.slotDurationMinutes = slotDurationMinutes;
    if (workingHours        !== undefined) update.workingHours        = workingHours;
    if (maxAdvanceDays      !== undefined) update.maxAdvanceDays      = maxAdvanceDays;
    if (minAdvanceHours     !== undefined) update.minAdvanceHours     = minAdvanceHours;
    if (bufferMinutes       !== undefined) update.bufferMinutes       = bufferMinutes;
    if (maxBookingsPerDay   !== undefined) update.maxBookingsPerDay   = maxBookingsPerDay;
    if (serviceTypes        !== undefined) update.serviceTypes        = serviceTypes;
    if (syncToGoogleCalendar !== undefined) update.syncToGoogleCalendar = syncToGoogleCalendar;
    if (googleCalendarId    !== undefined) update.googleCalendarId    = googleCalendarId ?? null;

    // Slug uniqueness — scoped per user
    if (publicSlug !== undefined) {
      const slugClean = String(publicSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const conflict = await (BookingPage as any).findOne({ userId: user._id, publicSlug: slugClean, _id: { $ne: id } });
      if (conflict) {
        return NextResponse.json({ error: 'Ya tenés una página con ese slug' }, { status: 409 });
      }
      update.publicSlug = slugClean;
    }

    const page = await (BookingPage as any).findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: update },
      { new: true }
    );
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e: any) {
    if (e.code === 11000) {
      return NextResponse.json({ error: 'Ya existe una página con ese slug' }, { status: 409 });
    }
    console.error('[PUT /api/booking-pages/:id]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** DELETE /api/booking-pages/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await (BookingPage as any).findOneAndDelete({ _id: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
