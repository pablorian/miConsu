import { NextRequest, NextResponse } from 'next/server';
import { BookingPage } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;
    const page = await (BookingPage as any).findOne({ _id: id, userId: user._id }).lean();
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

    const {
      name, publicSlug, isEnabled, bookingTitle, slotDurationMinutes, workingHours,
      maxAdvanceDays, minAdvanceHours, bufferMinutes, maxBookingsPerDay,
      serviceTypes, syncToGoogleCalendar, googleCalendarId,
    } = await req.json();

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name.trim();
    if (isEnabled !== undefined) update.isEnabled = isEnabled;
    if (bookingTitle !== undefined) update.bookingTitle = bookingTitle ?? null;
    if (slotDurationMinutes !== undefined) update.slotDurationMinutes = slotDurationMinutes;
    if (workingHours !== undefined) update.workingHours = workingHours;
    if (maxAdvanceDays !== undefined) update.maxAdvanceDays = maxAdvanceDays;
    if (minAdvanceHours !== undefined) update.minAdvanceHours = minAdvanceHours;
    if (bufferMinutes !== undefined) update.bufferMinutes = bufferMinutes;
    if (maxBookingsPerDay !== undefined) update.maxBookingsPerDay = maxBookingsPerDay;
    if (serviceTypes !== undefined) update.serviceTypes = serviceTypes;
    if (syncToGoogleCalendar !== undefined) update.syncToGoogleCalendar = syncToGoogleCalendar;
    if (googleCalendarId !== undefined) update.googleCalendarId = googleCalendarId ?? null;

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;
    await (BookingPage as any).findOneAndDelete({ _id: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
