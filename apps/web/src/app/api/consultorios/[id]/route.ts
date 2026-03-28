import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Consultorio, ConsultorioBooking } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const {
      name,
      description,
      color,
      // booking config fields
      bookingEnabled,
      publicSlug,
      bookingTitle,
      slotDurationMinutes,
      workingHours,
      serviceTypes,
      // scheduling window
      maxAdvanceDays,
      minAdvanceHours,
      // appointment settings
      bufferMinutes,
      maxBookingsPerDay,
    } = await req.json();

    // Build the update object with only defined fields
    const update: Record<string, unknown> = {};
    if (name              !== undefined) update.name              = name;
    if (description       !== undefined) update.description       = description;
    if (color             !== undefined) update.color             = color;
    if (bookingEnabled      !== undefined) update.bookingEnabled      = bookingEnabled;
    if (bookingTitle        !== undefined) update.bookingTitle        = bookingTitle;
    if (slotDurationMinutes !== undefined) update.slotDurationMinutes = slotDurationMinutes;
    if (workingHours        !== undefined) update.workingHours        = workingHours;
    if (serviceTypes        !== undefined) update.serviceTypes        = serviceTypes;
    if (maxAdvanceDays      !== undefined) update.maxAdvanceDays      = maxAdvanceDays;
    if (minAdvanceHours     !== undefined) update.minAdvanceHours     = minAdvanceHours;
    if (bufferMinutes       !== undefined) update.bufferMinutes       = bufferMinutes;
    if (maxBookingsPerDay   !== undefined) update.maxBookingsPerDay   = maxBookingsPerDay;

    // Slug: validate uniqueness across this user's consultorios (excluding this one)
    if (publicSlug !== undefined) {
      const slugTrimmed = String(publicSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (slugTrimmed) {
        const conflict = await (Consultorio as any).findOne({
          userId:     user._id,
          publicSlug: slugTrimmed,
          _id:        { $ne: id },
        });
        if (conflict) {
          return NextResponse.json({ error: 'Ya existe otro consultorio con ese slug' }, { status: 409 });
        }
        update.publicSlug = slugTrimmed;
      }
    }

    const consultorio = await (Consultorio as any).findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: update },
      { new: true }
    );
    if (!consultorio) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ consultorio });
  } catch (e) {
    console.error('[PUT /consultorios/:id]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await Consultorio.findOneAndDelete({ _id: id, userId: user._id });
    await (ConsultorioBooking as any).deleteMany({ consultorioId: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
