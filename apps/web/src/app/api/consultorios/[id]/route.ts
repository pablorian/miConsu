import { NextRequest, NextResponse } from 'next/server';
import { Consultorio, ConsultorioBooking } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

    const {
      name, description, color,
      bookingEnabled, publicSlug, bookingTitle, slotDurationMinutes, workingHours, serviceTypes,
      maxAdvanceDays, minAdvanceHours,
      bufferMinutes, maxBookingsPerDay,
    } = await req.json();

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (color !== undefined) update.color = color;
    if (bookingEnabled !== undefined) update.bookingEnabled = bookingEnabled;
    if (bookingTitle !== undefined) update.bookingTitle = bookingTitle;
    if (slotDurationMinutes !== undefined) update.slotDurationMinutes = slotDurationMinutes;
    if (workingHours !== undefined) update.workingHours = workingHours;
    if (serviceTypes !== undefined) update.serviceTypes = serviceTypes;
    if (maxAdvanceDays !== undefined) update.maxAdvanceDays = maxAdvanceDays;
    if (minAdvanceHours !== undefined) update.minAdvanceHours = minAdvanceHours;
    if (bufferMinutes !== undefined) update.bufferMinutes = bufferMinutes;
    if (maxBookingsPerDay !== undefined) update.maxBookingsPerDay = maxBookingsPerDay;

    if (publicSlug !== undefined) {
      const slugTrimmed = String(publicSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (slugTrimmed) {
        const conflict = await (Consultorio as any).findOne({
          userId: user._id,
          publicSlug: slugTrimmed,
          _id: { $ne: id },
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
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;
    await Consultorio.findOneAndDelete({ _id: id, userId: user._id });
    await (ConsultorioBooking as any).deleteMany({ consultorioId: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
